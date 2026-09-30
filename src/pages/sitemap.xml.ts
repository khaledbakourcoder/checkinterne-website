import type { APIRoute } from 'astro';
import { einstellungen, leistungen, projekte, url } from '../lib/inhalt';

export const GET: APIRoute = () => {
  const basis = einstellungen.domain.replace(/\/$/, '');
  const pfade = ['/', ...leistungen.map((l) => url.leistung(l.id)), ...projekte.map((p) => url.projekt(p.id))];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pfade.map((p) => `  <url><loc>${basis}${p}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
