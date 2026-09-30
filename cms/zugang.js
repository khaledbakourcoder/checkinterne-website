// Zugang zum Dashboard: Benutzername + Passwort (eigene Anmeldeseite) oder wahlweise Cloudflare Access.
// Ohne gültige Anmeldung – oder wenn die Konfiguration fehlt – wird der Zugriff verweigert (fail closed).
import { CmsFehler } from './hilfen.js';

const schluesselCache = new Map(); // team -> { zeit, schluessel: Map<kid, CryptoKey> }

function base64url(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function schluessel(team, kid) {
  const cache = schluesselCache.get(team);
  if (cache && cache.schluessel.has(kid) && Date.now() - cache.zeit < 3600_000) return cache.schluessel.get(kid);
  const antwort = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!antwort.ok) throw new CmsFehler(503, 'Anmeldedienst nicht erreichbar.');
  const { keys } = await antwort.json();
  const map = new Map();
  for (const jwk of keys) {
    map.set(jwk.kid, await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
  }
  schluesselCache.set(team, { zeit: Date.now(), schluessel: map });
  return map.get(kid);
}

function tokenAus(request) {
  const kopf = request.headers.get('Cf-Access-Jwt-Assertion');
  if (kopf) return kopf;
  const cookie = request.headers.get('Cookie') ?? '';
  return cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1] ?? null;
}

// Vergleich über SHA-256, damit die Laufzeit nichts über das Passwort verrät
async function gleich(a, b) {
  const [x, y] = await Promise.all([a, b].map((t) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))));
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}

// ---------- Anmeldung mit Benutzername und Passwort (eigene Anmeldeseite) ----------
// Benutzername und Passwort stehen als Secrets beim Hoster (ADMIN_BENUTZER, ADMIN_PASSWORT), nie im Code.
// Nach der Anmeldung trägt ein signiertes Cookie „wer, bis wann“. Der Schlüssel wird aus Benutzer und
// Passwort abgeleitet – wer das Passwort ändert, meldet damit automatisch alle Geräte ab.
const COOKIE = 'cms_sitzung';
const SITZUNG_SEKUNDEN = 7 * 24 * 3600;
export const MIN_PASSWORT = 12;
const MAX_FEHLVERSUCHE = 5;
const SPERRE_MS = 15 * 60 * 1000;
const kodiere = new TextEncoder();

const zuBase64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const passwortModus = (env) => Boolean((env.ADMIN_BENUTZER ?? '').trim() && (env.ADMIN_PASSWORT ?? '').length >= MIN_PASSWORT);
const bitteAnmelden = () => Object.assign(new CmsFehler(401, 'Bitte anmelden.'), { anmeldung: true });

async function signiere(env, text) {
  const roh = await crypto.subtle.digest('SHA-256', kodiere.encode(`cms-sitzung\n${env.ADMIN_BENUTZER}\n${env.ADMIN_PASSWORT}`));
  const key = await crypto.subtle.importKey('raw', roh, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return zuBase64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, kodiere.encode(text))));
}

