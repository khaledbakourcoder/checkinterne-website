# Dashboard-UI/UX für Menschen mit wenig Technik-Erfahrung

**Stand:** 30.09.2026 · **Zielgruppe:** Herr Genchev (Inhaber, Handwerker, arbeitet am Laptop, wenig Technik-Erfahrung)
**Zweck:** Recherche, wie ein Dashboard für solche Nutzer aussehen soll – und was das für unser Dashboard (`public/admin/`) bedeutet.

---

## 1. Kurzfassung

Ein Dashboard für Nicht-Techniker ist dann gut, wenn der Nutzer **nichts lernen, nichts behalten und keine Angst haben muss**, etwas kaputt zu machen. Die Forschung (vor allem Nielsen Norman Group und GOV.UK) läuft auf fünf Grundsätze hinaus:

1. **Wenig zeigen:** nur die Aufgaben und Felder, die er wirklich braucht. Alles andere weglassen oder zuklappen.
2. **Seine Sprache sprechen:** Alltagswörter statt Fachbegriffe, Beschriftungen immer sichtbar – auch bei Symbolen.
3. **Immer zeigen, was gerade passiert:** gespeichert oder nicht, online oder nicht, was fehlt.
4. **Fehler verzeihen:** Eingaben in jedem Format annehmen, Fehler klar erklären, alles rückgängig machbar.
5. **Mit dem echten Nutzer testen:** zuschauen, wie Herr Genchev drei Aufgaben erledigt – nicht raten.

---

## 2. Was die Recherche sagt

### 2.1 Weniger ist mehr (Einfachheit, wenige Optionen)
- Weniger Auswahlmöglichkeiten führen zu weniger Fehlern. NN/g empfiehlt ausdrücklich, Nutzern mit geringer Lesekompetenz **weniger Optionen** anzubieten und das **Wichtigste oben** zu platzieren.
- Überladene Bearbeitungsmasken verursachen „Entscheidungsmüdigkeit“. Empfohlen werden **aufklappbare Bereiche, bedingte Felder und Rechte**, damit jeder nur sieht, was er braucht.
- **Schrittweise Offenlegung** (Progressive Disclosure, Nielsen 1995): Seltenes erst auf Wunsch zeigen. Das macht Oberflächen leichter erlernbar und weniger fehleranfällig. **Mehr als zwei Ebenen** (Aufklappen im Aufklappen) verschlechtern die Bedienbarkeit messbar.

### 2.2 Verständliche Sprache
- Keine Fachbegriffe: statt „Node“, „Slug“, „Meta-Description“ lieber Wörter aus dem Alltag des Nutzers.
- Fehlermeldungen auf dem Niveau von **Klasse 7–8** (einfache Sätze), **ohne Fehlercodes**, mit **konkretem Lösungsweg**.
- Knöpfe beschreiben die Handlung („Foto hochladen“, „Speichern“), nicht die Technik.

### 2.3 Symbole brauchen Text
- Fast jedes Symbol ist mehrdeutig. NN/g: **Neben jedem Symbol muss ein sichtbarer Text stehen** – immer, nicht erst beim Darüberfahren (Tooltip).

### 2.4 Wiedererkennen statt Erinnern
- Nutzer sollen Dinge **sehen und wiedererkennen**, statt sie sich merken zu müssen (NN/g-Heuristik). Beispiel: Baustellen mit Vorschaubild statt nur mit Titel auflisten.
- Navigation **immer an derselben Stelle**, mit klar markiertem „Zurück“.

### 2.5 Rückmeldung: Der Nutzer muss immer wissen, was los ist
- „Visibility of System Status“ ist NN/g-Heuristik Nr. 1: Das System informiert zeitnah, was passiert.
- Beim Speichern: **eindeutige Rückmeldung**, dass gespeichert wurde. Die meisten Nutzer gehen davon aus, dass **erst ein Klick auf „Speichern“** etwas ändert – und dass Weggehen ohne Speichern alles verwirft.
- **Nicht mischen:** In einem Formular entweder automatisch speichern oder mit Knopf – nie beides.

### 2.6 Fehler vermeiden und verzeihen
- **Verschiedene Eingabeformate annehmen** (Telefonnummer mit Leerzeichen, Bindestrich, +49 …). Das hilft besonders älteren Nutzern.
- Fehler **erst nach dem Absenden** zeigen, nicht während des Tippens – das stresst (GOV.UK).
- Fehlermeldungen **direkt am betroffenen Feld**, gut sichtbar (fett, Kontrast, rot) – aber **nie nur über Farbe** (Farbenblindheit).
- **Rückgängig ist besser als Nachfragen:** Bestätigungsdialoge unterbrechen, und viele klicken reflexhaft auf „OK“. NN/g: „Gehen Sie große Wege, um Rückgängig anzubieten.“ Wenn doch ein Dialog nötig ist, muss er **genau sagen, was passiert** („Die Änderungen an ‚Balkon …‘ gehen verloren“).
- Rückgängig muss **sichtbar** sein (z. B. Knopf in der Erfolgsmeldung), nicht versteckt in einem Menü oder nur per Tastenkürzel.

