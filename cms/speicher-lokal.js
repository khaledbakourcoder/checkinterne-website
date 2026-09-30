// Speicher für die lokale Entwicklung: schreibt direkt in die Dateien des Projekts.
// `npm run dev` (Astro) zeigt Änderungen dann sofort an. Kein Git, kein Entwurf, kein Verlauf.
import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { CmsFehler } from './hilfen.js';
import { BILD_ORDNER, BILDNAME, INHALT_PFAD } from './pruefung.js';

export function lokalerSpeicher(wurzel) {
  const abs = (pfad) => {
    if (!INHALT_PFAD.test(pfad) && !(pfad.startsWith(BILD_ORDNER) && BILDNAME.test(pfad.slice(BILD_ORDNER.length)))) {
      throw new CmsFehler(400, `Pfad nicht erlaubt: ${pfad}`);
    }
    return join(wurzel, pfad);
  };

  return {
    async liesAlles() {
      const dateien = {};
      for (const ordner of ['inhalt', 'inhalt/leistungen', 'inhalt/projekte']) {
        for (const name of await readdir(join(wurzel, ordner))) {
          const pfad = `${ordner}/${name}`;
          if (INHALT_PFAD.test(pfad)) dateien[pfad] = await readFile(join(wurzel, pfad), 'utf8');
        }
      }
      const bilder = (await readdir(join(wurzel, BILD_ORDNER))).filter((n) => BILDNAME.test(n));
      return { dateien, bilder };
    },
    async liesBild(datei) {
      try { return new Uint8Array(await readFile(abs(BILD_ORDNER + datei))); } catch { throw new CmsFehler(404, 'Foto nicht gefunden.'); }
    },
    async schreibe({ aenderungen }) {
      for (const a of aenderungen) {
        const ziel = abs(a.pfad);
        if (a.bytes === null) await unlink(ziel);
        else { await mkdir(dirname(ziel), { recursive: true }); await writeFile(ziel, a.bytes); }
      }
      return { commit: null };
    },
    async status() { return { modus: 'lokal', entwurfBranch: null, unveroeffentlicht: 0 }; },
    async veroeffentliche() {},
    async verlauf() { return []; },
    async commitDetails() { throw new CmsFehler(400, 'Im lokalen Modus gibt es keinen Verlauf.'); },
  };
}
