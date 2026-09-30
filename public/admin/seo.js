// SEO-Ampel und Google-Vorschau. Rot = blockiert das Online-Stellen, Gelb = Empfehlung.
import { h, woerter } from './dom.js';

export const TITEL_MAX = 60;
export const BESCHREIBUNG_MAX = 155;
// Unter MIN_... kann eine Leistungsseite nicht online gehen, unter GUT_... gibt es nur einen Tipp
const MIN_WOERTER_LEISTUNG = 150;
const GUT_WOERTER_LEISTUNG = 250;
const MIN_WOERTER_PROJEKT = 60;

const kuerzen = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + ' …' : t);

export function effektiv(art, d, ctx) {
  const firma = ctx.einstellungen.firma;
  if (art === 'leistung') {
    return {
      titel: d.seoTitel || `${d.ueberschrift} – ${firma}`,
      beschreibung: d.seoBeschreibung || (d.einleitung?.[0] ?? '').slice(0, BESCHREIBUNG_MAX),
      pfad: `/${ctx.slug}/`,
    };
  }
  if (art === 'projekt') {
    return {
      titel: d.seoTitel || `${d.titel}${d.ort ? ` in ${d.ort}` : ''} – ${firma}`,
      beschreibung: d.seoBeschreibung || (d.absaetze ?? []).join(' ').slice(0, BESCHREIBUNG_MAX),
      pfad: `/projekte/${ctx.slug}/`,
    };
  }
  return { titel: d.seoTitel, beschreibung: d.seoBeschreibung, pfad: '/' };
}

function laengen(p, e) {
  if (e.titel.length > TITEL_MAX) p.gelb(`Titel für Google ist ${e.titel.length} Zeichen lang – Google zeigt nur etwa ${TITEL_MAX}. Unter „Erweitert“ einen kürzeren eigenen Titel eintragen.`);
  if (!e.beschreibung) p.gelb('Beschreibung für Google fehlt.');
  else if (e.beschreibung.length > BESCHREIBUNG_MAX) p.gelb(`Beschreibung für Google ist ${e.beschreibung.length} Zeichen lang – ideal sind bis ${BESCHREIBUNG_MAX}.`);
  else if (e.beschreibung.length < 70) p.gelb('Beschreibung für Google ist sehr kurz – 1 bis 2 Sätze (70–155 Zeichen) sind ideal.');
}

// Bildbeschreibungen sind kein Muss: fehlen sie, bildet das Dashboard sie beim Speichern automatisch
function fotos(p, bilder, { mind }) {
  if ((bilder?.length ?? 0) < mind) p.rot(mind === 1 ? 'Mindestens ein Foto hinzufügen.' : `Mindestens ${mind} Fotos hinzufügen.`);
}

function sammler() {
  const punkte = [];
  return {
    punkte,
    rot: (text) => punkte.push({ stufe: 'rot', text }),
    gelb: (text) => punkte.push({ stufe: 'gelb', text }),
    gruen: (text) => punkte.push({ stufe: 'gruen', text }),
  };
}

