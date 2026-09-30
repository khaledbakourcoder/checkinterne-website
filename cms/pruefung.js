// Serverseitige Prüfung, bevor etwas gespeichert wird.
// Der Astro-Build prüft noch einmal streng (src/lib/inhalt.ts). Diese Prüfung fängt die typischen
// Fehler vorher ab, damit der Kunde eine verständliche Meldung bekommt statt eines stillen Build-Fehlers.
import { CmsFehler } from './hilfen.js';

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BILDNAME = /^[a-z0-9][a-z0-9-]*\.(?:jpe?g|png|webp)$/;
export const INHALT_PFAD = /^inhalt\/(?:(?:einstellungen|startseite|ueber-uns|orte|bewertungen|weiterleitungen)\.json|(?:leistungen|projekte)\/[a-z0-9]+(?:-[a-z0-9]+)*\.json)$/;
export const BILD_ORDNER = 'src/assets/bilder/';
export const MAX_BILD_BYTES = 6 * 1024 * 1024;

const istText = (v) => typeof v === 'string';
const istVoll = (v) => istText(v) && v.trim().length > 0;
const istZahl = (v) => typeof v === 'number' && Number.isFinite(v);
const istBool = (v) => typeof v === 'boolean';
const istListe = (v) => Array.isArray(v);

function pruefer(pfad) {
  const fehler = [];
  const muss = (bedingung, feld, meldung) => { if (!bedingung) fehler.push(`${feld}: ${meldung}`); };
  return { fehler, muss, pfad };
}

function bilderListe(p, feld, liste, bekannt, { mitBeschriftung = true, mind = 0 } = {}) {
  p.muss(istListe(liste), feld, 'muss eine Liste sein');
  if (!istListe(liste)) return;
  p.muss(liste.length >= mind, feld, `mindestens ${mind} Foto(s) nötig`);
  liste.forEach((b, i) => {
    p.muss(b && BILDNAME.test(b.datei ?? '') && bekannt.bilder.has(b.datei), `${feld} ${i + 1}`, 'Foto fehlt');
    p.muss(istVoll(b?.alt), `${feld} ${i + 1}`, 'Bildbeschreibung fehlt');
    if (mitBeschriftung) p.muss(b?.beschriftung === undefined || istText(b.beschriftung), `${feld} ${i + 1}`, 'Beschriftung ungültig');
  });
}

