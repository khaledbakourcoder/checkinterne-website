// Was im Dashboard bearbeitet werden kann – Felder, Beschriftungen, Hilfetexte.
// Nur bestehende Inhalte: Neue Seiten legt der Entwickler an, Bewertungen kommen später per API.
// Feldtypen: text, textarea, telefon, zahl, schalter, auswahl, mehrfach, textliste, objektliste, foto, fotoliste, fotos-fest, gruppe
import { TITEL_MAX, BESCHREIBUNG_MAX } from './seo.js';

const leistungsOptionen = (ctx) => ctx.leistungen.map((l) => ({ wert: l.id, label: l.name }));

// Alles Technische steht zugeklappt unter „Erweitert“ – im Alltag braucht man es nicht.
const erweitert = (hilfeTitel, ...zusatz) => ({
  typ: 'gruppe', label: 'Erweitert', erweitert: true, felder: [
    ...zusatz,
    { typ: 'zahl', name: 'reihenfolge', label: 'Position in der Liste', hilfe: '1 = ganz oben.' },
    { typ: 'text', name: 'seoTitel', label: 'Eigener Titel bei Google', max: TITEL_MAX, hilfe: hilfeTitel },
    { typ: 'textarea', name: 'seoBeschreibung', label: 'Eigene Beschreibung bei Google', max: BESCHREIBUNG_MAX, hilfe: 'Leer lassen = wird aus dem ersten Absatz genommen.' },
  ],
});

