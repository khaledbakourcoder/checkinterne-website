import { defineConfig } from 'astro/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const einstellungen = JSON.parse(readFileSync(new URL('./inhalt/einstellungen.json', import.meta.url), 'utf8'));

// Weiterleitungen aus dem CMS (umbenannte oder gelöschte Seiten) als Cloudflare-_redirects ausgeben
const weiterleitungen = {
  name: 'weiterleitungen',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const liste = JSON.parse(readFileSync(new URL('./inhalt/weiterleitungen.json', import.meta.url), 'utf8'));
      const zeilen = liste.map((w) => `${w.von} ${w.nach} 301`);
      writeFileSync(fileURLToPath(new URL('_redirects', dir)), zeilen.join('\n') + '\n');
    },
  },
};

export default defineConfig({
  site: einstellungen.domain,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [weiterleitungen],
});
