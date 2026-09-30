// Lädt alle Inhalte aus /inhalt und prüft sie beim Build.
// Ist eine Datei fehlerhaft (z. B. vom Dashboard falsch gespeichert), bricht der Build ab –
// die zuletzt funktionierende Version bleibt dann online.
import { z } from 'astro/zod';
import type { ImageMetadata } from 'astro';

const text = z.string().trim();
const pflicht = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'nur Kleinbuchstaben, Zahlen und Bindestriche');
const datei = z.string().regex(/^[a-z0-9][a-z0-9-]*\.(jpe?g|png|webp)$/, 'ungültiger Bildname');

const bild = z.object({ datei, alt: pflicht, beschriftung: text.default('') });

const einstellungenSchema = z.object({
  firma: pflicht, markeKurz: pflicht, markeZusatz: text, inhaber: pflicht,
  domain: z.string().url(),
  telefon: text, telefonAnzeige: text, whatsapp: text, email: text,
  strasse: text, plz: text, ort: pflicht,
  gewerke: text, einsatzgebiet: text, myhammerUrl: text,
  formularZiel: text, impressumUrl: text, datenschutzUrl: text,
});

const startseiteSchema = z.object({
  seoTitel: pflicht, seoBeschreibung: pflicht,
  ueberschrift: pflicht, einleitung: text,
  pinnwand: z.array(datei).length(3),
  baustellenUeberschrift: pflicht, baustellenVorwort: text,
  altbauText: text, altbauBilder: z.array(bild.omit({ beschriftung: true })),
  leistungenUeberschrift: pflicht, weitereArbeiten: text,
  kontaktUeberschrift: pflicht, kontaktText: text,
});

const ueberUnsSchema = z.object({
  ueberschrift: pflicht, bild: datei, bildAlt: pflicht,
  absaetze: z.array(pflicht), unterschrift: text,
});

const orteSchema = z.object({
  ueberschrift: pflicht, vorwort: text,
  zonen: z.array(z.object({ titel: pflicht, entfernung: text, orte: text })),
});

const bewertungSchema = z.object({
  wer: pflicht, wann: pflicht, sterne: z.number().int().min(1).max(5),
  leistungen: z.array(slug), arbeit: pflicht, text: pflicht,
  antwort: text.default(''), hervorheben: z.boolean().default(false),
});

const bewertungenSchema = z.object({
  ueberschrift: pflicht, note: pflicht, anzahl: z.number().int().min(0),
  quelle: text, quelleUrl: text, bilanzText: text,
  verteilung: z.object({ '5': z.number(), '4': z.number(), '3': z.number(), '2': z.number(), '1': z.number() }),
  ehrlichTitel: text, ehrlichAbsaetze: z.array(text),
  liste: z.array(bewertungSchema),
});

const leistungSchema = z.object({
  name: pflicht, kurzname: pflicht, kurz: pflicht, ueberschrift: pflicht,
  einleitung: z.array(pflicht).min(1),
  leistungsliste: z.array(pflicht),
  fragen: z.array(z.object({ frage: pflicht, antwort: pflicht })),
  bilder: z.array(bild),
  reihenfolge: z.number().default(99),
  seoTitel: text.default(''), seoBeschreibung: text.default(''),
  entwurf: z.boolean().default(false),
});

const projektSchema = z.object({
  titel: pflicht, ort: text.default(''),
  leistungen: z.array(slug),
  absaetze: z.array(pflicht).min(1),
  bilder: z.array(bild).min(1),
  aufStartseite: z.boolean().default(false),
  reihenfolge: z.number().default(99),
  seoTitel: text.default(''), seoBeschreibung: text.default(''),
  entwurf: z.boolean().default(false),
});

const weiterleitungenSchema = z.array(z.object({
  von: z.string().startsWith('/'), nach: z.string().startsWith('/'),
}));

function pruefe<T>(schema: z.ZodType<T>, daten: unknown, pfad: string): T {
  const r = schema.safeParse(daten);
  if (!r.success) {
    const fehler = r.error.issues.map((i) => `  - ${i.path.join('.') || '(Datei)'}: ${i.message}`).join('\n');
    throw new Error(`Inhalt fehlerhaft in ${pfad}:\n${fehler}`);
  }
  return r.data;
}

