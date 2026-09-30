// Lokaler Server für die Entwicklung: Dashboard + API auf http://127.0.0.1:4322/admin/
// Schreibt direkt in die Projektdateien (kein Login, kein Git). Nur an 127.0.0.1 gebunden.
// Parallel `npm run dev` starten – die Seite unter http://localhost:4321 zeigt Änderungen sofort.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bearbeite } from './kern.js';
import { lokalerSpeicher } from './speicher-lokal.js';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const ADMIN = join(WURZEL, 'public', 'admin');
const PORT = Number(process.env.PORT ?? 4322);
const speicher = lokalerSpeicher(WURZEL);
const typen = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

async function body(req) {
  const teile = [];
  for await (const t of req) teile.push(t);
  const text = Buffer.concat(teile).toString('utf8');
  return text ? JSON.parse(text) : undefined;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const ergebnis = await bearbeite(
        { methode: req.method, pfad: url.pathname, body: req.method === 'GET' ? undefined : await body(req) },
        { speicher, nutzer: { email: 'lokal@entwicklung' }, vorschauUrl: 'http://localhost:4321' },
      );
      if (ergebnis.bytes) {
        res.writeHead(ergebnis.status, { 'Content-Type': ergebnis.typ });
        return res.end(ergebnis.bytes);
      }
      res.writeHead(ergebnis.status, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(ergebnis.json));
    }
    if (url.pathname === '/' || url.pathname === '/admin') { res.writeHead(302, { Location: '/admin/' }); return res.end(); }
    if (url.pathname.startsWith('/admin/')) {
      const rel = normalize(url.pathname.slice('/admin/'.length) || 'index.html');
      if (rel.startsWith('..')) { res.writeHead(400); return res.end(); }
      const datei = join(ADMIN, rel);
      const inhalt = await readFile(datei);
      res.writeHead(200, { 'Content-Type': typen[extname(datei)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      return res.end(inhalt);
    }
    res.writeHead(404); res.end('Nicht gefunden');
  } catch (e) {
    console.error(e);
    res.writeHead(e.code === 'ENOENT' ? 404 : 500); res.end(e.code === 'ENOENT' ? 'Nicht gefunden' : 'Fehler');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Dashboard (lokal): http://127.0.0.1:${PORT}/admin/`));