async function pruefeSitzung(request, env) {
  const wert = (request.headers.get('Cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))?.[1];
  const teile = wert?.split('.') ?? [];
  if (teile.length !== 3 || !/^\d+$/.test(teile[1])) throw bitteAnmelden();
  const [benutzerTeil, ablauf, sig] = teile;
  if (Number(ablauf) < Math.floor(Date.now() / 1000)) throw bitteAnmelden();
  if (!(await gleich(sig, await signiere(env, `${benutzerTeil}.${ablauf}`)))) throw bitteAnmelden();
  let benutzer;
  try { benutzer = new TextDecoder().decode(base64url(benutzerTeil)); } catch { throw bitteAnmelden(); }
  if (benutzer !== env.ADMIN_BENUTZER.trim()) throw bitteAnmelden();
  return { email: `${benutzer}@dashboard` };
}

// Fehlversuche je IP (pro Server-Instanz – bremst Durchprobieren, zusammen mit Pause und langem Passwort)
const fehlversuche = new Map();
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// Gibt bei Erfolg den Set-Cookie-Wert zurück
export async function anmelden(request, env, { benutzer, passwort } = {}) {
  if (env.ACCESS_TEAM_DOMAIN || env.ACCESS_AUD) throw new CmsFehler(400, 'Die Anmeldung läuft über Cloudflare Access.');
  if (!passwortModus(env)) throw new CmsFehler(503, 'Dashboard ist noch nicht eingerichtet (Zugangsdaten fehlen).');
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unbekannt';
  const jetzt = Date.now();
  const eintrag = fehlversuche.get(ip);
  if (eintrag && eintrag.bis > jetzt && eintrag.anzahl >= MAX_FEHLVERSUCHE) {
    throw new CmsFehler(429, 'Zu viele falsche Versuche. Bitte in 15 Minuten noch einmal probieren.');
  }
  // Beide Vergleiche immer ausführen, damit die Antwortzeit nichts verrät
  const nameOk = await gleich(String(benutzer ?? '').trim(), env.ADMIN_BENUTZER.trim());
  const passwortOk = await gleich(String(passwort ?? ''), env.ADMIN_PASSWORT);
  if (!nameOk || !passwortOk) {
    const neu = eintrag && eintrag.bis > jetzt ? eintrag : { anzahl: 0, bis: jetzt + SPERRE_MS };
    neu.anzahl += 1;
    fehlversuche.set(ip, neu);
    await warte(700);
    throw new CmsFehler(401, 'Benutzername oder Passwort ist falsch.');
  }
  fehlversuche.delete(ip);
  const benutzerTeil = zuBase64url(kodiere.encode(env.ADMIN_BENUTZER.trim()));
  const ablauf = Math.floor(jetzt / 1000) + SITZUNG_SEKUNDEN;
  const sig = await signiere(env, `${benutzerTeil}.${ablauf}`);
  return `${COOKIE}=${benutzerTeil}.${ablauf}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SITZUNG_SEKUNDEN}`;
}

export const abmeldeCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

// Welche Anmeldung gilt:
//   Cloudflare Access, wenn ACCESS_TEAM_DOMAIN/ACCESS_AUD gesetzt sind (dazu ERLAUBTE_EMAILS),
//   sonst Benutzername + Passwort (ADMIN_BENUTZER, ADMIN_PASSWORT mit mind. 12 Zeichen).
//   Fehlt beides, bleibt alles gesperrt.
export async function pruefeZugang(request, env) {
  const team = env.ACCESS_TEAM_DOMAIN;
  const aud = env.ACCESS_AUD;
  if (!team && !aud) {
    if (passwortModus(env)) return pruefeSitzung(request, env);
    throw new CmsFehler(503, 'Dashboard ist noch nicht eingerichtet (Zugangsdaten fehlen).');
  }
  const erlaubt = (env.ERLAUBTE_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!team || !aud || !erlaubt.length) throw new CmsFehler(503, 'Dashboard ist noch nicht eingerichtet (Zugangsdaten fehlen).');

  const token = tokenAus(request);
  if (!token) throw new CmsFehler(401, 'Bitte anmelden.');
  const teile = token.split('.');
  if (teile.length !== 3) throw new CmsFehler(401, 'Anmeldung ungültig.');

  let kopf, daten;
  try {
    kopf = JSON.parse(new TextDecoder().decode(base64url(teile[0])));
    daten = JSON.parse(new TextDecoder().decode(base64url(teile[1])));
  } catch {
    throw new CmsFehler(401, 'Anmeldung ungültig.');
  }
  if (kopf.alg !== 'RS256' || !kopf.kid) throw new CmsFehler(401, 'Anmeldung ungültig.');

  const key = await schluessel(team, kopf.kid);
  if (!key) throw new CmsFehler(401, 'Anmeldung ungültig.');
  const gueltig = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64url(teile[2]), new TextEncoder().encode(`${teile[0]}.${teile[1]}`));
  if (!gueltig) throw new CmsFehler(401, 'Anmeldung ungültig.');

  const jetzt = Math.floor(Date.now() / 1000);
  const auds = Array.isArray(daten.aud) ? daten.aud : [daten.aud];
  if (!auds.includes(aud)) throw new CmsFehler(401, 'Anmeldung gehört zu einer anderen Anwendung.');
  if (daten.iss !== `https://${team}`) throw new CmsFehler(401, 'Anmeldung ungültig.');
  if (typeof daten.exp !== 'number' || daten.exp < jetzt) throw new CmsFehler(401, 'Anmeldung abgelaufen. Bitte neu anmelden.');
  if (typeof daten.nbf === 'number' && daten.nbf > jetzt + 60) throw new CmsFehler(401, 'Anmeldung ungültig.');

  const email = String(daten.email ?? '').toLowerCase();
  if (!erlaubt.includes(email)) throw new CmsFehler(403, 'Diese E-Mail-Adresse hat keinen Zugang.');
  return { email };
}