function sammlung<T>(dateien: Record<string, unknown>, schema: z.ZodType<T>) {
  return Object.entries(dateien).map(([pfad, daten]) => {
    const id = pfad.split('/').pop()!.replace(/\.json$/, '');
    pruefe(slug, id, pfad);
    return { id, ...pruefe(schema, daten, pfad) };
  });
}

const einzel = import.meta.glob('/inhalt/*.json', { eager: true, import: 'default' });
const hole = <T>(name: string, schema: z.ZodType<T>) => pruefe(schema, einzel[`/inhalt/${name}.json`], `inhalt/${name}.json`);

export const einstellungen = hole('einstellungen', einstellungenSchema);
export const startseite = hole('startseite', startseiteSchema);
export const ueberUns = hole('ueber-uns', ueberUnsSchema);
export const orte = hole('orte', orteSchema);
export const bewertungen = hole('bewertungen', bewertungenSchema);
export const weiterleitungen = hole('weiterleitungen', weiterleitungenSchema);

const alleLeistungen = sammlung(import.meta.glob('/inhalt/leistungen/*.json', { eager: true, import: 'default' }), leistungSchema)
  .sort((a, b) => a.reihenfolge - b.reihenfolge);
const alleProjekte = sammlung(import.meta.glob('/inhalt/projekte/*.json', { eager: true, import: 'default' }), projektSchema)
  .sort((a, b) => a.reihenfolge - b.reihenfolge);

// Entwürfe erscheinen nur, wenn die Vorschau sie ausdrücklich zeigen soll (Entwurfs-Branch)
const zeigeEntwuerfe = import.meta.env.PUBLIC_ENTWUERFE_ZEIGEN === 'ja';
export const leistungen = alleLeistungen.filter((l) => zeigeEntwuerfe || !l.entwurf);
export const alleLeistungenFuerListe = alleLeistungen;
export const projekte = alleProjekte.filter((p) => zeigeEntwuerfe || !p.entwurf);

export type Leistung = (typeof alleLeistungen)[number];
export type Projekt = (typeof alleProjekte)[number];

// Verweise prüfen: jede genannte Leistung muss existieren, jedes Bild muss vorhanden sein
const bilder = import.meta.glob<ImageMetadata>('/src/assets/bilder/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const leistungIds = new Set(alleLeistungen.map((l) => l.id));

export function bildDaten(dateiname: string): ImageMetadata {
  const b = bilder[`/src/assets/bilder/${dateiname}`];
  if (!b) throw new Error(`Bild fehlt: src/assets/bilder/${dateiname}`);
  return b;
}

const genutzteBilder = [
  ...startseite.pinnwand, ...startseite.altbauBilder.map((b) => b.datei), ueberUns.bild,
  ...alleLeistungen.flatMap((l) => l.bilder.map((b) => b.datei)),
  ...alleProjekte.flatMap((p) => p.bilder.map((b) => b.datei)),
];
genutzteBilder.forEach(bildDaten);

for (const [wo, ids] of [
  ...bewertungen.liste.map((b) => [`Bewertung von ${b.wer}`, b.leistungen] as const),
  ...alleProjekte.map((p) => [`Projekt ${p.id}`, p.leistungen] as const),
]) {
  for (const id of ids) if (!leistungIds.has(id)) throw new Error(`${wo}: unbekannte Leistung "${id}"`);
}

// Hilfen für die Seiten
export const url = {
  leistung: (id: string) => `/${id}/`,
  projekt: (id: string) => `/projekte/${id}/`,
};
export const telLink = () => `tel:${einstellungen.telefon}`;
export const whatsappLink = () => `https://wa.me/${einstellungen.whatsapp}`;
export const bewertungenZu = (id: string) => bewertungen.liste.filter((b) => b.leistungen.includes(id));
export const projekteZu = (id: string) => projekte.filter((p) => p.leistungen.includes(id));
export const istOnline = (id: string) => leistungen.some((l) => l.id === id);
