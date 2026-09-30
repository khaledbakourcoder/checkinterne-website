// API des Dashboards – unabhängig davon, ob sie in Cloudflare (GitHub-Speicher) oder lokal (Dateisystem) läuft.
//
// Speicher-Schnittstelle:
//   liesAlles()                 -> { dateien: { [pfad]: text }, bilder: string[] }
//   liesBild(datei)             -> Uint8Array
//   schreibe({ nachricht, autor, aenderungen: [{ pfad, bytes | null }] }) -> { commit }
//   status()                    -> { modus, unveroeffentlicht }
//   veroeffentliche(autor)      -> void
//   verlauf()                   -> [{ sha, nachricht, datum, autor }]
//   commitDetails(sha)          -> { nachricht, dateien: [{ pfad, vorher: Uint8Array | null }] }
import { CmsFehler, base64ZuBytes, textZuBytes, bytesZuText } from './hilfen.js';
import { pruefeInhalt, INHALT_PFAD, BILDNAME, BILD_ORDNER, MAX_BILD_BYTES } from './pruefung.js';

// Grenze wegen der 50 Unteranfragen pro Aufruf bei Cloudflare (ein Foto = eine Anfrage an GitHub)
const MAX_BILDER_PRO_SPEICHERN = 20;

const json = (daten, status = 200) => ({ status, json: daten });

// Der Kunde darf nur vorhandene Inhalte ändern: keine neuen Seiten, nichts löschen.
// Bewertungen kommen später automatisch (API), Weiterleitungen pflegt nur der Entwickler.
const GESPERRT = new Set(['inhalt/bewertungen.json', 'inhalt/weiterleitungen.json']);
function pruefeErlaubt(pfad, inhalt, neuerInhalt) {
  if (GESPERRT.has(pfad)) throw new CmsFehler(403, 'Dieser Bereich kann im Dashboard nicht geändert werden.');
  if (!(pfad in inhalt)) throw new CmsFehler(403, 'Neue Seiten legt der Entwickler an.');
  if (neuerInhalt === null) throw new CmsFehler(403, 'Seiten können im Dashboard nicht gelöscht werden.');
}

function bildTyp(datei) {
  if (/\.png$/.test(datei)) return 'image/png';
  if (/\.webp$/.test(datei)) return 'image/webp';
  return 'image/jpeg';
}

// JPEG, PNG oder WebP an den ersten Bytes erkennen – Dateiendung allein reicht nicht
function istBild(bytes) {
  const b = bytes;
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const webp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  return jpeg || png || webp;
}

async function lade(speicher) {
  const { dateien, bilder } = await speicher.liesAlles();
  const inhalt = {};
  for (const [pfad, text] of Object.entries(dateien)) {
    if (!INHALT_PFAD.test(pfad)) continue;
    try { inhalt[pfad] = JSON.parse(text); } catch { throw new CmsFehler(500, `Datei ist beschädigt: ${pfad}`); }
  }
  return { inhalt, bilder };
}

function pruefeAlles(inhalt, bilder) {
  const bekannt = {
    bilder: new Set(bilder),
    leistungen: new Set(Object.keys(inhalt).filter((p) => p.startsWith('inhalt/leistungen/')).map((p) => p.split('/').pop().slice(0, -5))),
  };
  for (const [pfad, daten] of Object.entries(inhalt)) pruefeInhalt(pfad, daten, bekannt);
}

async function speichern(speicher, body, nutzer) {
  const aenderungen = Array.isArray(body?.dateien) ? body.dateien : [];
  const neueBilder = Array.isArray(body?.bilder) ? body.bilder : [];
  const nachricht = String(body?.nachricht ?? '').trim().slice(0, 200) || 'Inhalt geändert';
  if (!aenderungen.length && !neueBilder.length) throw new CmsFehler(400, 'Keine Änderungen übergeben.');
  if (neueBilder.length > MAX_BILDER_PRO_SPEICHERN) throw new CmsFehler(400, `Höchstens ${MAX_BILDER_PRO_SPEICHERN} Fotos auf einmal.`);

  const { inhalt, bilder } = await lade(speicher);
  const bildSet = new Set(bilder);
  const commit = [];

  for (const b of neueBilder) {
    const datei = String(b?.datei ?? '');
    if (!BILDNAME.test(datei)) throw new CmsFehler(400, `Ungültiger Bildname: ${datei}`);
    if (bildSet.has(datei)) throw new CmsFehler(409, `Ein Foto mit dem Namen ${datei} gibt es schon.`);
    const bytes = base64ZuBytes(String(b?.base64 ?? ''));
    if (bytes.length > MAX_BILD_BYTES) throw new CmsFehler(413, `Foto ${datei} ist zu groß.`);
    if (!istBild(bytes)) throw new CmsFehler(400, `${datei} ist kein Foto (JPEG, PNG oder WebP).`);
    bildSet.add(datei);
    commit.push({ pfad: BILD_ORDNER + datei, bytes });
  }

  for (const a of aenderungen) {
    const pfad = String(a?.pfad ?? '');
    if (!INHALT_PFAD.test(pfad)) throw new CmsFehler(400, `Pfad nicht erlaubt: ${pfad}`);
    pruefeErlaubt(pfad, inhalt, a.inhalt ?? null);
    inhalt[pfad] = a.inhalt;
    commit.push({ pfad, bytes: textZuBytes(JSON.stringify(a.inhalt, null, 2) + '\n') });
  }

  // Den Zustand NACH der Änderung komplett prüfen (auch Verweise zwischen den Dateien)
  pruefeAlles(inhalt, [...bildSet]);
  const ergebnis = await speicher.schreibe({ nachricht, autor: nutzer, aenderungen: commit });
  return json({ ok: true, ...ergebnis });
}

