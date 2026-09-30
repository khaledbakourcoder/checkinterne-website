// Baut aus den Felddefinitionen ein Formular und schreibt Änderungen direkt in das Datenobjekt (Arbeitskopie).
// ctx: { leistungen, fotoUrl(datei), fotoHochladen(file) -> Promise<datei>, fotoAuswaehlen() -> Promise<datei|null>,
//        geaendert(), neuZeichnen() }
import { h, melde } from './dom.js';
import { symbol } from './symbole.js';

const hole = (obj, name) => name.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setze(obj, name, wert) {
  const teile = name.split('.');
  const letzter = teile.pop();
  const ziel = teile.reduce((o, k) => (o[k] ??= {}), obj);
  ziel[letzter] = wert;
}

let zaehler = 0;
const neueId = () => `f${++zaehler}`;

function feldRahmen(def, id, inhalt, { alsGruppe = false } = {}) {
  const titel = alsGruppe
    ? h('span', { class: `feld-titel${def.pflicht ? ' pflicht' : ''}`, id: `${id}-t`, text: def.label })
    : h('label', { for: id, class: def.pflicht ? 'pflicht' : '', text: def.label });
  return h('div', { class: 'feld', ...(alsGruppe ? { role: 'group', 'aria-labelledby': `${id}-t` } : {}) },
    titel,
    def.hilfe && h('span', { class: 'hilfe', id: `${id}-h`, text: def.hilfe }),
    inhalt,
  );
}

function zaehlerAnzeige(def, feld) {
  if (!def.max) return null;
  const el = h('span', { class: 'zaehler' });
  const aktualisiere = () => {
    const n = feld.value.length;
    el.textContent = `${n} / ${def.max} Zeichen`;
    el.classList.toggle('zu-lang', n > def.max);
  };
  feld.addEventListener('input', aktualisiere);
  aktualisiere();
  return el;
}

function textFeld(def, daten, ctx) {
  const id = neueId();
  const mehrzeilig = def.typ === 'textarea';
  const feld = h(mehrzeilig ? 'textarea' : 'input', {
    id, ...(mehrzeilig ? { rows: 4 } : { type: 'text' }),
    value: hole(daten, def.name) ?? '',
    'aria-describedby': def.hilfe ? `${id}-h` : undefined,
    oninput: (e) => { setze(daten, def.name, e.target.value); ctx.geaendert(def.name); },
  });
  return feldRahmen(def, id, [feld, zaehlerAnzeige(def, feld)]);
}

// Telefonnummer so eingeben, wie man sie kennt („0162 7973502“) – gespeichert wird das Format für Links:
// art 'tel' → „+491627973502“, art 'whatsapp' → „491627973502“
export function nachInternational(eingabe, art) {
  let z = String(eingabe).replace(/[^\d+]/g, '');
  if (!z) return '';
  if (z.startsWith('+')) z = z.slice(1);
  else if (z.startsWith('00')) z = z.slice(2);
  else if (z.startsWith('0')) z = '49' + z.slice(1);
  return art === 'tel' ? `+${z}` : z;
}
const nachNational = (intl) => {
  const z = String(intl ?? '').replace(/^\+/, '');
  return z.startsWith('49') ? `0${z.slice(2)}` : z ? `+${z}` : '';
};

function telefonFeld(def, daten, ctx) {
  const id = neueId();
  const feld = h('input', {
    id, type: 'text', inputmode: 'tel', value: nachNational(hole(daten, def.name)), placeholder: 'z. B. 0162 1234567',
    oninput: (e) => { setze(daten, def.name, nachInternational(e.target.value, def.art)); ctx.geaendert(def.name); },
  });
  return feldRahmen(def, id, feld);
}

function zahlFeld(def, daten, ctx) {
  const id = neueId();
  return feldRahmen(def, id, h('input', {
    id, type: 'number', inputmode: 'numeric', value: hole(daten, def.name) ?? 0,
    oninput: (e) => { setze(daten, def.name, e.target.value === '' ? 0 : Number(e.target.value)); ctx.geaendert(def.name); },
  }));
}

function schalterFeld(def, daten, ctx) {
  return h('div', { class: 'feld' }, h('label', { class: 'schalter' },
    h('input', { type: 'checkbox', checked: !!hole(daten, def.name), onchange: (e) => { setze(daten, def.name, e.target.checked); ctx.geaendert(def.name); } }),
    def.label,
  ), def.hilfe && h('span', { class: 'hilfe', text: def.hilfe }));
}

