import type { APIRoute } from 'astro';
import { einstellungen } from '../lib/inhalt';

export const GET: APIRoute = () => {
  const basis = einstellungen.domain.replace(/\/$/, '');
  return new Response(`User-agent: *
Disallow: /admin/
Disallow: /api/

Sitemap: ${basis}/sitemap.xml
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
