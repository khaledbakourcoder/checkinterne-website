// Cloudflare Pages Function: alle Anfragen an /api/* des Dashboards.
// Nötige Umgebungsvariablen (im Cloudflare-Dashboard als „Secrets“ anlegen):
//   GITHUB_TOKEN        Fine-grained Token, NUR für dieses Repository, Rechte: Contents (Lesen+Schreiben)
//   GITHUB_REPO         z. B. khaledbakourcoder/checkinterne-website
//   ACCESS_TEAM_DOMAIN  z. B. checkinterne.cloudflareaccess.com
//   ACCESS_AUD          „Application Audience (AUD) Tag“ der Access-Anwendung
//   ERLAUBTE_EMAILS     Komma-Liste der E-Mail-Adressen mit Zugang
//   CMS_VORSCHAU_URL    optional, Adresse der Entwurfs-Vorschau (z. B. https://entwurf.checkinterne.pages.dev)
import { bearbeite } from '../../cms/kern.js';
import { githubSpeicher } from '../../cms/speicher-github.js';
import { pruefeZugang } from '../../cms/zugang.js';
import { CmsFehler } from '../../cms/hilfen.js';

const MAX_BODY = 40 * 1024 * 1024;
const sicher = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex',
};

const antwortJson = (daten, status) =>
  new Response(JSON.stringify(daten), { status, headers: { ...sicher, 'Content-Type': 'application/json; charset=utf-8' } });

export async function onRequest({ request, env }) {
  try {
    const nutzer = await pruefeZugang(request, env);
    const methode = request.method;
    let body;
    if (methode !== 'GET') {
      // Schutz gegen Anfragen von fremden Seiten: nur JSON mit eigenem Kopf, gleiche Herkunft
      const herkunft = request.headers.get('Origin');
      if (herkunft && herkunft !== new URL(request.url).origin) throw new CmsFehler(403, 'Anfrage von fremder Seite abgelehnt.');
      if (request.headers.get('X-CMS') !== '1' || !(request.headers.get('Content-Type') ?? '').startsWith('application/json')) {
        throw new CmsFehler(400, 'Ungültige Anfrage.');
      }
      if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY) throw new CmsFehler(413, 'Zu viele oder zu große Fotos auf einmal.');
      body = await request.json().catch(() => { throw new CmsFehler(400, 'Ungültige Daten.'); });
    }
    const speicher = githubSpeicher({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO });
    const ergebnis = await bearbeite(
      { methode, pfad: new URL(request.url).pathname, body },
      { speicher, nutzer, vorschauUrl: env.CMS_VORSCHAU_URL ?? '' },
    );
    if (ergebnis.bytes) {
      return new Response(ergebnis.bytes, { status: ergebnis.status, headers: { ...sicher, 'Content-Type': ergebnis.typ, 'Cache-Control': 'private, max-age=3600' } });
    }
    return antwortJson(ergebnis.json, ergebnis.status);
  } catch (e) {
    if (e instanceof CmsFehler) return antwortJson({ fehler: e.message }, e.status);
    console.error(e);
    return antwortJson({ fehler: 'Interner Fehler.' }, 500);
  }
}