function auswahlFeld(def, daten, ctx) {
  const id = neueId();
  const wert = hole(daten, def.name);
  return feldRahmen(def, id, h('select', {
    id,
    onchange: (e) => { setze(daten, def.name, def.zahl ? Number(e.target.value) : e.target.value); ctx.geaendert(def.name); },
  }, def.optionen(ctx).map((o) => h('option', { value: o.wert, selected: o.wert === wert, text: o.label }))));
}

function mehrfachFeld(def, daten, ctx) {
  const id = neueId();
  const liste = hole(daten, def.name) ?? [];
  const optionen = def.optionen(ctx);
  return feldRahmen(def, id, h('div', { class: 'haken-liste' }, optionen.map((o) => h('label', {},
    h('input', {
      type: 'checkbox', checked: liste.includes(o.wert),
      onchange: (e) => {
        const neu = new Set(hole(daten, def.name) ?? []);
        e.target.checked ? neu.add(o.wert) : neu.delete(o.wert);
        setze(daten, def.name, optionen.map((x) => x.wert).filter((w) => neu.has(w)));
        ctx.geaendert(def.name);
      },
    }),
    o.label,
  ))), { alsGruppe: true });
}

function eintragKnoepfe(liste, i, ctx, name) {
  const schiebe = (von, nach) => { const [x] = liste.splice(von, 1); liste.splice(nach, 0, x); ctx.geaendert(name); ctx.neuZeichnen(); };
  return h('span', { class: 'eintrag-knoepfe' },
    h('button', { type: 'button', class: 'mini', title: 'Eine Stelle nach oben schieben', disabled: i === 0, onclick: () => schiebe(i, i - 1) }, symbol('hoch'), 'Hoch'),
    h('button', { type: 'button', class: 'mini', title: 'Eine Stelle nach unten schieben', disabled: i === liste.length - 1, onclick: () => schiebe(i, i + 1) }, symbol('runter'), 'Runter'),
    h('button', {
      type: 'button', class: 'mini loeschen', title: 'Diesen Eintrag entfernen',
      onclick: () => { if (confirm('Diesen Eintrag entfernen?')) { liste.splice(i, 1); ctx.geaendert(name); ctx.neuZeichnen(); } },
    }, symbol('entfernen'), 'Entfernen'),
  );
}

function textlisteFeld(def, daten, ctx) {
  const id = neueId();
  if (!Array.isArray(hole(daten, def.name))) setze(daten, def.name, []);
  const liste = hole(daten, def.name);
  // Absätze: eigener Rahmen mit Nummer, damit klar ist, zu welchem Absatz die Knöpfe gehören.
  // Kurze Punkte: eine Zeile mit Knöpfen daneben.
  const zeilen = liste.map((wert, i) => {
    const eingabe = h(def.mehrzeilig ? 'textarea' : 'input', {
      ...(def.mehrzeilig ? { rows: 4 } : { type: 'text' }), value: wert, 'aria-label': `${def.eintrag} ${i + 1}`,
      id: i === 0 ? id : undefined,
      oninput: (e) => { liste[i] = e.target.value; ctx.geaendert(def.name); },
    });
    return def.mehrzeilig
      ? h('div', { class: 'eintrag' }, h('div', { class: 'eintrag-kopf' }, h('span', { text: `${def.eintrag} ${i + 1}` }), eintragKnoepfe(liste, i, ctx, def.name)), eingabe)
      : h('div', { class: 'textliste-zeile' }, eingabe, eintragKnoepfe(liste, i, ctx, def.name));
  });
  return feldRahmen(def, id, [
    ...zeilen,
    h('button', { type: 'button', class: 'knopf klein', onclick: () => { liste.push(''); ctx.geaendert(def.name); ctx.neuZeichnen(); } }, symbol('plus'), `${def.eintrag} hinzufügen`),
  ], { alsGruppe: true });
}

function objektlisteFeld(def, daten, ctx) {
  const id = neueId();
  if (!Array.isArray(hole(daten, def.name))) setze(daten, def.name, []);
  const liste = hole(daten, def.name);
  const neuerEintrag = () => {
    const leer = def.neu ? def.neu() : Object.fromEntries(def.felder.map((f) => [f.name, f.typ === 'zahl' ? 0 : '']));
    def.neuOben ? liste.unshift(leer) : liste.push(leer);
    ctx.geaendert(def.name);
    ctx.neuZeichnen();
  };
  const hinzu = h('button', { type: 'button', class: 'knopf klein', onclick: neuerEintrag }, symbol('plus'), `${def.eintrag} hinzufügen`);
  const eintraege = liste.map((obj, i) => {
    const kopfText = h('span', { text: obj[def.titelVon] || `${def.eintrag} ${i + 1}` });
    const kind = { ...ctx, geaendert: (n) => { kopfText.textContent = obj[def.titelVon] || `${def.eintrag} ${i + 1}`; ctx.geaendert(`${def.name}.${n}`); } };
    return h('div', { class: 'eintrag' },
      h('div', { class: 'eintrag-kopf' }, kopfText, eintragKnoepfe(liste, i, ctx, def.name)),
      def.felder.map((f) => feld(f, obj, kind)),
    );
  });
  return feldRahmen(def, id, def.neuOben ? [hinzu, ...eintraege] : [...eintraege, hinzu], { alsGruppe: true });
}