export function pruefe(art, d, ctx) {
  const p = sammler();
  const e = effektiv(art, d, ctx);
  const ort = ctx.einstellungen.ort;

  if (art === 'leistung') {
    if (!d.name?.trim()) p.rot('Name der Leistung fehlt.');
    if (!d.ueberschrift?.trim()) p.rot('Überschrift fehlt.');
    if (!d.kurz?.trim()) p.rot('Kurzbeschreibung fehlt.');
    const doppelt = ctx.andereLeistungen.find((l) => l.name.trim().toLowerCase() === d.name?.trim().toLowerCase() || l.id === ctx.slug);
    if (doppelt) p.rot(`Es gibt schon eine Leistung „${doppelt.name}“.`);
    else {
      const aehnlich = ctx.andereLeistungen.find((l) => {
        const a = l.name.toLowerCase(), b = (d.name ?? '').toLowerCase();
        return b.length > 2 && (a.includes(b) || b.includes(a));
      });
      if (aehnlich) p.gelb(`Sehr ähnlich wie „${aehnlich.name}“. Zwei fast gleiche Seiten schaden bei Google – lieber die bestehende ergänzen.`);
    }
    fotos(p, d.bilder, { mind: 1 });
    const anzahl = woerter(d.kurz, d.einleitung, d.leistungsliste, (d.fragen ?? []).map((f) => [f.frage, f.antwort]));
    if (anzahl < MIN_WOERTER_LEISTUNG) p.rot(`Noch etwas mehr Text schreiben (${anzahl} von mindestens ${MIN_WOERTER_LEISTUNG} Wörtern). Zum Beispiel: Wie läuft die Arbeit ab?`);
    else if (anzahl < GUT_WOERTER_LEISTUNG) p.gelb(`Mehr Text hilft bei Google (${anzahl} Wörter, gut sind ${GUT_WOERTER_LEISTUNG}).`);
    if (ort && !d.ueberschrift?.includes(ort)) p.gelb(`Der Ort „${ort}“ steht nicht in der Überschrift – z. B. „${d.name || 'Leistung'} in ${ort} und Umgebung“.`);
    if (!(d.fragen?.length)) p.gelb('Noch keine häufigen Fragen – 2 bis 3 Fragen helfen Kunden und Google.');
  }

  if (art === 'projekt') {
    if (!d.titel?.trim()) p.rot('Titel fehlt.');
    if (!(d.absaetze?.some((a) => a.trim()))) p.rot('Beschreibung fehlt.');
    if (!(d.leistungen?.length)) p.rot('Mindestens eine Leistung auswählen, zu der die Baustelle gehört.');
    fotos(p, d.bilder, { mind: 1 });
    if (!d.ort?.trim()) p.gelb('Ort fehlt – z. B. „Flensburg“. Hilft bei Suchen wie „Badsanierung Flensburg“.');
    const anzahl = woerter(d.absaetze);
    if (anzahl < MIN_WOERTER_PROJEKT) p.gelb(`Nur ${anzahl} Wörter. Ein paar Sätze mehr (Was war das Problem? Was haben Sie gemacht?) helfen.`);
    const ohneText = (d.bilder ?? []).filter((b) => !b.beschriftung?.trim()).length;
    if (ohneText) p.gelb(`${ohneText} Foto(s) ohne Beschriftung wie „Vorher“ oder „Fertig“.`);
  }

  laengen(p, e);
  const rot = p.punkte.filter((x) => x.stufe === 'rot').length;
  const gelb = p.punkte.filter((x) => x.stufe === 'gelb').length;
  return { punkte: p.punkte, rot, gelb, effektiv: e };
}

export function googleVorschau(e, domain) {
  const host = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const pfad = e.pfad.split('/').filter(Boolean).join(' › ');
  return h('div', { class: 'google', 'aria-label': 'So könnte das Suchergebnis bei Google aussehen' },
    h('div', { class: 'google-url', text: pfad ? `${host} › ${pfad}` : host }),
    h('div', { class: 'google-titel', text: kuerzen(e.titel || '(kein Titel)', TITEL_MAX + 3) }),
    h('div', { class: 'google-text', text: kuerzen(e.beschreibung || '(keine Beschreibung)', BESCHREIBUNG_MAX + 3) }),
  );
}

// Nur zeigen, was wirklich fehlt. Tipps für Google sind zugeklappt, damit es nicht überfordert.
export function ampelListe(ergebnis) {
  const rot = ergebnis.punkte.filter((x) => x.stufe === 'rot');
  const tipps = ergebnis.punkte.filter((x) => x.stufe === 'gelb');
  return [
    rot.length
      ? [h('p', { class: 'ampel-zusammenfassung', text: 'Das fehlt noch:' }), h('ul', { class: 'ampel' }, rot.map((x) => h('li', { class: 'rot', text: x.text })))]
      : h('ul', { class: 'ampel' }, h('li', { class: 'gruen', text: 'Alles Nötige ist da.' })),
    tipps.length > 0 && h('details', { class: 'tipps' },
      h('summary', { text: `Tipps für Google (${tipps.length})` }),
      h('ul', { class: 'ampel' }, tipps.map((x) => h('li', { class: 'gelb', text: x.text })))),
  ].flat().filter(Boolean);
}