export const definitionen = {
  leistung: {
    titel: 'Leistung',
    felder: [
      { typ: 'text', name: 'name', label: 'Name der Leistung', pflicht: true, hilfe: 'So, wie Kunden danach suchen – z. B. „Badsanierung“.' },
      { typ: 'text', name: 'ueberschrift', label: 'Überschrift der Seite', pflicht: true, hilfe: 'Mit Ort, z. B. „Badsanierung in Flensburg und Umgebung“.' },
      { typ: 'textarea', name: 'kurz', label: 'Ein Satz für die Startseite', pflicht: true },
      { typ: 'textliste', name: 'einleitung', label: 'Text der Seite', eintrag: 'Absatz', mehrzeilig: true, pflicht: true, hilfe: 'In eigenen Worten: Was machen Sie, worauf kommt es an, wie läuft es ab?' },
      { typ: 'textliste', name: 'leistungsliste', label: 'Was wir dabei machen (Aufzählung)', eintrag: 'Punkt' },
      { typ: 'objektliste', name: 'fragen', label: 'Häufige Fragen', eintrag: 'Frage', titelVon: 'frage', felder: [
        { typ: 'text', name: 'frage', label: 'Frage', pflicht: true },
        { typ: 'textarea', name: 'antwort', label: 'Antwort', pflicht: true },
      ] },
      { typ: 'fotoliste', name: 'bilder', label: 'Fotos', mitBeschriftung: true },
      erweitert('Leer lassen = „Überschrift – Firmenname“.',
        { typ: 'text', name: 'kurzname', label: 'Kurzname für die Filter-Knöpfe', hilfe: 'Ein Wort, z. B. „Bad“. Leer lassen = erstes Wort des Namens.' }),
    ],
  },

  projekt: {
    titel: 'Baustelle',
    felder: [
      { typ: 'text', name: 'titel', label: 'Titel', pflicht: true, hilfe: 'Was war das? z. B. „Bad im Altbau komplett erneuert“.' },
      { typ: 'text', name: 'ort', label: 'Ort', hilfe: 'z. B. „Flensburg“ oder „Kappeln“. Keine Straße (Datenschutz der Kunden).' },
      { typ: 'mehrfach', name: 'leistungen', label: 'Gehört zu welchen Leistungen?', pflicht: true, optionen: leistungsOptionen },
      { typ: 'textliste', name: 'absaetze', label: 'Beschreibung', eintrag: 'Absatz', mehrzeilig: true, pflicht: true, hilfe: 'Wie sah es vorher aus? Was haben Sie gemacht? Was war schwierig?' },
      { typ: 'fotoliste', name: 'bilder', label: 'Fotos (in der Reihenfolge der Arbeit)', mitBeschriftung: true, pflicht: true },
      { typ: 'schalter', name: 'aufStartseite', label: 'Auch auf der Startseite zeigen' },
      erweitert('Leer lassen = „Titel in Ort – Firmenname“.'),
    ],
  },

  startseite: {
    titel: 'Startseite',
    felder: [
      { typ: 'text', name: 'ueberschrift', label: 'Große Überschrift', pflicht: true },
      { typ: 'textarea', name: 'einleitung', label: 'Text darunter' },
      { typ: 'fotos-fest', name: 'pinnwand', label: 'Die drei Fotos oben', anzahl: 3, hilfe: 'Links groß (Hochformat), rechts zwei quadratische.' },
      { typ: 'text', name: 'baustellenUeberschrift', label: 'Überschrift „Baustellen“', pflicht: true },
      { typ: 'textarea', name: 'baustellenVorwort', label: 'Text zu den Baustellen' },
      { typ: 'textarea', name: 'altbauText', label: 'Text über den Altbau-Fotos' },
      { typ: 'fotoliste', name: 'altbauBilder', label: 'Altbau-Fotos', mitBeschriftung: false },
      { typ: 'text', name: 'leistungenUeberschrift', label: 'Überschrift „Leistungen“', pflicht: true },
      { typ: 'textarea', name: 'weitereArbeiten', label: 'Weitere Arbeiten (unter der Liste)' },
      { typ: 'text', name: 'kontaktUeberschrift', label: 'Überschrift „Kontakt“', pflicht: true },
      { typ: 'textarea', name: 'kontaktText', label: 'Text im Kontaktbereich' },
      { typ: 'gruppe', label: 'Erweitert: Text bei Google', felder: [
        { typ: 'text', name: 'seoTitel', label: 'Titel bei Google', max: TITEL_MAX, pflicht: true },
        { typ: 'textarea', name: 'seoBeschreibung', label: 'Beschreibung bei Google', max: BESCHREIBUNG_MAX, pflicht: true },
      ] },
    ],
  },

  'ueber-uns': {
    titel: 'Über uns',
    felder: [
      { typ: 'text', name: 'ueberschrift', label: 'Überschrift', pflicht: true },
      { typ: 'foto', name: 'bild', altName: 'bildAlt', label: 'Foto' },
      { typ: 'textliste', name: 'absaetze', label: 'Text', eintrag: 'Absatz', mehrzeilig: true, pflicht: true },
      { typ: 'text', name: 'unterschrift', label: 'Unterschrift' },
    ],
  },

  orte: {
    titel: 'Einsatzgebiet',
    felder: [
      { typ: 'text', name: 'ueberschrift', label: 'Überschrift', pflicht: true },
      { typ: 'textarea', name: 'vorwort', label: 'Text' },
      { typ: 'objektliste', name: 'zonen', label: 'Zonen', eintrag: 'Zone', titelVon: 'titel', felder: [
        { typ: 'text', name: 'titel', label: 'Titel', pflicht: true },
        { typ: 'text', name: 'entfernung', label: 'Entfernung', hilfe: 'z. B. „bis 25 km“' },
        { typ: 'textarea', name: 'orte', label: 'Orte (mit Komma getrennt)' },
      ] },
    ],
    hinweis: 'Die Karte selbst ändert sich nicht automatisch. Neue Orte erscheinen in der Liste; für einen Punkt auf der Karte bitte den Entwickler fragen.',
  },

  einstellungen: {
    titel: 'Kontaktdaten',
    hinweis: 'Wichtig für Google: Name, Adresse und Telefon genau so schreiben wie im Google-Unternehmensprofil.',
    felder: [
      { typ: 'text', name: 'firma', label: 'Firmenname', pflicht: true },
      { typ: 'text', name: 'inhaber', label: 'Inhaber / Bauleitung', pflicht: true },
      { typ: 'text', name: 'telefonAnzeige', label: 'Telefonnummer', hilfe: 'So wie sie auf der Website stehen soll, z. B. „0461 123 456“.' },
      { typ: 'telefon', name: 'whatsapp', art: 'whatsapp', label: 'WhatsApp-Nummer', hilfe: 'Die Handynummer, auf der Sie WhatsApp haben.' },
      { typ: 'text', name: 'email', label: 'E-Mail' },
      { typ: 'text', name: 'strasse', label: 'Straße und Hausnummer' },
      { typ: 'text', name: 'plz', label: 'PLZ' },
      { typ: 'text', name: 'ort', label: 'Ort', pflicht: true },
      { typ: 'textarea', name: 'einsatzgebiet', label: 'Einsatzgebiet (Bauschild unten)' },
      // Technisches (Domain, Formularziel, Impressum-Links …) pflegt der Entwickler direkt in der Datei
    ],
  },
};

export const seitenPfade = {
  startseite: 'inhalt/startseite.json',
  'ueber-uns': 'inhalt/ueber-uns.json',
  orte: 'inhalt/orte.json',
  einstellungen: 'inhalt/einstellungen.json',
};
