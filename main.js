// Bewertungen: echte Texte von MyHammer (gekürzt), filterbar nach Art der Arbeit.
// art: bad | wand | boden | sanierung | raeumen  (eine Bewertung kann mehrere haben)

const bewertungen = [
  { wer: 'Hans-Juergen, Flensburg', wann: 'Juli 2026', sterne: 5, art: ['sanierung', 'boden', 'wand'],
    arbeit: 'Halbfertige Wohnung fertigstellen',
    text: 'Die Aufgabe war eine halbfertige Wohnung fertigzustellen mit Fußbodenbelag und Malerarbeiten. Alle Arbeiten wurden zügig und zeitnah zu meiner größten Zufriedenheit ausgeführt.' },
  { wer: 'Olja, Flensburg', wann: 'Juni 2026', sterne: 5, art: ['wand'],
    arbeit: 'Speisekammer, Wände und Decken',
    text: 'Einwandfreie Kommunikation, immer erreichbar. Nach jedem Arbeitstag wird aufgeräumt und sauber gemacht. Sehr akkurater Umgang mit den Möbeln und dem Fußboden.' },
  { wer: 'Andra, Wanderup', wann: 'April 2026', sterne: 5, art: ['wand', 'boden'], lang: true,
    arbeit: 'Malerarbeiten und Vinylboden, 60 m²',
    text: 'Wände gespachtelt, geschliffen, mit Vliestapete tapeziert und gestrichen – das Ergebnis ist einfach perfekt. Trotz eines sehr schwierigen Untergrunds wurde der Boden absolut eben hergestellt. Selbst Überstunden wurden in Kauf genommen.' },
  { wer: 'Achim Gehrt, Flensburg', wann: 'Dezember 2025', sterne: 5, art: ['bad', 'sanierung'], lang: true,
    arbeit: 'Badsanierung nach Abwasserschaden',
    text: 'Das Haus ist über hundert Jahre alt, entsprechend schief, und letztendlich kam alles bis aufs Mauerwerk raus. Mit seinem Sohn wurden die Wände in Winkel gebracht und ganz klasse verputzt. Herausgekommen ist ein sehr schönes Badezimmer mit Fliesen 60 × 120.' },
  { wer: 'Finja Grünsch, Kiel', wann: 'Oktober 2025', sterne: 5, art: ['sanierung', 'wand'],
    arbeit: 'Altbau mit Schimmelbefall',
    text: 'Yordan und das Team haben dies sehr ernst genommen und die Ursache behoben, andere Handwerker wollten nur „rübermalen“. Er hat auch seine Mitarbeiter mit Schutzausrüstung geschützt.' },
  { wer: 'Kunde aus Kappeln', wann: 'Januar 2025', sterne: 4, art: ['bad'],
    arbeit: 'Bad fliesen, 8 m²',
    text: 'Handwerklich sehr hochwertig gearbeitet, keinerlei Mängel. Einen Punkt muss ich abziehen, weil es immer wieder Verzögerungen gab – aus einem Monat wurden über zwei.' },
  { wer: 'Kunde aus Boren', wann: 'Oktober 2025', sterne: 5, art: ['sanierung'],
    arbeit: 'Trockenlegung und Schimmelsanierung, 100 m²',
    text: 'Er ist ganz gewiss kein Profitjäger und versucht den besten Preis für seinen Kunden herauszuholen. Ein unerwartet netter Mensch in der oft verrohten Branche.' },
  { wer: 'Kunde aus Handewitt', wann: 'Mai 2025', sterne: 5, art: ['bad'],
    arbeit: 'Badezimmer saniert',
    text: 'Von der ersten Beratung bis zur finalen Umsetzung lief alles sehr gut. Mit viel handwerklichem Können das Beste aus unserem, von der Baufirma verkorksten, Badezimmer rausgeholt!' },
  { wer: 'Kunde aus Flensburg', wann: 'Oktober 2024', sterne: 5, art: ['sanierung'],
    arbeit: '15 Fensterbänke getauscht',
    text: 'Bemerkenswert fand ich, dass er mich selbst auf kleinere Mängel seiner Arbeit angesprochen hat und dann bis in die Abendstunden nachgebessert hat.' },
  { wer: 'Martin, Husum', wann: 'August 2024', sterne: 5, art: ['wand'],
    arbeit: 'Spachteln, Tapezieren, Gipsplatten',
    text: 'Trotz unebenem und schlecht verputztem Untergrund ein richtig gutes Ergebnis. Die Wände, Schrägen und Gauben sind jetzt schön glatt.' },
  { wer: 'Levke Jannichsen, Harrislee', wann: 'September 2025', sterne: 5, art: ['boden'],
    arbeit: 'Klick-Vinyl, 9 m²',
    text: 'Kompetent und sauber gearbeitet. Wir werden sie auf jeden Fall wieder beauftragen.' },
  { wer: 'Kunde aus Flensburg', wann: 'Oktober 2024', sterne: 3, art: ['bad'],
    arbeit: 'Fliesen im Flur und Gäste-WC, 25 m²',
    text: 'Grundsätzlich sind wir mit dem Ergebnis zufrieden. Jedoch benötigt man einen „langen Atem“: Termine wurden nicht eingehalten, andere Aufträge vorgezogen.',
    antwort: 'Die Kundin hat recht, es hat zu lange gedauert. Als Entschädigung haben wir Flur, WC und Treppenhaus kostenlos gestrichen und den Bauschutt kostenlos entsorgt.' },
  { wer: 'Stefanie, Flensburg', wann: 'Juli 2024', sterne: 5, art: ['bad'],
    arbeit: 'Balkon mit Klickfliesen, 5 m²',
    text: 'Jordan hat meinen Balkon komplett gereinigt und dann sehr schön die Fliesen verlegt. Alles an einem Tag und vor allem sehr ordentlich!' },
  { wer: 'Tobias Meier, Hasselberg', wann: 'Juni 2025', sterne: 5, art: ['wand'],
    arbeit: 'Tapeten, Streichen, Deckenvertäfelung',
    text: 'Herr Genchev hat alle Malerarbeiten in vier Räumen sehr ordentlich gemacht. Er hat sogar einige Wochenenden durchgearbeitet.' },
  { wer: 'Thomas, Neumünster', wann: 'Mai 2023', sterne: 5, art: ['boden'],
    arbeit: 'Laminat, 31 m²',
    text: 'Das Laminat wurde gut verlegt und auch die Übergangsleisten, obwohl ursprünglich nicht abgesprochen, noch angebracht – ohne Aufpreis.' },
  { wer: 'Oliver, Stapel', wann: 'Juli 2024', sterne: 2, art: ['wand'],
    arbeit: 'Trockenbau, 40 m²',
    text: 'Die Durchführung lief sehr langsam und es wurde nicht sauber gearbeitet.',
    antwort: 'In 2,5 Tagen wurden 44 m² Gipsplatten verlegt, grundiert und verspachtelt. Die einzelnen Arbeitsschritte haben wir mit Fotos dokumentiert.' },
  { wer: 'Kunde aus Leck', wann: 'April 2025', sterne: 5, art: ['raeumen'],
    arbeit: 'Räumung einer Wohnwand',
    text: 'Schnelle, unkomplizierte Hilfe. Zuverlässig und ordentlich. Meldet sich kurz, wenn die Ankunft sich etwas verzögert.' },
  { wer: 'Kunde aus Glücksburg', wann: 'November 2024', sterne: 5, art: ['raeumen'],
    arbeit: 'Entrümpelung eines Hauses',
    text: 'Hat alles sehr gut geklappt. Sehr freundlicher Service und sehr flexibel.' },
  { wer: 'Wibke Brenneke', wann: 'März 2023', sterne: 5, art: ['sanierung', 'bad'],
    arbeit: 'Komplette Wohnung saniert',
    text: 'Fliesen und Wände raus, Elektrik und Sanitär komplett neu. Wir brauchten nur sagen, wie wir uns das vorstellen, und die Firma hat es umgesetzt.' },
  { wer: 'Kunde aus Gettorf', wann: 'Dezember 2024', sterne: 1, art: ['bad', 'sanierung'],
    arbeit: 'Innenausbau, mehrere Räume',
    text: 'Hat Fliesen im falschen Verbund verlegt und weigerte sich, Fehler zu korrigieren.',
    antwort: 'Offene Rechnungen aus früheren Arbeiten wurden nicht bezahlt, daraufhin haben wir die Arbeiten eingestellt.' },
];