function fotoVorschau(ctx, datei) {
  return datei
    ? h('img', { class: 'foto-bild', src: ctx.fotoUrl(datei), alt: '', loading: 'lazy' })
    : h('span', { class: 'foto-leer', text: 'Kein Foto' });
}

function fotoKnoepfe(ctx, { mehrere, beiDateien, beiAuswahl }) {
  const input = h('input', {
    type: 'file', accept: 'image/*', class: 'datei-input', multiple: mehrere, tabindex: -1,
    onchange: async (e) => {
      const dateien = [...e.target.files];
      e.target.value = '';
      if (!dateien.length) return;
      melde(dateien.length > 1 ? `${dateien.length} Fotos werden vorbereitet …` : 'Foto wird vorbereitet …');
      const namen = [];
      for (const d of dateien) {
        try { namen.push(await ctx.fotoHochladen(d)); } catch (err) { melde(err.message, { fehler: true }); }
      }
      if (namen.length) { beiDateien(namen); melde(namen.length > 1 ? `${namen.length} Fotos hinzugefügt. Speichern nicht vergessen.` : 'Foto hinzugefügt. Speichern nicht vergessen.'); }
    },
  });
  return h('span', { class: 'foto-knoepfe' },
    input,
    h('button', { type: 'button', class: 'knopf klein', onclick: () => input.click() }, symbol('hochladen'), mehrere ? 'Fotos hochladen' : 'Foto hochladen'),
    h('button', { type: 'button', class: 'knopf klein', onclick: async () => { const d = await ctx.fotoAuswaehlen(); if (d) beiAuswahl(d); } }, symbol('galerie'), 'Vorhandenes Foto wählen'),
  );
}

function fotoFeld(def, daten, ctx) {
  const id = neueId();
  const datei = hole(daten, def.name);
  const setzeFoto = (d) => { setze(daten, def.name, d); ctx.geaendert(def.name); ctx.neuZeichnen(); };
  return feldRahmen(def, id, h('div', { class: 'foto' },
    fotoVorschau(ctx, datei),
    h('div', { class: 'foto-rechts' },
      fotoKnoepfe(ctx, { mehrere: false, beiDateien: ([d]) => setzeFoto(d), beiAuswahl: setzeFoto }),
      def.altName && h('input', {
        id, type: 'text', value: hole(daten, def.altName) ?? '', placeholder: 'Was sieht man? (freiwillig)', 'aria-label': 'Beschreibung des Fotos',
        oninput: (e) => { setze(daten, def.altName, e.target.value); ctx.geaendert(def.altName); },
      }),
    ),
  ), { alsGruppe: true });
}

function fotolisteFeld(def, daten, ctx) {
  const id = neueId();
  if (!Array.isArray(hole(daten, def.name))) setze(daten, def.name, []);
  const liste = hole(daten, def.name);
  const neu = (datei) => (def.mitBeschriftung ? { datei, alt: '', beschriftung: '' } : { datei, alt: '' });
  const eintraege = liste.map((b, i) => h('div', { class: 'eintrag' },
    h('div', { class: 'eintrag-kopf' }, h('span', { text: `Foto ${i + 1}` }), eintragKnoepfe(liste, i, ctx, def.name)),
    h('div', { class: 'foto' },
      fotoVorschau(ctx, b.datei),
      h('div', { class: 'foto-rechts' },
        def.mitBeschriftung && h('input', {
          type: 'text', value: b.beschriftung ?? '', placeholder: 'Kurz beschriften, z. B. „Vorher“ oder „Fertig“', 'aria-label': `Beschriftung Foto ${i + 1}`,
          oninput: (e) => { b.beschriftung = e.target.value; ctx.geaendert(def.name); },
        }),
        h('input', {
          type: 'text', value: b.alt ?? '', placeholder: 'Was sieht man? (freiwillig, hilft bei Google)', 'aria-label': `Beschreibung Foto ${i + 1}`,
          oninput: (e) => { b.alt = e.target.value; ctx.geaendert(def.name); },
        }),
      ),
    ),
  ));
  return feldRahmen(def, id, [
    ...eintraege,
    fotoKnoepfe(ctx, {
      mehrere: true,
      beiDateien: (namen) => { namen.forEach((d) => liste.push(neu(d))); ctx.geaendert(def.name); ctx.neuZeichnen(); },
      beiAuswahl: (d) => { liste.push(neu(d)); ctx.geaendert(def.name); ctx.neuZeichnen(); },
    }),
  ], { alsGruppe: true });
}

