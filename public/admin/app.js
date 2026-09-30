// Dashboard für die Website – Navigation, Bildschirme, Speichern.
// Der Kunde bearbeitet nur Vorhandenes: Texte und Fotos der bestehenden Seiten, Baustellen und Leistungen.
// Neue Seiten legt der Entwickler an; Bewertungen kommen später automatisch (API).
import { h, leeren, melde, zuSlug, kopie, gleich } from './dom.js';
import { definitionen, seitenPfade } from './definitionen.js';
import { feld, fehlendePflichtfelder, nachInternational } from './formular.js';
import { pruefe, googleVorschau, ampelListe, effektiv } from './seo.js';
import { fotoVorbereiten, blobZuBase64, freierName } from './fotos.js';
import { symbol } from './symbole.js';

const app = document.getElementById('app');
const statusLeiste = document.getElementById('status');

const z = {
  meta: null,            // { modus, unveroeffentlicht, vorschauUrl, nutzer }
  inhalt: {},            // pfad -> Daten
  bilder: new Set(),     // Fotos im Repository
  neueFotos: new Map(),  // datei -> { blob, url } – hochgeladen, aber noch nicht gespeichert
  ungespeichert: false,
  letzterHash: location.hash,
};

// ---------- Server ----------
async function api(pfad, { methode = 'GET', body } = {}) {
  const antwort = await fetch(pfad, {
    method: methode,
    headers: body ? { 'Content-Type': 'application/json', 'X-CMS': '1' } : { 'X-CMS': '1' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const daten = await antwort.json().catch(() => ({}));
  if (antwort.status === 401) throw new Error('Sie sind nicht mehr angemeldet. Bitte die Seite neu laden.');
  if (!antwort.ok) throw new Error(daten.fehler || `Fehler ${antwort.status}`);
  return daten;
}

async function laden() {
  const d = await api('/api/inhalt');
  z.meta = { modus: d.modus, unveroeffentlicht: d.unveroeffentlicht, vorschauUrl: d.vorschauUrl, nutzer: d.nutzer };
  z.inhalt = d.inhalt;
  z.bilder = new Set(d.bilder);
  document.getElementById('nutzer').textContent = d.nutzer;
  document.getElementById('nav-verlauf').hidden = d.modus === 'lokal';
  zeigeStatus();
}

// ---------- Hilfen für die Inhalte ----------
const P = {
  leistung: (id) => `inhalt/leistungen/${id}.json`,
  projekt: (id) => `inhalt/projekte/${id}.json`,
  einstellungen: 'inhalt/einstellungen.json',
};
const eintraege = (ordner) => Object.entries(z.inhalt)
  .filter(([p]) => p.startsWith(`inhalt/${ordner}/`))
  .map(([p, d]) => ({ id: p.split('/').pop().slice(0, -5), ...d }))
  .sort((a, b) => (a.reihenfolge ?? 99) - (b.reihenfolge ?? 99));
const leistungen = () => eintraege('leistungen');
const projekte = () => eintraege('projekte');
const einstellungen = () => z.inhalt[P.einstellungen];
const seitenPfad = (art, id) => (art === 'leistung' ? `/${id}/` : `/projekte/${id}/`);

function basisCtx() {
  return {
    einstellungen: einstellungen(),
    leistungen: leistungen().map((l) => ({ id: l.id, name: l.name })),
    projekte: projekte(),
    fotoUrl: (datei) => z.neueFotos.get(datei)?.url ?? `/api/bild/${encodeURIComponent(datei)}`,
    fotoAuswaehlen,
  };
}

function fotoHochladerFuer(basisName) {
  return async (datei) => {
    const { blob } = await fotoVorbereiten(datei);
    const name = freierName(basisName(), new Set([...z.bilder, ...z.neueFotos.keys()]));
    z.neueFotos.set(name, { blob, url: URL.createObjectURL(blob) });
    return name;
  };
}

function fotoAuswaehlen() {
  return new Promise((fertig) => {
    const alle = [...z.neueFotos.keys(), ...[...z.bilder].sort()];
    const dialog = h('dialog', { 'aria-label': 'Foto auswählen' },
      h('div', { class: 'dialog-kopf' }, h('strong', { text: 'Vorhandenes Foto wählen' }),
        h('button', { type: 'button', class: 'mini', onclick: () => dialog.close() }, symbol('schliessen'), 'Schließen')),
      h('div', { class: 'galerie' }, alle.map((d) => h('button', { type: 'button', title: d, onclick: () => { dialog.returnValue = d; dialog.close(); } },
        h('img', { src: basisCtx().fotoUrl(d), alt: d, loading: 'lazy' })))),
    );
    dialog.addEventListener('close', () => { dialog.remove(); fertig(dialog.returnValue || null); });
    document.body.append(dialog);
    dialog.returnValue = '';
    dialog.showModal();
  });
}

// Alle Fotonamen in beliebigen Daten finden (welche neuen Fotos müssen mitgespeichert werden?)
function genutzteFotos(daten, menge = new Set()) {
  if (typeof daten === 'string') { if (z.neueFotos.has(daten)) menge.add(daten); }
  else if (Array.isArray(daten)) daten.forEach((x) => genutzteFotos(x, menge));
  else if (daten && typeof daten === 'object') Object.values(daten).forEach((x) => genutzteFotos(x, menge));
  return menge;
}

// Fehlende Bildbeschreibungen automatisch bilden – der Kunde muss sie nicht ausfüllen
function beschreibungenErgaenzen(bilder, titel) {
  (bilder ?? []).forEach((b, i) => {
    if (b.alt?.trim()) return;
    b.alt = b.beschriftung?.trim() ? `${titel} – ${b.beschriftung.trim()}` : `${titel}, Foto ${i + 1}`;
  });
}

// Vor dem Speichern automatisch ergänzen, was der Kunde nicht selbst ausfüllen muss
function automatischErgaenzen(name, d) {
  if (name === 'leistung') {
    if (!d.kurzname?.trim()) d.kurzname = (d.name ?? '').trim().split(/\s+/)[0] ?? '';
    beschreibungenErgaenzen(d.bilder, d.name);
  }
  if (name === 'projekt') beschreibungenErgaenzen(d.bilder, d.titel);
  if (name === 'startseite') beschreibungenErgaenzen(d.altbauBilder, 'Baustelle im Altbau');
  if (name === 'ueber-uns' && !d.bildAlt?.trim()) d.bildAlt = einstellungen().inhaber;
  if (name === 'einstellungen') d.telefon = nachInternational(d.telefonAnzeige, 'tel');
}

// Speichern heißt: sofort auf die Website. Einen extra Schritt „Veröffentlichen“ gibt es für den Kunden nicht.
async function speichern(pfad, inhalt, nachricht) {
  const namen = genutzteFotos(inhalt);
  if (namen.size > 20) throw new Error(`Bitte höchstens 20 neue Fotos auf einmal speichern (jetzt: ${namen.size}). Einige entfernen, speichern, dann die nächsten hinzufügen.`);
  const bilder = await Promise.all([...namen].map(async (datei) => ({ datei, base64: await blobZuBase64(z.neueFotos.get(datei).blob) })));
  await api('/api/speichern', { methode: 'POST', body: { nachricht, dateien: [{ pfad, inhalt }], bilder } });
  for (const n of namen) { URL.revokeObjectURL(z.neueFotos.get(n).url); z.neueFotos.delete(n); }
  z.ungespeichert = false;
  if (z.meta.modus !== 'lokal') {
    try { await api('/api/veroeffentlichen', { methode: 'POST', body: {} }); } catch { /* Statusleiste bietet dann „Erneut versuchen“ an */ }
  }
  await laden();
  melde(z.meta.modus === 'lokal' || !z.meta.unveroeffentlicht
    ? 'Gespeichert. In 1–2 Minuten ist es auf der Website zu sehen.'
    : 'Gespeichert, aber noch nicht auf der Website. Bitte oben auf „Erneut versuchen“ klicken.');
}

// ---------- Statuszeile ----------
function zeigeStatus() {
  leeren(statusLeiste);
  statusLeiste.hidden = false;
  if (z.meta.modus === 'lokal') {
    statusLeiste.append(h('span', {}, h('b', { text: 'Lokaler Modus: ' }), 'Änderungen landen direkt in den Dateien.'),
      h('a', { class: 'knopf klein', href: z.meta.vorschauUrl, target: '_blank', rel: 'noopener' }, 'Website ansehen'));
    return;
  }
  // Normalerweise unsichtbar: nur wenn das automatische Veröffentlichen einmal nicht geklappt hat
  if (!z.meta.unveroeffentlicht) { statusLeiste.hidden = true; return; }
  statusLeiste.append(
    h('span', { text: 'Eine Änderung ist gespeichert, aber noch nicht auf der Website.' }),
    h('button', { type: 'button', class: 'knopf klein voll', onclick: veroeffentlichen }, 'Erneut versuchen'),
  );
}

async function veroeffentlichen() {
  try {
    await api('/api/veroeffentlichen', { methode: 'POST', body: {} });
    await laden();
    melde('Erledigt. In 1–2 Minuten ist alles auf der Website.');
  } catch (e) { melde(e.message, { fehler: true }); }
}

// ---------- Bildschirme ----------
function kopf(titel, { zurueck, untertitel, knopf } = {}) {
  return [
    zurueck && h('a', { class: 'zurueck', href: zurueck }, symbol('zurueck'), 'Zurück'),
    h('div', { class: 'kopfzeile' },
      h('div', {}, h('h1', { text: titel }), untertitel && h('p', { class: 'untertitel', text: untertitel })),
      knopf),
  ];
}

function start() {
  const aufgabe = (href, sym, titel, text) => h('a', { class: 'aufgabe', href }, h('span', { class: 'aufgabe-symbol' }, symbol(sym)), titel, h('small', { text }));
  return [
    ...kopf('Was möchten Sie ändern?', { untertitel: 'Wählen Sie einen Bereich. Alle Bereiche finden Sie auch links.' }),
    h('div', { class: 'aufgaben' },
      aufgabe('#/projekte', 'baustelle', 'Baustellen', 'Texte und Fotos Ihrer Baustellen'),
      aufgabe('#/leistungen', 'werkzeug', 'Leistungen', 'Texte und Fotos Ihrer Leistungsseiten'),
      aufgabe('#/seite/einstellungen', 'telefon', 'Kontaktdaten', 'Telefon, WhatsApp, E-Mail, Adresse'),
    ),
  ];
}

function liste(art) {
  const istLeistung = art === 'leistung';
  const daten = istLeistung ? leistungen() : projekte();
  return [
    ...kopf(istLeistung ? 'Leistungen' : 'Baustellen', { untertitel: 'Zum Bearbeiten anklicken.' }),
    h('ul', { class: 'liste' }, daten.map((d) => h('li', {}, h('a', { href: `#/${art}/${d.id}` },
      h('span', {}, istLeistung ? d.name : d.titel, h('small', { text: istLeistung ? d.kurz : [d.ort, `${d.bilder.length} Fotos`].filter(Boolean).join(' · ') })),
      h('span', { class: `marke-status ${d.entwurf ? 'entwurf' : 'online'}`, text: d.entwurf ? 'Noch nicht sichtbar' : 'Sichtbar' }),
    )))),
  ];
}

// Gemeinsamer Aufbau: Formular links, rechts Speichern (+ Sichtbar-Schalter) und Google-Vorschau
function editorLayout({ titel, zurueck, ansehen, hinweis, formular, aktionen, seoBox }) {
  return [
    ...kopf(titel, { zurueck, knopf: ansehen && h('a', { class: 'knopf', href: ansehen, target: '_blank', rel: 'noopener' }, symbol('extern'), 'Auf der Website ansehen') }),
    hinweis && h('p', { class: 'hinweisbox', text: hinweis }),
    h('div', { class: 'editor' },
      formular,
      h('aside', { class: 'editor-seite' }, h('div', { class: 'karte aktionen' }, h('h2', { text: 'Fertig?' }), aktionen), seoBox)),
  ];
}

function speicherKnopf(beiKlick) {
  const knopf = h('button', {
    type: 'button', class: 'knopf voll',
    onclick: async () => {
      knopf.disabled = true; knopf.textContent = 'Speichert …';
      try { await beiKlick(); } catch (e) { melde(e.message, { fehler: true }); } finally { knopf.disabled = false; leeren(knopf).append(symbol('haken'), 'Speichern'); }
    },
  }, symbol('haken'), 'Speichern');
  return knopf;
}

// Editor für eine bestehende Leistung oder Baustelle
function eintragEditor(art, id) {
  const def = definitionen[art];
  const pfad = P[art](id);
  const original = z.inhalt[pfad];
  if (!id || !original) return [...kopf('Nicht gefunden', { zurueck: '#/' }), h('p', { text: 'Diese Seite gibt es nicht.' })];

  const arbeit = kopie(original);
  const formBox = h('div', { class: 'abschnitte' });
  const seoBox = h('div', { class: 'karte' });
  const sichtbarBox = h('div');

  const ctx = () => ({
    ...basisCtx(),
    slug: id,
    andereLeistungen: leistungen().filter((l) => l.id !== id),
  });

  function zeichneSeitenspalte() {
    const erg = pruefe(art, arbeit, ctx());
    leeren(seoBox).append(h('h2', { class: 'mit-symbol' }, symbol('lupe'), 'So erscheint die Seite bei Google'), googleVorschau(erg.effektiv, einstellungen().domain), ...ampelListe(erg));
    leeren(sichtbarBox).append(
      h('p', { class: 'sichtbar-titel' }, symbol('auge'), 'Sichtbarkeit'),
      h('label', { class: 'schalter' },
        h('input', {
          type: 'checkbox', checked: !arbeit.entwurf, disabled: arbeit.entwurf && erg.rot > 0,
          onchange: (e) => { arbeit.entwurf = !e.target.checked; geaendert(); },
        }),
        'Auf der Website zeigen'),
      h('span', { class: 'hilfe', text: arbeit.entwurf && erg.rot ? 'Geht erst, wenn unten nichts mehr fehlt.' : arbeit.entwurf ? 'Besucher sehen diese Seite noch nicht.' : 'Besucher und Google sehen diese Seite.' }),
    );
  }

  function geaendert() {
    z.ungespeichert = !gleich(arbeit, original) || z.neueFotos.size > 0;
    zeichneSeitenspalte();
  }

  const formCtx = {
    ...basisCtx(),
    fotoHochladen: fotoHochladerFuer(() => id),
    geaendert,
    neuZeichnen: zeichneFormular,
  };
  function zeichneFormular() {
    const y = window.scrollY;
    // Jeder Abschnitt ist eine eigene Karte; Technisches steht zugeklappt ganz unten
    leeren(formBox).append(...def.felder.map((f) => feld(f, arbeit, formCtx)));
    window.scrollTo(0, y);
    zeichneSeitenspalte();
  }
  zeichneFormular();

  const knopf = speicherKnopf(async () => {
    const fehler = fehlendePflichtfelder(def.felder, arbeit);
    const erg = pruefe(art, arbeit, ctx());
    if (!arbeit.entwurf) fehler.push(...erg.punkte.filter((x) => x.stufe === 'rot').map((x) => x.text));
    if (fehler.length) { melde(`Bitte noch ergänzen:\n• ${[...new Set(fehler)].join('\n• ')}`, { fehler: true }); return; }
    automatischErgaenzen(art, arbeit);
    await speichern(pfad, arbeit, `${def.titel} „${art === 'leistung' ? arbeit.name : arbeit.titel}“ geändert`);
    zeige();
  });

  return editorLayout({
    titel: art === 'leistung' ? original.name : original.titel,
    zurueck: art === 'leistung' ? '#/leistungen' : '#/projekte',
    ansehen: !original.entwurf && (z.meta.vorschauUrl || '') + seitenPfad(art, id),
    formular: formBox,
    aktionen: [h('div', { class: 'knoepfe' }, knopf), sichtbarBox],
    seoBox,
  });
}

// Editor für feste Bereiche (Startseite, Über uns, Einsatzgebiet, Kontaktdaten)
function seitenEditor(name) {
  const def = definitionen[name];
  const pfad = seitenPfade[name];
  if (!def || !pfad) return [...kopf('Nicht gefunden', { zurueck: '#/' })];
  const original = z.inhalt[pfad];
  const arbeit = kopie(original);
  const formBox = h('div', { class: 'abschnitte' });
  const seoBox = name === 'startseite' ? h('div', { class: 'karte' }) : null;

  const zeichneSeo = () => {
    if (!seoBox) return;
    leeren(seoBox).append(h('h2', { class: 'mit-symbol' }, symbol('lupe'), 'So erscheint die Startseite bei Google'), googleVorschau(effektiv('startseite', arbeit, basisCtx()), einstellungen().domain));
  };
  const ctx = {
    ...basisCtx(),
    fotoHochladen: fotoHochladerFuer(() => zuSlug(name)),
    geaendert: () => { z.ungespeichert = !gleich(arbeit, original) || z.neueFotos.size > 0; zeichneSeo(); },
    neuZeichnen: () => {
      const y = window.scrollY;
      leeren(formBox).append(...def.felder.map((f) => feld(f, arbeit, ctx)));
      window.scrollTo(0, y);
      zeichneSeo();
    },
  };
  ctx.neuZeichnen();

  const knopf = speicherKnopf(async () => {
    const fehler = fehlendePflichtfelder(def.felder, arbeit);
    if (fehler.length) { melde(`Bitte noch ergänzen:\n• ${fehler.join('\n• ')}`, { fehler: true }); return; }
    automatischErgaenzen(name, arbeit);
    await speichern(pfad, arbeit, `${def.titel} geändert`);
    zeige();
  });

  return editorLayout({ titel: def.titel, hinweis: def.hinweis, formular: formBox, aktionen: h('div', { class: 'knoepfe' }, knopf), seoBox });
}

async function verlauf() {
  const box = h('ul', { class: 'liste verlauf' }, h('li', {}, h('div', { class: 'zeile', text: 'Wird geladen …' })));
  api('/api/verlauf').then(({ eintraege: liste }) => {
    if (!liste.length) { leeren(box).append(h('li', {}, h('div', { class: 'zeile', text: 'Noch keine Änderungen.' }))); return; }
    leeren(box).append(...liste.map((e) => h('li', {}, h('div', { class: 'zeile' },
      h('span', {}, e.nachricht, h('small', { text: `${new Date(e.datum).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })} · ${e.autor}` })),
      h('button', {
        type: 'button', class: 'knopf klein',
        onclick: async () => {
          if (!confirm(`„${e.nachricht}“ rückgängig machen?`)) return;
          try {
            await api('/api/rueckgaengig', { methode: 'POST', body: { sha: e.sha } });
            if (z.meta.modus !== 'lokal') await api('/api/veroeffentlichen', { methode: 'POST', body: {} }).catch(() => {});
            await laden();
            melde('Rückgängig gemacht. In 1–2 Minuten ist es auf der Website zu sehen.');
            zeige();
          } catch (err) { melde(err.message, { fehler: true }); }
        },
      }, symbol('rueckgaengig'), 'Rückgängig'),
    ))));
  }).catch((e) => leeren(box).append(h('li', {}, h('div', { class: 'zeile', text: e.message }))));
  return [...kopf('Verlauf', { untertitel: 'Ihre letzten Änderungen. Etwas falsch gemacht? Einfach rückgängig machen.' }), box];
}

// ---------- Navigation ----------
function markiereNavigation(teile) {
  const [a = '', b = ''] = teile;
  const bereich = a.startsWith('leistung') ? 'leistung' : a.startsWith('projekt') ? 'projekt' : a === 'seite' ? `seite/${b}` : a;
  document.querySelectorAll('#navigation a').forEach((link) => {
    if (link.dataset.bereich === bereich) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

async function zeige() {
  const teile = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  let inhalt;
  if (!teile.length) inhalt = start();
  else if (teile[0] === 'leistungen') inhalt = liste('leistung');
  else if (teile[0] === 'projekte') inhalt = liste('projekt');
  else if (teile[0] === 'leistung' || teile[0] === 'projekt') inhalt = eintragEditor(teile[0], teile[1]);
  else if (teile[0] === 'seite') inhalt = seitenEditor(teile[1]);
  else if (teile[0] === 'verlauf') inhalt = await verlauf();
  else inhalt = [...kopf('Nicht gefunden', { zurueck: '#/' })];
  markiereNavigation(teile);
  leeren(app).append(...[inhalt].flat().filter(Boolean));
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}

window.addEventListener('hashchange', () => {
  if (z.ungespeichert && !confirm('Sie haben noch nicht gespeichert. Trotzdem verlassen?')) {
    history.replaceState(null, '', z.letzterHash);
    return;
  }
  z.ungespeichert = false;
  z.letzterHash = location.hash;
  zeige();
});
window.addEventListener('beforeunload', (e) => { if (z.ungespeichert) { e.preventDefault(); e.returnValue = ''; } });

// Symbole in der Seitenleiste (immer mit Text daneben)
document.querySelectorAll('#navigation a[data-symbol]').forEach((a) => a.prepend(symbol(a.dataset.symbol)));

// Handy/Tablet: Bereiche hinter dem Knopf „Menü“ – schließt nach Auswahl, bei Esc und bei Klick daneben
const leiste = document.querySelector('.seitenleiste');
const menueKnopf = document.getElementById('menue-knopf');
function menue(offen) {
  leiste.classList.toggle('offen', offen);
  menueKnopf.setAttribute('aria-expanded', String(offen));
  leeren(menueKnopf).append(symbol(offen ? 'schliessen' : 'menue'), offen ? 'Schließen' : 'Menü');
}
menue(false);
// stopPropagation: der Knopf tauscht beim Umschalten seinen Inhalt aus – sonst hielte „Klick daneben“ ihn für außerhalb
menueKnopf.addEventListener('click', (e) => { e.stopPropagation(); menue(!leiste.classList.contains('offen')); });
document.getElementById('navigation').addEventListener('click', (e) => { if (e.target.closest('a')) menue(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && leiste.classList.contains('offen')) { menue(false); menueKnopf.focus(); } });
document.addEventListener('click', (e) => { if (leiste.classList.contains('offen') && !leiste.contains(e.target)) menue(false); });

laden().then(zeige).catch((e) => {
  leeren(app).append(h('h1', { text: 'Das Dashboard konnte nicht geladen werden.' }), h('p', { text: e.message }));
});