const regeln = {
  einstellungen(p, d) {
    for (const k of ['firma', 'markeKurz', 'inhaber', 'ort']) p.muss(istVoll(d[k]), k, 'darf nicht leer sein');
    for (const k of ['markeZusatz', 'telefon', 'telefonAnzeige', 'whatsapp', 'email', 'strasse', 'plz', 'gewerke', 'einsatzgebiet', 'myhammerUrl', 'formularZiel', 'impressumUrl', 'datenschutzUrl'])
      p.muss(istText(d[k]), k, 'muss Text sein');
    p.muss(/^https:\/\/[^\s/]+\.[^\s/]+\/?$/.test(d.domain ?? ''), 'domain', 'muss wie https://www.beispiel.de aussehen');
    p.muss(/^\+?[0-9]*$/.test(d.telefon ?? ''), 'telefon', 'nur Ziffern, optional mit + am Anfang');
    p.muss(/^[0-9]*$/.test(d.whatsapp ?? ''), 'whatsapp', 'nur Ziffern (mit Ländervorwahl, ohne +)');
  },
  startseite(p, d, bekannt) {
    for (const k of ['seoTitel', 'seoBeschreibung', 'ueberschrift', 'baustellenUeberschrift', 'leistungenUeberschrift', 'kontaktUeberschrift'])
      p.muss(istVoll(d[k]), k, 'darf nicht leer sein');
    for (const k of ['einleitung', 'baustellenVorwort', 'altbauText', 'weitereArbeiten', 'kontaktText']) p.muss(istText(d[k]), k, 'muss Text sein');
    p.muss(istListe(d.pinnwand) && d.pinnwand.length === 3 && d.pinnwand.every((b) => bekannt.bilder.has(b)), 'pinnwand', 'genau 3 Fotos nötig');
    bilderListe(p, 'altbauBilder', d.altbauBilder, bekannt, { mitBeschriftung: false });
  },
  'ueber-uns'(p, d, bekannt) {
    p.muss(istVoll(d.ueberschrift), 'ueberschrift', 'darf nicht leer sein');
    p.muss(bekannt.bilder.has(d.bild), 'bild', 'Foto fehlt');
    p.muss(istVoll(d.bildAlt), 'bildAlt', 'Bildbeschreibung fehlt');
    p.muss(istListe(d.absaetze) && d.absaetze.every(istVoll), 'absaetze', 'leere Absätze entfernen');
    p.muss(istText(d.unterschrift), 'unterschrift', 'muss Text sein');
  },
  orte(p, d) {
    p.muss(istVoll(d.ueberschrift), 'ueberschrift', 'darf nicht leer sein');
    p.muss(istText(d.vorwort), 'vorwort', 'muss Text sein');
    p.muss(istListe(d.zonen) && d.zonen.every((z) => istVoll(z.titel) && istText(z.entfernung) && istText(z.orte)), 'zonen', 'jede Zone braucht einen Titel');
  },
  bewertungen(p, d, bekannt) {
    p.muss(istVoll(d.ueberschrift), 'ueberschrift', 'darf nicht leer sein');
    p.muss(istVoll(d.note), 'note', 'darf nicht leer sein');
    p.muss(Number.isInteger(d.anzahl) && d.anzahl >= 0, 'anzahl', 'muss eine ganze Zahl sein');
    p.muss(d.verteilung && ['1', '2', '3', '4', '5'].every((k) => istZahl(d.verteilung[k])), 'verteilung', 'fünf Zahlen nötig');
    for (const k of ['quelle', 'quelleUrl', 'bilanzText', 'ehrlichTitel']) p.muss(istText(d[k]), k, 'muss Text sein');
    p.muss(istListe(d.ehrlichAbsaetze) && d.ehrlichAbsaetze.every(istText), 'ehrlichAbsaetze', 'muss eine Liste sein');
    p.muss(istListe(d.liste), 'liste', 'muss eine Liste sein');
    (d.liste ?? []).forEach((b, i) => {
      const f = `Bewertung ${i + 1}`;
      for (const k of ['wer', 'wann', 'arbeit', 'text']) p.muss(istVoll(b[k]), `${f} ${k}`, 'darf nicht leer sein');
      p.muss(Number.isInteger(b.sterne) && b.sterne >= 1 && b.sterne <= 5, `${f} sterne`, '1 bis 5');
      p.muss(istListe(b.leistungen) && b.leistungen.every((l) => bekannt.leistungen.has(l)), `${f} leistungen`, 'unbekannte Leistung');
      p.muss(istText(b.antwort ?? ''), `${f} antwort`, 'muss Text sein');
      p.muss(istBool(b.hervorheben ?? false), `${f} hervorheben`, 'ja/nein');
    });
  },
  weiterleitungen(p, d) {
    p.muss(istListe(d) && d.every((w) => /^\/\S*$/.test(w.von ?? '') && /^\/\S*$/.test(w.nach ?? '')), 'weiterleitungen', 'ungültig');
  },
  leistung(p, d, bekannt) {
    for (const k of ['name', 'kurzname', 'kurz', 'ueberschrift']) p.muss(istVoll(d[k]), k, 'darf nicht leer sein');
    p.muss(istListe(d.einleitung) && d.einleitung.length > 0 && d.einleitung.every(istVoll), 'einleitung', 'mindestens ein Absatz, keine leeren');
    p.muss(istListe(d.leistungsliste) && d.leistungsliste.every(istVoll), 'leistungsliste', 'leere Punkte entfernen');
    p.muss(istListe(d.fragen) && d.fragen.every((f) => istVoll(f.frage) && istVoll(f.antwort)), 'fragen', 'jede Frage braucht eine Antwort');
    bilderListe(p, 'bilder', d.bilder, bekannt);
    p.muss(istZahl(d.reihenfolge), 'reihenfolge', 'muss eine Zahl sein');
    p.muss(istText(d.seoTitel) && istText(d.seoBeschreibung), 'seo', 'muss Text sein');
    p.muss(istBool(d.entwurf), 'entwurf', 'ja/nein');
  },
  projekt(p, d, bekannt) {
    p.muss(istVoll(d.titel), 'titel', 'darf nicht leer sein');
    p.muss(istText(d.ort), 'ort', 'muss Text sein');
    p.muss(istListe(d.leistungen) && d.leistungen.every((l) => bekannt.leistungen.has(l)), 'leistungen', 'unbekannte Leistung');
    p.muss(istListe(d.absaetze) && d.absaetze.length > 0 && d.absaetze.every(istVoll), 'absaetze', 'mindestens ein Absatz, keine leeren');
    bilderListe(p, 'bilder', d.bilder, bekannt, { mind: 1 });
    p.muss(istBool(d.aufStartseite) && istBool(d.entwurf), 'schalter', 'ja/nein');
    p.muss(istZahl(d.reihenfolge), 'reihenfolge', 'muss eine Zahl sein');
    p.muss(istText(d.seoTitel) && istText(d.seoBeschreibung), 'seo', 'muss Text sein');
  },
};

// bekannt = { bilder: Set<string>, leistungen: Set<string> } – Stand NACH dieser Änderung
export function pruefeInhalt(pfad, daten, bekannt) {
  if (!INHALT_PFAD.test(pfad)) throw new CmsFehler(400, `Pfad nicht erlaubt: ${pfad}`);
  if (daten === null || typeof daten !== 'object') throw new CmsFehler(400, `${pfad}: kein gültiger Inhalt`);
  const name = pfad.startsWith('inhalt/leistungen/') ? 'leistung'
    : pfad.startsWith('inhalt/projekte/') ? 'projekt'
    : pfad.slice('inhalt/'.length, -'.json'.length);
  const p = pruefer(pfad);
  regeln[name](p, daten, bekannt);
  if (p.fehler.length) throw new CmsFehler(422, `Bitte prüfen (${pfad}):\n- ${p.fehler.join('\n- ')}`);
}