function fotosFestFeld(def, daten, ctx) {
  const id = neueId();
  const liste = hole(daten, def.name);
  return feldRahmen(def, id, liste.map((datei, i) => h('div', { class: 'eintrag' },
    h('div', { class: 'eintrag-kopf' }, h('span', { text: `Foto ${i + 1}` })),
    h('div', { class: 'foto' },
      fotoVorschau(ctx, datei),
      h('div', { class: 'foto-rechts' }, fotoKnoepfe(ctx, {
        mehrere: false,
        beiDateien: ([d]) => { liste[i] = d; ctx.geaendert(def.name); ctx.neuZeichnen(); },
        beiAuswahl: (d) => { liste[i] = d; ctx.geaendert(def.name); ctx.neuZeichnen(); },
      })),
    ),
  )), { alsGruppe: true });
}

// Abschnitt = eigene Karte mit Symbol, Überschrift und kurzer Erklärung. Seltenes ist zugeklappt;
// ob ein zugeklappter Abschnitt offen ist, bleibt beim Neuzeichnen erhalten.
const offeneAbschnitte = new Set();
function abschnitt(def, daten, ctx) {
  const id = neueId();
  const kopf = [
    h('span', { class: 'abschnitt-symbol' }, symbol(def.symbol)),
    h('span', { class: 'abschnitt-kopftext' },
      h('h2', { id: `${id}-t`, text: def.titel }),
      def.text && h('span', { class: 'abschnitt-text', text: def.text })),
  ];
  // Nur ein Feld im Abschnitt: dessen Beschriftung wiederholt nur die Überschrift – sichtbar weglassen
  const inhalt = h('div', { class: `abschnitt-inhalt${def.felder.length === 1 ? ' einzeln' : ''}` }, def.felder.map((f) => feld(f, daten, ctx)));
  if (!def.zugeklappt) return h('section', { class: 'karte abschnitt', 'aria-labelledby': `${id}-t` }, h('div', { class: 'abschnitt-kopf' }, kopf), inhalt);
  return h('details', {
    class: 'karte abschnitt zugeklappt', open: offeneAbschnitte.has(def.titel) || undefined,
    ontoggle: (e) => (e.target.open ? offeneAbschnitte.add(def.titel) : offeneAbschnitte.delete(def.titel)),
  }, h('summary', { class: 'abschnitt-kopf' }, kopf, h('span', { class: 'aufklappen', 'aria-hidden': 'true' })), inhalt);
}

const baumeister = {
  text: textFeld, textarea: textFeld, zahl: zahlFeld, telefon: telefonFeld, schalter: schalterFeld, auswahl: auswahlFeld, mehrfach: mehrfachFeld,
  textliste: textlisteFeld, objektliste: objektlisteFeld, foto: fotoFeld, fotoliste: fotolisteFeld, 'fotos-fest': fotosFestFeld, abschnitt,
};

export function feld(def, daten, ctx) {
  const b = baumeister[def.typ];
  if (!b) throw new Error(`Unbekannter Feldtyp ${def.typ}`);
  return b(def, daten, ctx);
}

// Pflichtfelder prüfen (Liste von Meldungen)
export function fehlendePflichtfelder(felder, daten, praefix = '') {
  const fehler = [];
  for (const def of felder) {
    if (def.typ === 'abschnitt') {
      // Ein Feld allein im Abschnitt: in der Meldung heißt es wie der Abschnitt („Beschreibung fehlt“)
      const felderHier = def.felder.length === 1 ? [{ ...def.felder[0], label: def.titel }] : def.felder;
      fehler.push(...fehlendePflichtfelder(felderHier, daten, praefix));
      continue;
    }
    const wert = hole(daten, def.name);
    if (def.typ === 'objektliste') {
      (wert ?? []).forEach((obj, i) => fehler.push(...fehlendePflichtfelder(def.felder, obj, `${def.eintrag} ${i + 1}: `)));
    }
    if (def.typ === 'textliste' && (wert ?? []).some((x) => !x.trim())) fehler.push(`${praefix}${def.label}: leere ${def.eintrag}-Felder ausfüllen oder entfernen`);
    if (!def.pflicht) continue;
    const leer = Array.isArray(wert) ? wert.filter((x) => (typeof x === 'string' ? x.trim() : x)).length === 0 : !String(wert ?? '').trim();
    if (leer) fehler.push(`${praefix}${def.label} fehlt`);
  }
  return fehler;
}
