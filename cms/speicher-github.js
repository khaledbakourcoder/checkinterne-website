// Speicher über die GitHub-API: Änderungen werden als Commits auf den Entwurfs-Branch geschrieben,
// „Veröffentlichen“ führt den Entwurf mit dem Live-Branch zusammen. Läuft in Cloudflare Workers und Node.
import { CmsFehler, base64ZuBytes, bytesZuBase64, bytesZuText } from './hilfen.js';
import { INHALT_PFAD, BILD_ORDNER, BILDNAME } from './pruefung.js';

export function githubSpeicher({ token, repo, entwurf = 'entwurf', live = 'main' }) {
  if (!token || !/^[\w.-]+\/[\w.-]+$/.test(repo ?? '')) throw new CmsFehler(503, 'Dashboard ist noch nicht eingerichtet (CMS_GITHUB_TOKEN oder CMS_GITHUB_REPO fehlt).');

  // Cloudflare (Gratis-Plan) erlaubt nur 50 Unteranfragen pro Aufruf – deshalb wird sparsam angefragt.
  async function api(pfad, { methode = 'GET', body, roh = false, erlaubt = [] } = {}) {
    const url = pfad === '/graphql' ? 'https://api.github.com/graphql' : `https://api.github.com/repos/${repo}${pfad}`;
    const antwort = await fetch(url, {
      method: methode,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: roh ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'checkinterne-cms',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!antwort.ok && !erlaubt.includes(antwort.status)) {
      const text = await antwort.text();
      console.error(`GitHub ${methode} ${pfad}: ${antwort.status} ${text.slice(0, 300)}`);
      if (antwort.status === 409) throw new CmsFehler(409, 'Konflikt beim Zusammenführen. Bitte den Entwickler informieren.');
      throw new CmsFehler(502, 'GitHub ist gerade nicht erreichbar. Bitte in ein paar Minuten noch einmal versuchen.');
    }
    if (antwort.status === 204 || erlaubt.includes(antwort.status)) return { status: antwort.status, daten: null };
    return { status: antwort.status, daten: roh ? new Uint8Array(await antwort.arrayBuffer()) : await antwort.json() };
  }

  const refSha = async (branch) => {
    const r = await api(`/git/ref/heads/${branch}`, { erlaubt: [404] });
    return r.status === 404 ? null : r.daten.object.sha;
  };

  // Entwurfs-Branch anlegen, falls es ihn nicht gibt, und neue Commits vom Live-Branch übernehmen.
  // Pro Anfrage nur einmal (frisch = true erzwingt eine neue Prüfung, z. B. nach einem Konflikt).
  let bereit;
  const entwurfBereit = (frisch = false) => {
    if (frisch || !bereit) bereit = entwurfPruefen();
    return bereit;
  };
  async function entwurfPruefen() {
    const liveSha = await refSha(live);
    if (!liveSha) throw new CmsFehler(500, `Branch ${live} fehlt im Repository.`);
    let sha = await refSha(entwurf);
    if (!sha) {
      await api('/git/refs', { methode: 'POST', body: { ref: `refs/heads/${entwurf}`, sha: liveSha } });
      return liveSha;
    }
    const merge = await api('/merges', { methode: 'POST', body: { base: entwurf, head: live, commit_message: `Stand von ${live} übernommen` }, erlaubt: [204] });
    if (merge.status === 201) sha = merge.daten.sha;
    return sha;
  }

  async function baum(sha) {
    const r = await api(`/git/trees/${sha}?recursive=1`);
    if (r.daten.truncated) throw new CmsFehler(500, 'Repository zu groß für das Dashboard.');
    return r.daten.tree;
  }

  return {
    async liesAlles() {
      const kopf = await entwurfBereit();
      const eintraege = await baum(kopf);
      const json = eintraege.filter((e) => e.type === 'blob' && INHALT_PFAD.test(e.path));
      // Alle Inhaltsdateien in EINER GraphQL-Anfrage lesen (Pfade sind durch INHALT_PFAD geprüft)
      const [besitzer, name] = repo.split('/');
      const felder = json.map((e, i) => `f${i}: object(expression: ${JSON.stringify(`${kopf}:${e.path}`)}) { ... on Blob { text } }`).join('\n');
      const gql = await api('/graphql', { methode: 'POST', body: { query: `query { repository(owner: ${JSON.stringify(besitzer)}, name: ${JSON.stringify(name)}) {\n${felder}\n} }` } });
      if (gql.daten.errors?.length) {
        console.error('GraphQL:', JSON.stringify(gql.daten.errors).slice(0, 300));
        throw new CmsFehler(502, 'Inhalte konnten nicht von GitHub gelesen werden.');
      }
      const texte = json.map((e, i) => [e.path, gql.daten.data.repository[`f${i}`]?.text ?? '']);
      const bilder = eintraege
        .filter((e) => e.type === 'blob' && e.path.startsWith(BILD_ORDNER) && BILDNAME.test(e.path.slice(BILD_ORDNER.length)))
        .map((e) => e.path.slice(BILD_ORDNER.length));
      return { dateien: Object.fromEntries(texte), bilder };
    },

    async liesBild(datei) {
      const r = await api(`/contents/${BILD_ORDNER}${datei}?ref=${entwurf}`, { roh: true, erlaubt: [404] });
      if (r.status === 404) throw new CmsFehler(404, 'Foto nicht gefunden.');
      return r.daten;
    },

    async schreibe({ nachricht, autor, aenderungen }) {
      // Fotos einmal als Blob hochladen (auch bei einem zweiten Versuch wiederverwendbar),
      // Textdateien direkt in den Tree schreiben – spart Anfragen
      const fotoShas = new Map();
      for (const a of aenderungen) {
        if (a.bytes !== null && a.pfad.startsWith(BILD_ORDNER)) {
          const blob = await api('/git/blobs', { methode: 'POST', body: { content: bytesZuBase64(a.bytes), encoding: 'base64' } });
          fotoShas.set(a.pfad, blob.daten.sha);
        }
      }
      const baumEintraege = aenderungen.map((a) => {
        if (a.bytes === null) return { path: a.pfad, mode: '100644', type: 'blob', sha: null };
        if (fotoShas.has(a.pfad)) return { path: a.pfad, mode: '100644', type: 'blob', sha: fotoShas.get(a.pfad) };
        return { path: a.pfad, mode: '100644', type: 'blob', content: bytesZuText(a.bytes) };
      });
      for (let versuch = 0; versuch < 2; versuch++) {
        const kopf = await entwurfBereit(versuch > 0);
        const commit = await api(`/git/commits/${kopf}`);
        const neuerBaum = await api('/git/trees', { methode: 'POST', body: { base_tree: commit.daten.tree.sha, tree: baumEintraege } });
        const person = { name: autor.email.split('@')[0], email: autor.email, date: new Date().toISOString() };
        const neu = await api('/git/commits', {
          methode: 'POST',
          body: { message: `${nachricht}\n\nÜber das Dashboard gespeichert von ${autor.email}`, tree: neuerBaum.daten.sha, parents: [kopf], author: person },
        });
        // Nur vorspulen (kein force): hat sich der Entwurf inzwischen geändert, noch einmal von vorn
        const r = await api(`/git/refs/heads/${entwurf}`, { methode: 'PATCH', body: { sha: neu.daten.sha, force: false }, erlaubt: [422] });
        if (r.status !== 422) return { commit: neu.daten.sha };
      }
      throw new CmsFehler(409, 'Jemand anderes hat gleichzeitig gespeichert. Bitte die Seite neu laden und noch einmal speichern.');
    },

    async status() {
      await entwurfBereit();
      const r = await api(`/compare/${live}...${entwurf}`);
      // Nur eigene Änderungen zählen, nicht die automatischen Zusammenführungen
      const eigene = (r.daten.commits ?? []).filter((c) => (c.parents?.length ?? 1) === 1).length;
      return { modus: 'github', entwurfBranch: entwurf, unveroeffentlicht: eigene };
    },

    async veroeffentliche(autor) {
      const kopf = await entwurfBereit(); // enthält jetzt alles von live
      // Live-Branch auf den Entwurf vorspulen: kein zusätzlicher Merge-Commit, beide Branches danach gleich
      const r = await api(`/git/refs/heads/${live}`, { methode: 'PATCH', body: { sha: kopf, force: false }, erlaubt: [422] });
      if (r.status === 422) {
        await api('/merges', { methode: 'POST', body: { base: live, head: entwurf, commit_message: `Veröffentlicht von ${autor.email}` }, erlaubt: [204] });
      }
    },

    async verlauf() {
      const r = await api(`/commits?sha=${entwurf}&per_page=30`);
      return r.daten.filter((c) => (c.parents?.length ?? 1) === 1).slice(0, 20).map((c) => ({
        sha: c.sha,
        nachricht: c.commit.message.split('\n')[0],
        datum: c.commit.author.date,
        autor: c.commit.author.email,
      }));
    },

    async commitDetails(sha) {
      const c = await api(`/commits/${sha}`);
      const eltern = c.daten.parents[0]?.sha;
      if (!eltern) throw new CmsFehler(400, 'Diese Version kann nicht zurückgenommen werden.');
      const relevant = (p) => INHALT_PFAD.test(p) || p.startsWith(BILD_ORDNER);
      const altStand = async (p) => (await api(`/contents/${p}?ref=${eltern}`, { roh: true })).daten;
      const listen = await Promise.all(c.daten.files.map(async (f) => {
        if (f.status === 'added') return relevant(f.filename) ? [{ pfad: f.filename, vorher: null }] : [];
        if (f.status === 'renamed') {
          // umbenannt: neue Datei entfernen, alte wiederherstellen
          return [
            ...(relevant(f.filename) ? [{ pfad: f.filename, vorher: null }] : []),
            ...(relevant(f.previous_filename) ? [{ pfad: f.previous_filename, vorher: await altStand(f.previous_filename) }] : []),
          ];
        }
        return relevant(f.filename) ? [{ pfad: f.filename, vorher: await altStand(f.filename) }] : [];
      }));
      return { nachricht: c.daten.commit.message.split('\n')[0], dateien: listen.flat() };
    },
  };
}