### 2.7 Lesbarkeit und Größe
- Schon **ab 40 Jahren** lässt die Sehschärfe nach; kleine Schrift ist in allen NN/g-Studien ein Dauerproblem.
- Empfehlung: **große, gut lesbare Standardschrift** (für den Laptop 17–18 px Fließtext), **hoher Kontrast** (mind. 4,5 : 1 nach WCAG), **keine hellgraue Schrift** für Wichtiges.
- **Große Klickflächen** für Knöpfe und Kästchen – Touchpad-Bedienung ist ungenauer als man denkt.

### 2.8 Vorschau: „Was ich sehe, ist was ich bekomme“
- Für Nicht-Techniker ist die **Vorschau des Ergebnisses** der wichtigste Vertrauensanker. Empfohlen wird eine Bearbeitung, bei der man sieht, wie es auf der Website aussieht.

### 2.9 Hilfe an Ort und Stelle
- **Kurze Hilfetexte direkt am Feld**, Beispiele („z. B. ‚Vorher‘“).
- Eine **kurze Einführung beim ersten Besuch** und ein **Hilfe-Weg zu einem Menschen** (Telefonnummer des Entwicklers).

### 2.10 Mit dem echten Nutzer testen
- Alle Quellen betonen: **echte Nutzer beobachten**. Schon ein Termin, bei dem Herr Genchev ohne Hilfe drei Aufgaben erledigt, deckt die größten Hürden auf.

---

## 3. Abgleich mit unserem Dashboard

| Grundsatz | Stand heute | Bewertung |
|---|---|---|
| Wenige Optionen, nur Bestehendes bearbeiten | 3 Aufgaben auf der Übersicht, kein Anlegen/Löschen, Bewertungen ausgeblendet | ✅ erfüllt |
| Schrittweise Offenlegung, max. 2 Ebenen | Technisches unter „Erweitert“, Tipps für Google zugeklappt | ✅ erfüllt |
| Feste Navigation | Seitenleiste links, aktiver Bereich markiert | ✅ erfüllt |
| Eingaben in jedem Format | Telefonnummern normal eingeben, Umrechnung automatisch | ✅ erfüllt |
| Automatisch ergänzen statt fragen | Bildbeschreibungen, Kurzname, Google-Texte werden erzeugt | ✅ erfüllt |
| Ein Speicher-Muster | Nur „Speichern“-Knopf, speichert und veröffentlicht direkt | ✅ erfüllt |
| Fehler erst nach dem Absenden | Pflichtfelder werden erst beim Speichern geprüft | ✅ erfüllt |
| Symbole mit Text | Listen-Knöpfe sind nur **↑ ↓ ✕** ohne Text | ❌ **fehlt** |
| Fehler am Feld zeigen | Fehler erscheinen nur als Sammelmeldung unten rechts, Feld wird nicht markiert | ❌ **fehlt** |
| Rückgängig sichtbar | Nur im Bereich „Verlauf“; nach dem Speichern kein „Rückgängig“-Knopf | ⚠️ teilweise |
| Klare Rückmeldung | „Gespeichert“ verschwindet nach 5 Sek.; kein dauerhafter Hinweis „ungespeichert/gespeichert“ | ⚠️ teilweise |
| Verständliche Dialoge | Browser-Standarddialog „OK/Abbrechen“ beim Verlassen ohne Speichern | ⚠️ teilweise |
| Lesbarkeit | Fließtext 16 px, Knöpfe 34–42 px hoch | ⚠️ etwas zu klein |
| Wiedererkennen | Baustellen-Liste ohne Vorschaubild | ⚠️ teilweise |
| Vorschau der Seite | Nur Google-Vorschau, keine Vorschau der echten Seite | ⚠️ teilweise |
| Fachbegriffe | Überwiegend Alltagssprache; noch „Erweitert“, „Kurzname für die Filter-Knöpfe“, „Position in der Liste“ | ⚠️ kleine Reste |
| Einführung & Hilfe | Keine Einführung beim ersten Besuch, kein Hilfe-Kontakt | ❌ **fehlt** |
| Test mit dem Kunden | Noch nicht gemacht | ❌ **fehlt** |

---

## 4. Empfehlungen – nach Wichtigkeit

