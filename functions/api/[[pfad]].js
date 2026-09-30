// Cloudflare Pages Function: alle Anfragen an /api/* des Dashboards.
// Nötige Umgebungsvariablen (im Cloudflare-Dashboard als „Secrets“ anlegen):
//   CMS_GITHUB_TOKEN    Fine-grained Token, NUR für dieses Repository, Rechte: Contents (Lesen+Schreiben)
//   CMS_GITHUB_REPO     z. B. khaledbakourcoder/checkinterne-website
//   ADMIN_BENUTZER      Benutzername für die Anmeldung im Dashboard
//   ADMIN_PASSWORT      Passwort dazu (mindestens 12 Zeichen)
//   – oder statt Benutzername/Passwort Cloudflare Access: –
//   ACCESS_TEAM_DOMAIN  z. B. checkinterne.cloudflareaccess.com
//   ACCESS_AUD          „Application Audience (AUD) Tag“ der Access-Anwendung
//   ERLAUBTE_EMAILS     Komma-Liste der E-Mail-Adressen mit Zugang
//   CMS_VORSCHAU_URL    optional, Adresse der Entwurfs-Vorschau (z. B. https://entwurf.checkinterne.pages.dev)
import { bearbeite } from '../../cms/kern.js';
import { githubSpeicher } from '../../cms/speicher-github.js';
import { pruefeZugang, anmelden, abmeldeCookie } from '../../cms/zugang.js';
import { CmsFehler } from '../../cms/hilfen.js';

const MAX_BODY = 40 * 1024 * 1024;
const sicher = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex',
};

const MAX_ANMELDE_BODY = 4 * 1024;

const antwortJson = (daten, status, extra = {}) =>
  new Response(JSON.stringify(daten), { status, headers: { ...sicher, 'Content-Type': 'application/json; charset=utf-8', ...extra } });

const liesJson = (request) => request.json().catch(() => { throw new CmsFehler(400, 'Ungültige Daten.'); });

export async function onRequest({ request, env }) {
  try {
    const methode = request.method;
    const pfad = new URL(request.url).pathname;
    let body;
    if (methode !== 'GET') {
      // Schutz gegen Anfragen von fremden Seiten: nur JSON mit eigenem Kopf, gleiche Herkunft
      const herkunft = request.headers.get('Origin');
      if (herkunft && herkunft !== new URL(request.url).origin) throw new CmsFehler(403, 'Anfrage von fremder Seite abgelehnt.');
      if (request.headers.get('X-CMS') !== '1' || !(request.headers.get('Content-Type') ?? '').startsWith('application/json')) {
        throw new CmsFehler(400, 'Ungültige Anfrage.');
      }
    }

    // Anmelden und Abmelden gehen ohne bestehende Anmeldung
    if (methode === 'POST' && pfad === '/api/anmelden') {
      if (Number(request.headers.get('Content-Length') ?? 0) > MAX_ANMELDE_BODY) throw new CmsFehler(413, 'Ungültige Anfrage.');
      const cookie = await anmelden(request, env, await liesJson(request));
      return antwortJson({ ok: true }, 200, { 'Set-Cookie': cookie });
    }
    if (methode === 'POST' && pfad === '/api/abmelden') return antwortJson({ ok: true }, 200, { 'Set-Cookie': abmeldeCookie() });

    const nutzer = await pruefeZugang(request, env);
    if (methode !== 'GET') {
      if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY) throw new CmsFehler(413, 'Zu viele oder zu große Fotos auf einmal.');
      body = await liesJson(request);
    }
    const speicher = githubSpeicher({ token: env.CMS_GITHUB_TOKEN, repo: env.CMS_GITHUB_REPO });
    const ergebnis = await bearbeite(
      { methode, pfad, body },
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