// Eine frühere Änderung zurücknehmen: betroffene Dateien auf den Stand davor setzen – mit voller Prüfung.
async function rueckgaengig(speicher, sha, nutzer) {
  const details = await speicher.commitDetails(sha);
  const { inhalt, bilder } = await lade(speicher);
  const commit = [];
  for (const { pfad, vorher } of details.dateien) {
    if (pfad.startsWith(BILD_ORDNER)) continue; // Fotos bleiben liegen, sie stören nicht
    if (!INHALT_PFAD.test(pfad)) continue;
    // Auch beim Zurücknehmen: nur vorhandene Seiten ändern, nichts anlegen oder löschen
    if (vorher === null || !(pfad in inhalt) || GESPERRT.has(pfad)) {
      throw new CmsFehler(409, 'Diese Änderung kann nur der Entwickler zurücknehmen.');
    }
    try { inhalt[pfad] = JSON.parse(bytesZuText(vorher)); } catch { throw new CmsFehler(500, `Alte Version von ${pfad} ist beschädigt.`); }
    commit.push({ pfad, bytes: vorher });
  }
  if (!commit.length) throw new CmsFehler(400, 'Diese Änderung betrifft keine Inhalte.');
  try {
    pruefeAlles(inhalt, bilder);
  } catch (e) {
    if (e instanceof CmsFehler) throw new CmsFehler(409, `Das lässt sich nicht einzeln zurücknehmen, weil spätere Änderungen darauf aufbauen.\n${e.message}`);
    throw e;
  }
  return speicher.schreibe({ nachricht: `Rückgängig: ${details.nachricht}`.slice(0, 200), autor: nutzer, aenderungen: commit });
}

export async function bearbeite({ methode, pfad, body }, { speicher, nutzer, vorschauUrl }) {
  try {
    if (methode === 'GET' && pfad === '/api/inhalt') {
      const [{ inhalt, bilder }, status] = await Promise.all([lade(speicher), speicher.status()]);
      return json({ ...status, nutzer: nutzer.email, vorschauUrl, inhalt, bilder: bilder.sort() });
    }
    if (methode === 'GET' && pfad.startsWith('/api/bild/')) {
      const datei = decodeURIComponent(pfad.slice('/api/bild/'.length));
      if (!BILDNAME.test(datei)) throw new CmsFehler(400, 'Ungültiger Bildname.');
      return { status: 200, bytes: await speicher.liesBild(datei), typ: bildTyp(datei) };
    }
    if (methode === 'POST' && pfad === '/api/speichern') return await speichern(speicher, body, nutzer);
    if (methode === 'POST' && pfad === '/api/veroeffentlichen') {
      await speicher.veroeffentliche(nutzer);
      return json({ ok: true });
    }
    if (methode === 'GET' && pfad === '/api/verlauf') return json({ eintraege: await speicher.verlauf() });
    if (methode === 'POST' && pfad === '/api/rueckgaengig') {
      const sha = String(body?.sha ?? '');
      if (!/^[0-9a-f]{40}$/.test(sha)) throw new CmsFehler(400, 'Ungültige Version.');
      return json({ ok: true, ...(await rueckgaengig(speicher, sha, nutzer)) });
    }
    return json({ fehler: 'Unbekannte Anfrage.' }, 404);
  } catch (e) {
    if (e instanceof CmsFehler) return json({ fehler: e.message }, e.status);
    console.error(e);
    return json({ fehler: 'Interner Fehler. Bitte später noch einmal versuchen.' }, 500);
  }
}
