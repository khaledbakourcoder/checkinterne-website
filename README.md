# Checkinterne GmbH – Website mit eigenem Dashboard

Statische Website (Astro) plus ein einfaches Dashboard, mit dem der Kunde Texte, Fotos, Baustellen,
Leistungen und Bewertungen selbst pflegt. Die öffentliche Seite bleibt rein statisch und schnell.

```
admin.checkinterne.de/admin/  ── Login: Cloudflare Access (E-Mail + Code)
        │  Dashboard speichert als Commit (GitHub-API) auf den Branch „entwurf“
        ▼
GitHub-Repo ── „Veröffentlichen“ spult main auf entwurf vor
        ▼
Cloudflare Pages baut main (Astro) ──► www.checkinterne.de
```

## Aufbau

| Ordner | Inhalt |
|---|---|
| `inhalt/` | Alle Inhalte als JSON – das bearbeitet das Dashboard |
| `src/assets/bilder/` | Fotos (Build erzeugt AVIF/WebP in passenden Größen) |
| `src/lib/inhalt.ts` | Lädt und prüft alle Inhalte beim Build (fehlerhafte Inhalte → Build bricht ab, alte Version bleibt online) |
| `src/pages/` | Startseite, Leistungsseiten `/[leistung]/`, Baustellen `/projekte/[projekt]/`, Sitemap, robots.txt |
| `public/admin/` | Dashboard (reines HTML/JS, kein Framework) |
| `functions/` | Cloudflare Pages Functions: `/api/*` und Schutz für `/admin/*` |
| `cms/` | Server-Logik (Prüfung, GitHub-Speicher, Zugangsprüfung, lokaler Server) |

## Lokal arbeiten

```bash
npm install
npm run dev      # Website: http://localhost:4321 (zeigt auch Entwürfe)
npm run cms      # Dashboard: http://127.0.0.1:4322/admin/ (schreibt direkt in inhalt/, ohne Login)
```

## Online einrichten (einmalig)

1. **Cloudflare Pages** mit dem GitHub-Repo verbinden. Build-Befehl `npm run build`, Ausgabe `dist`, Produktions-Branch `main`.
   Für Vorschau-Builds (Branch `entwurf`) die Variable `PUBLIC_ENTWUERFE_ZEIGEN=ja` setzen.
2. **GitHub-Token** (fine-grained): nur dieses Repository, Berechtigung *Contents: Read and write*.
3. **Cloudflare Access** (Zero Trust, kostenlos bis 50 Nutzer): Anwendung für `…/admin` und `…/api` anlegen,
   Login per „One-time PIN“ (E-Mail-Code), nur die E-Mail des Kunden (und die eigene) erlauben.
4. **Variablen/Secrets** im Pages-Projekt:
   `CMS_GITHUB_TOKEN`, `CMS_GITHUB_REPO` (z. B. `khaledbakourcoder/checkinterne-website`) – Cloudflare verbietet Namen, die mit `GITHUB_` beginnen –
   `ACCESS_TEAM_DOMAIN` (z. B. `checkinterne.cloudflareaccess.com`), `ACCESS_AUD` (AUD-Tag der Access-Anwendung),
   `ERLAUBTE_EMAILS` (Komma-Liste), optional `CMS_VORSCHAU_URL` (Adresse des `entwurf`-Vorschau-Builds).

Ohne diese Variablen verweigert das Dashboard jeden Zugriff (fail closed).

**Testmodus ohne Access:** Statt der drei `ACCESS_*`/`ERLAUBTE_EMAILS`-Variablen nur `TEST_PASSWORT` (mind. 12 Zeichen)
setzen. Dann fragt der Browser beim Öffnen von `/admin/` nach Benutzername (beliebig) und Passwort.
Sobald `ACCESS_TEAM_DOMAIN` oder `ACCESS_AUD` gesetzt ist, gilt nur noch Access – vor dem Livegang umstellen.

## Was der Kunde im Dashboard darf

- **Nur Vorhandenes bearbeiten:** Texte und Fotos der bestehenden Baustellen, Leistungen, Startseite, Über uns, Einsatzgebiet und Kontaktdaten.
- **Nicht:** neue Seiten anlegen, Seiten löschen, Adressen ändern, Bewertungen oder Weiterleitungen bearbeiten. Das prüft der Server (`cms/kern.js`), nicht nur die Oberfläche.
- **Speichern = sofort veröffentlichen.** Rückgängig machen geht über „Verlauf“.
- Neue Leistungen/Baustellen legt der Entwickler als JSON-Datei in `inhalt/` an. Bewertungen sollen später automatisch per API kommen.

## Sicherheit

- Login übernimmt Cloudflare Access; die Functions prüfen zusätzlich Signatur, Aussteller, Ablauf und Zielgruppe des Tokens sowie die E-Mail-Liste.
- Das Dashboard darf nur `inhalt/*.json` und Fotos in `src/assets/bilder/` schreiben; Fotos werden am Dateiinhalt als JPEG/PNG/WebP erkannt.
- Vor jedem Speichern wird der gesamte Inhalt nach der Änderung geprüft (auch Verweise zwischen Dateien).
- Alle Texte werden beim Rendern maskiert; Nutzereingaben landen nie als HTML in der Seite.

## Vor dem Livegang

- Telefon, WhatsApp, E-Mail und Formularziel eintragen (Dashboard → Kontaktdaten)
- Impressum und Datenschutzerklärung ergänzen
- Schrift lokal hosten statt über Google Fonts (DSGVO)
- Leistungsseiten mit dem Kunden durchgehen und online stellen (Ampel muss grün/gelb sein)