### Muss (vor der Übergabe)
1. **Symbole beschriften:** „↑ Nach oben“, „↓ Nach unten“, „✕ Entfernen“ – oder nur Text.
2. **Fehler am Feld zeigen:** Beim Speichern zum ersten fehlerhaften Feld springen, Feld rot umranden **und** Text darunter („Bitte einen Titel eintragen“). Oben eine kurze Liste mit Sprunglinks (GOV.UK-Muster „Fehlerzusammenfassung“).
3. **Rückgängig direkt nach dem Speichern:** Erfolgsmeldung „Gespeichert – in 1–2 Minuten auf der Website. [Rückgängig]“, die länger stehen bleibt (ca. 15 Sek.).
4. **Dauerhafte Statusanzeige am Speicher-Knopf:** „Nicht gespeicherte Änderungen“ (gelb) bzw. „Gespeichert um 14:32“ (grün).
5. **Test mit Herrn Genchev:** Drei Aufgaben ohne Hilfe – Foto zu einer Baustelle hinzufügen, Telefonnummer ändern, einen Text einer Leistung ändern. Zuschauen, notieren, verbessern.

### Sollte
6. **Größere Schrift und Klickflächen:** Fließtext 17–18 px, Knöpfe mind. 44 px hoch, Kästchen 22–24 px.
7. **Eigener, klarer Dialog statt Browser-Dialog:** „Sie haben noch nicht gespeichert.“ mit den Knöpfen **„Speichern“**, **„Nicht speichern“** und **„Weiter bearbeiten“**.
8. **Vorschaubilder in den Listen** (erstes Foto jeder Baustelle/Leistung).
9. **Begriffe glätten:** „Erweitert“ → „Weitere Einstellungen (selten nötig)“; „Kurzname für die Filter-Knöpfe“ → „Kurzes Wort für die Auswahl-Knöpfe“; „Position in der Liste“ → „Reihenfolge (1 = oben)“.
10. **Hilfe-Kasten in der Seitenleiste:** „Fragen? Anrufen: [Nummer des Entwicklers]“.

### Kann (später)
11. **Echte Seitenvorschau** neben dem Formular (die Seite so zeigen, wie sie aussehen wird).
12. **Kurze Einführung beim ersten Login** (3 Schritte: „Hier wählen Sie aus – hier ändern Sie – hier speichern Sie“), jederzeit wieder aufrufbar.
13. **Fotos per Ziehen & Ablegen** in die Fotoliste zusätzlich zum Knopf.

---

## 5. Was wir bewusst **nicht** machen

- **Kein automatisches Speichern:** Ein Handwerker erwartet einen „Speichern“-Knopf; automatisches Speichern ohne Knopf verunsichert eher (NN/g: Erwartung vor Effizienz). Stattdessen: klarer Knopf + Warnung beim Verlassen.
- **Kein Assistent „eine Frage pro Seite“** (GOV.UK-Muster): passt für einmalige Formulare, nicht zum wiederholten Bearbeiten einer Seite. Wir übernehmen daraus aber: klare Überschriften, ein Thema pro Bereich, Fehler erst nach dem Absenden.
- **Keine Symbole ohne Text, keine Tooltips als einzige Erklärung.**

---

## 6. Quellen

- [NN/g – 10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [NN/g – Visibility of System Status (Heuristik 1)](https://www.nngroup.com/articles/visibility-system-status/)
- [NN/g – User Control and Freedom (Heuristik 3)](https://www.nngroup.com/articles/user-control-and-freedom/)
- [NN/g – Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/)
- [NN/g – 10 Design Guidelines for Reporting Errors in Forms](https://www.nngroup.com/articles/errors-forms-design-guidelines/)
- [NN/g – Confirmation Dialogs Can Prevent User Errors](https://www.nngroup.com/articles/confirmation-dialog/)
- [NN/g – Icon Usability](https://www.nngroup.com/articles/icon-usability/)
- [NN/g – Usability for Older Adults](https://www.nngroup.com/articles/usability-for-senior-citizens/)
- [NN/g – Don’t Prioritize Efficiency Over Expectations](https://www.nngroup.com/articles/efficiency-vs-expectations/)
- [NN/g – Accessibility and Inclusivity: Study Guide](https://www.nngroup.com/articles/accessibility-inclusivity-study-guide/)
- [ACM – Interface design guidelines for low literature users: a literature review](https://dl.acm.org/doi/fullHtml/10.1145/3578837.3578842)
- [GOV.UK Service Manual – Structuring forms](https://www.gov.uk/service-manual/design/form-structure)
- [GOV.UK Design Notes – One thing per page](https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/)
- [Home Office Design – Error messages](https://design.homeoffice.gov.uk/accessibility/interactivity/error-messages)
- [Evolving Web – Content Editor UX: Why CMS Usability Is Tough](https://evolvingweb.com/blog/content-editor-ux-why-cms-usability-tough)
- [TBH Creative – CMS setup for non-technical users](https://www.tbhcreative.com/blog/cms-setup-for-non-technical-users/)
- [Hapy Design – Designing for Users with Low Digital Literacy](https://hapy.design/journal/designing-for-users-with-low-digital-literacy/)
- [Damian Wajer – Autosave or explicit save action](https://www.damianwajer.com/blog/autosave/)
- [Wikipedia – Progressive disclosure](https://en.wikipedia.org/wiki/Progressive_disclosure)
- [PMC – How to design font size for older adults (Literaturübersicht)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9376262/)
