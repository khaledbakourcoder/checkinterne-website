// Was im Dashboard bearbeitet werden kann – Abschnitte, Felder, Beschriftungen, Hilfetexte.
// Nur bestehende Inhalte: Neue Seiten legt der Entwickler an, Bewertungen kommen später per API.
// Feldtypen: text, textarea, telefon, zahl, schalter, auswahl, mehrfach, textliste, objektliste, foto, fotoliste, fotos-fest
// Jede Seite besteht aus Abschnitten (eigene Karte mit Symbol und Überschrift), damit klar ist, was zusammengehört.
import { TITEL_MAX, BESCHREIBUNG_MAX } from './seo.js';

const leistungsOptionen = (ctx) => ctx.leistungen.map((l) => ({ wert: l.id, label: l.name }));

const abschnitt = (symbol, titel, text, felder, { zugeklappt = false } = {}) => ({ typ: 'abschnitt', symbol, titel, text, felder, zugeklappt });

// Alles Technische steht zugeklappt ganz unten – im Alltag braucht man es nicht.
const selten = (hilfeTitel, ...zusatz) => abschnitt('zahnrad', 'Weitere Einstellungen', 'Selten nötig. Kann leer bleiben.', [
  ...zusatz,
  { typ: 'zahl', name: 'reihenfolge', label: 'Reihenfolge in der Liste', hilfe: '1 = ganz oben.' },
  { typ: 'text', name: 'seoTitel', label: 'Eigener Titel bei Google', max: TITEL_MAX, hilfe: hilfeTitel },
  { typ: 'textarea', name: 'seoBeschreibung', label: 'Eigene Beschreibung bei Google', max: BESCHREIBUNG_MAX, hilfe: 'Leer lassen = wird aus dem ersten Absatz genommen.' },
], { zugeklappt: true });

