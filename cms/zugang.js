// Prüft das Token von Cloudflare Access (Login per E-Mail-Code).
// Cloudflare Access sperrt /admin und /api schon am Rand des Netzes. Diese Prüfung ist die zweite Sicherung:
// Ohne gültiges, signiertes Token – oder wenn die Konfiguration fehlt – wird der Zugriff verweigert.
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

// env: ACCESS_TEAM_DOMAIN (z. B. checkinterne.cloudflareaccess.com), ACCESS_AUD, ERLAUBTE_EMAILS (Komma-Liste)
export async function pruefeZugang(request, env) {
  const team = env.ACCESS_TEAM_DOMAIN;
  const aud = env.ACCESS_AUD;
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
