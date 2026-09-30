// Zweite Sicherung für die Dashboard-Dateien unter /admin/: ohne gültige Cloudflare-Access-Anmeldung
// wird nichts ausgeliefert – auch dann nicht, wenn die Access-Regel versehentlich fehlt.
import { pruefeZugang } from '../../cms/zugang.js';

export async function onRequest({ request, env, next }) {
  try {
    await pruefeZugang(request, env);
  } catch (e) {
    return new Response(`Kein Zugang: ${e.message}`, {
      status: e.status ?? 401,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex',
        // Testmodus: Browser zeigt sein Anmeldefenster
        ...(e.basic ? { 'WWW-Authenticate': 'Basic realm="Checkinterne Dashboard", charset="UTF-8"' } : {}),
      },
    });
  }
  const antwort = await next();
  const kopie = new Response(antwort.body, antwort);
  kopie.headers.set('Cache-Control', 'no-store');
  kopie.headers.set('X-Robots-Tag', 'noindex');
  kopie.headers.set('X-Frame-Options', 'DENY');
  kopie.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'");
  return kopie;
}
