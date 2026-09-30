// Einfache Strich-Symbole (24 × 24) für Navigation, Abschnitte und Knöpfe.
// Symbole stehen nie allein: Daneben steht immer ein sichtbarer Text (siehe Dashboard-Ui-UX.md, 2.3).
const NS = 'http://www.w3.org/2000/svg';

// Jedes Symbol: Liste von Formen – Text = Pfad, Array = Kreis [cx, cy, r]
const formen = {
  haus: ['M3 11 12 4l9 7', 'M5 9.5V20h14V9.5', 'M10 20v-6h4v6'],
  baustelle: ['M3 18h18', 'M5 18v-2a7 7 0 0 1 14 0v2', 'M10 9.5V6h4v3.5'],
  werkzeug: ['M3 9h18v11H3z', 'M8 9V5.5h8V9', 'M3 14h18', 'M10 14v2h4v-2'],
  startseite: ['M3 5h18v14H3z', 'M3 9h18', 'M6 7h.01', 'M8.5 7h.01'],
  person: [[12, 8, 4], 'M4 21a8 8 0 0 1 16 0'],
  ort: ['M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z', [12, 9.5, 2.5]],
  telefon: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'],
  uhr: [[12, 12, 9], 'M12 7v5l3 2'],
  titel: ['M6 4v16', 'M18 4v16', 'M6 12h12'],
  text: ['M4 6h16', 'M4 10h16', 'M4 14h16', 'M4 18h10'],
  liste: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'm3.5 6 1 1 2-2', 'm3.5 12 1 1 2-2', 'm3.5 18 1 1 2-2'],
  foto: ['M4 7.5h3L9 5h6l2 2.5h3V19H4z', [12, 13, 3.5]],
  frage: [[12, 12, 9], 'M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4', 'M12 16.8h.01'],
  zahnrad: [[12, 12, 3], 'M12 3v2.5', 'M12 18.5V21', 'M3 12h2.5', 'M18.5 12H21', 'm5.6 5.6 1.8 1.8', 'm16.6 16.6 1.8 1.8', 'm5.6 18.4 1.8-1.8', 'm16.6 7.4 1.8-1.8'],
  lupe: [[11, 11, 7], 'm20 20-4-4'],
  auge: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', [12, 12, 3]],
  stern: ['M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z'],
  etikett: ['M3 12V3h9l9 9-9 9z', [7.5, 7.5, 1.5]],
  firma: ['M4 21V4h10v17', 'M14 9h6v12', 'M2 21h20', 'M7.5 8h3', 'M7.5 12h3', 'M7.5 16h3'],
  brief: ['M3 6h18v12H3z', 'm3 7 9 6 9-6'],
  sprechblase: ['M4 20l1.4-4A8 8 0 1 1 8.5 19z'],
  karte: ['M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z', 'M9 4v14', 'M15 6v14'],
  hoch: ['M12 19V5', 'm6 11 6-6 6 6'],
  runter: ['M12 5v14', 'm6 13 6 6 6-6'],
  entfernen: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  plus: ['M12 5v14', 'M5 12h14'],
  hochladen: ['M12 15V4', 'm7 9 5-5 5 5', 'M4 15v5h16v-5'],
  galerie: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  haken: ['m5 12.5 4.5 4.5L19 7'],
  extern: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v6H4V6h6'],
  schliessen: ['M6 6l12 12', 'M18 6 6 18'],
  zurueck: ['M15 18l-6-6 6-6'],
  menue: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  abmelden: ['M9 20H5V4h4', 'M16 16l4-4-4-4', 'M20 12H9'],
  rueckgaengig: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
};

export function symbol(name, { klasse = 'symbol' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', klasse);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const f of formen[name] ?? []) {
    const el = document.createElementNS(NS, Array.isArray(f) ? 'circle' : 'path');
    if (Array.isArray(f)) { el.setAttribute('cx', f[0]); el.setAttribute('cy', f[1]); el.setAttribute('r', f[2]); }
    else el.setAttribute('d', f);
    svg.append(el);
  }
  return svg;
}