export const definitionen = {
  leistung: {
    titel: 'Leistung',
    felder: [
      abschnitt('titel', 'Name und Überschrift', 'So heißt die Leistung auf der Website.', [
        { typ: 'text', name: 'name', label: 'Name der Leistung', pflicht: true, hilfe: 'So, wie Kunden danach suchen – z. B. „Badsanierung“.' },
        { typ: 'text', name: 'ueberschrift', label: 'Überschrift der Seite', pflicht: true, hilfe: 'Mit Ort, z. B. „Badsanierung in Flensburg und Umgebung“.' },
        { typ: 'textarea', name: 'kurz', label: 'Ein Satz für die Startseite', pflicht: true, hilfe: 'Steht auf der Startseite in der Liste der Leistungen.' },
      ]),
      abschnitt('text', 'Text der Seite', 'Was Besucher auf der Seite lesen.', [
        { typ: 'textliste', name: 'einleitung', label: 'Absätze', eintrag: 'Absatz', mehrzeilig: true, pflicht: true, hilfe: 'In eigenen Worten: Was machen Sie, worauf kommt es an, wie läuft es ab?' },
      ]),
      abschnitt('liste', 'Was wir dabei machen', 'Kurze Aufzählung, ein Punkt pro Zeile.', [
        { typ: 'textliste', name: 'leistungsliste', label: 'Punkte', eintrag: 'Punkt' },
      ]),
      abschnitt('foto', 'Fotos', 'Bilder zu dieser Leistung.', [
        { typ: 'fotoliste', name: 'bilder', label: 'Fotos', mitBeschriftung: true },
      ]),
      abschnitt('frage', 'Häufige Fragen', 'Fragen, die Kunden oft stellen – mit Ihrer Antwort.', [
        { typ: 'objektliste', name: 'fragen', label: 'Fragen', eintrag: 'Frage', titelVon: 'frage', felder: [
          { typ: 'text', name: 'frage', label: 'Frage', pflicht: true },
          { typ: 'textarea', name: 'antwort', label: 'Antwort', pflicht: true },
        ] },
      ]),
      selten('Leer lassen = „Überschrift – Firmenname“.',
        { typ: 'text', name: 'kurzname', label: 'Kurzes Wort für die Auswahl-Knöpfe', hilfe: 'Ein Wort, z. B. „Bad“. Leer lassen = erstes Wort des Namens.' }),
    ],
  },

  projekt: {
    titel: 'Baustelle',
    felder: [
      abschnitt('titel', 'Titel und Ort', 'Worum ging es, und wo war die Baustelle?', [
        { typ: 'text', name: 'titel', label: 'Titel', pflicht: true, hilfe: 'Was war das? z. B. „Bad im Altbau komplett erneuert“.' },
        { typ: 'text', name: 'ort', label: 'Ort', hilfe: 'z. B. „Flensburg“ oder „Kappeln“. Keine Straße (Datenschutz der Kunden).' },
      ]),
      abschnitt('etikett', 'Zugehörige Leistungen', 'Haken setzen: Zu welchen Leistungen passt diese Baustelle? Sie erscheint dann auch auf diesen Leistungsseiten.', [
        { typ: 'mehrfach', name: 'leistungen', label: 'Leistungen', pflicht: true, optionen: leistungsOptionen },
      ]),
      abschnitt('text', 'Beschreibung', 'Was Besucher über die Baustelle lesen.', [
        { typ: 'textliste', name: 'absaetze', label: 'Absätze', eintrag: 'Absatz', mehrzeilig: true, pflicht: true, hilfe: 'Wie sah es vorher aus? Was haben Sie gemacht? Was war schwierig?' },
      ]),
      abschnitt('foto', 'Fotos', 'In der Reihenfolge der Arbeit: zuerst „Vorher“, zuletzt „Fertig“.', [
        { typ: 'fotoliste', name: 'bilder', label: 'Fotos', mitBeschriftung: true, pflicht: true },
      ]),
      abschnitt('stern', 'Startseite', 'Soll diese Baustelle auch auf der Startseite zu sehen sein?', [
        { typ: 'schalter', name: 'aufStartseite', label: 'Auch auf der Startseite zeigen', hilfe: 'Ohne Haken ist sie nur auf ihrer eigenen Seite und bei den Leistungen zu sehen.' },
      ]),
      selten('Leer lassen = „Titel in Ort – Firmenname“.'),
    ],
  },

  startseite: {
    titel: 'Startseite',
    hinweis: 'Die Abschnitte stehen in derselben Reihenfolge wie auf der Startseite – von oben nach unten.',
    felder: [
      abschnitt('startseite', 'Ganz oben', 'Das Erste, was Besucher sehen.', [
        { typ: 'text', name: 'ueberschrift', label: 'Große Überschrift', pflicht: true },
        { typ: 'textarea', name: 'einleitung', label: 'Text darunter' },
        { typ: 'fotos-fest', name: 'pinnwand', label: 'Die drei Fotos oben', anzahl: 3, hilfe: 'Links groß (Hochformat), rechts zwei quadratische.' },
      ]),
      abschnitt('baustelle', 'Bereich „Baustellen“', 'Die Baustellen selbst bearbeiten Sie links unter „Baustellen“.', [
        { typ: 'text', name: 'baustellenUeberschrift', label: 'Überschrift', pflicht: true },
        { typ: 'textarea', name: 'baustellenVorwort', label: 'Text unter der Überschrift' },
        { typ: 'textarea', name: 'altbauText', label: 'Text über den Altbau-Fotos' },
        { typ: 'fotoliste', name: 'altbauBilder', label: 'Altbau-Fotos', mitBeschriftung: false },
      ]),
      abschnitt('werkzeug', 'Bereich „Leistungen“', 'Die Liste der Leistungen kommt automatisch aus „Leistungen“.', [
        { typ: 'text', name: 'leistungenUeberschrift', label: 'Überschrift', pflicht: true },
        { typ: 'textarea', name: 'weitereArbeiten', label: 'Text unter der Liste', hilfe: 'z. B. weitere Arbeiten, die keine eigene Seite haben.' },
      ]),
      abschnitt('telefon', 'Bereich „Kontakt“', 'Ganz unten auf der Startseite. Telefonnummer und Adresse ändern Sie unter „Kontaktdaten“.', [
        { typ: 'text', name: 'kontaktUeberschrift', label: 'Überschrift', pflicht: true },
        { typ: 'textarea', name: 'kontaktText', label: 'Text' },
      ]),
      abschnitt('lupe', 'Text bei Google', 'So erscheint die Startseite in den Suchergebnissen.', [
        { typ: 'text', name: 'seoTitel', label: 'Titel bei Google', max: TITEL_MAX, pflicht: true },
        { typ: 'textarea', name: 'seoBeschreibung', label: 'Beschreibung bei Google', max: BESCHREIBUNG_MAX, pflicht: true },
      ], { zugeklappt: true }),
    ],
  },

  'ueber-uns': {
    titel: 'Über uns',
    felder: [
      abschnitt('text', 'Text', 'Wer Sie sind und wie Sie arbeiten.', [
        { typ: 'text', name: 'ueberschrift', label: 'Überschrift', pflicht: true },
        { typ: 'textliste', name: 'absaetze', label: 'Absätze', eintrag: 'Absatz', mehrzeilig: true, pflicht: true },
        { typ: 'text', name: 'unterschrift', label: 'Unterschrift', hilfe: 'Steht unter dem Text, z. B. Ihr Name.' },
      ]),
      abschnitt('person', 'Foto', 'Ein Foto von Ihnen oder Ihrem Team.', [
        { typ: 'foto', name: 'bild', altName: 'bildAlt', label: 'Foto' },
      ]),
    ],
  },

  orte: {
    titel: 'Einsatzgebiet',
    hinweis: 'Die Karte selbst ändert sich nicht automatisch. Neue Orte erscheinen in der Liste; für einen Punkt auf der Karte bitte den Entwickler fragen.',
    felder: [
      abschnitt('text', 'Überschrift und Text', 'Steht über der Karte.', [
        { typ: 'text', name: 'ueberschrift', label: 'Überschrift', pflicht: true },
        { typ: 'textarea', name: 'vorwort', label: 'Text' },
      ]),
      abschnitt('karte', 'Zonen', 'Gruppen von Orten nach Entfernung, z. B. „Flensburg und direkt drumherum“.', [
        { typ: 'objektliste', name: 'zonen', label: 'Zonen', eintrag: 'Zone', titelVon: 'titel', felder: [
          { typ: 'text', name: 'titel', label: 'Name der Zone', pflicht: true },
          { typ: 'text', name: 'entfernung', label: 'Entfernung', hilfe: 'z. B. „bis 25 km“' },
          { typ: 'textarea', name: 'orte', label: 'Orte (mit Komma getrennt)' },
        ] },
      ]),
    ],
  },

  einstellungen: {
    titel: 'Kontaktdaten',
    hinweis: 'Wichtig für Google: Name, Adresse und Telefon genau so schreiben wie im Google-Unternehmensprofil.',
    felder: [
      abschnitt('firma', 'Firma', 'Steht unten auf jeder Seite (Bauschild).', [
        { typ: 'text', name: 'firma', label: 'Firmenname', pflicht: true },
        { typ: 'text', name: 'inhaber', label: 'Inhaber / Bauleitung', pflicht: true },
      ]),
      abschnitt('telefon', 'Telefon, WhatsApp und E-Mail', 'Hierüber melden sich die Kunden.', [
        { typ: 'text', name: 'telefonAnzeige', label: 'Telefonnummer', hilfe: 'So wie sie auf der Website stehen soll, z. B. „0461 123 456“.' },
        { typ: 'telefon', name: 'whatsapp', art: 'whatsapp', label: 'WhatsApp-Nummer', hilfe: 'Die Handynummer, auf der Sie WhatsApp haben.' },
        { typ: 'text', name: 'email', label: 'E-Mail' },
      ]),
      abschnitt('ort', 'Adresse und Einsatzgebiet', 'Wo die Firma sitzt und wo Sie arbeiten.', [
        { typ: 'text', name: 'strasse', label: 'Straße und Hausnummer' },
        { typ: 'text', name: 'plz', label: 'PLZ' },
        { typ: 'text', name: 'ort', label: 'Ort', pflicht: true },
        { typ: 'textarea', name: 'einsatzgebiet', label: 'Einsatzgebiet', hilfe: 'Steht unten auf jeder Seite, z. B. „Flensburg und 60 km Umkreis“.' },
      ]),
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