const wand = document.getElementById('zettelwand');
const mehr = document.getElementById('mehr');
const ANFANG = 6;
let art = 'alle';
let alles = false;

// Jeder Zettel hängt etwas anders – fest pro Position, damit es beim Filtern nicht springt
const dreh = [-1.2, 0.8, -0.4, 1.5, -0.9, 0.3, 1.1, -1.6, 0.6, -0.2];
const kreppX = ['38%', '12%', '62%', '30%', '52%', '20%'];

const sterneHtml = (n) => '★'.repeat(n) + `<span class="leer">${'★'.repeat(5 - n)}</span>`;

function zeigen() {
  const liste = bewertungen.filter((b) => art === 'alle' || b.art.includes(art));
  const sichtbar = alles ? liste : liste.slice(0, ANFANG);
  wand.innerHTML = sichtbar.map((b, i) => `
    <blockquote class="zettel${b.lang ? ' lang' : ''}" style="--dreh:${dreh[i % dreh.length]}deg;--krepp-x:${kreppX[i % kreppX.length]};--krepp-dreh:${i % 2 ? 4 : -3}deg">
      <p class="z-sterne" aria-label="${b.sterne} von 5 Sternen">${sterneHtml(b.sterne)}</p>
      <p class="z-arbeit">${b.arbeit}</p>
      <p class="z-text">„${b.text}“</p>
      <footer>${b.wer} · ${b.wann}</footer>
      ${b.antwort ? `<p class="z-antwort"><b>Unsere Antwort:</b> ${b.antwort}</p>` : ''}
    </blockquote>`).join('');
  mehr.hidden = alles || liste.length <= ANFANG;
  mehr.textContent = `Weitere ${liste.length - ANFANG} Bewertungen zeigen`;
}

if (wand) {
  document.querySelectorAll('.filter button').forEach((btn) => {
    btn.addEventListener('click', () => {
      art = btn.dataset.art;
      alles = false;
      document.querySelectorAll('.filter button').forEach((b) => b.setAttribute('aria-pressed', b === btn));
      zeigen();
    });
  });
  mehr.addEventListener('click', () => { alles = true; zeigen(); });
  zeigen();
}

// Karte auf dem Handy so vorscrollen, dass Flensburg im Bild ist
const karte = document.getElementById('karte');
if (karte && karte.scrollWidth > karte.clientWidth) {
  karte.scrollLeft = (karte.scrollWidth - karte.clientWidth) * 0.45;
}
