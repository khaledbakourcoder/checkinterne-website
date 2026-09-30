// Zweite Sicherung für die Dashboard-Dateien unter /admin/: ohne gültige Anmeldung wird nichts ausgeliefert.
// Nur die Anmeldeseite selbst (mit Stil und Skript) ist ohne Anmeldung erreichbar.
import { pruefeZugang } from '../../cms/zugang.js';

// Cloudflare Pages liefert „anmelden.html“ unter „/admin/anmelden“ aus – beide Schreibweisen zulassen
const OFFEN = new Set(['/admin/anmelden', '/admin/anmelden.js', '/admin/admin.css']);

export async function onRequest({ request, env, next }) {
  const pfad = new URL(request.url).pathname.replace(/\.html$/, '');
  if (!OFFEN.has(pfad)) {
    try {
      await pruefeZugang(request, env);
    } catch (e) {
      if (e.anmeldung) return Response.redirect(new URL('/admin/anmelden', request.url).toString(), 302);
      return new Response(`Kein Zugang: ${e.message}`, {
        status: e.status ?? 401,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
      });
    }
  }
  const antwort = await next();
  const kopie = new Response(antwort.body, antwort);
  kopie.headers.set('Cache-Control', 'no-store');
  kopie.headers.set('X-Robots-Tag', 'noindex');
  kopie.headers.set('X-Frame-Options', 'DENY');
  kopie.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'");
  return kopie;
}
