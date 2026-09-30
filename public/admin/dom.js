// DOM bauen ohne innerHTML: Inhalte landen immer als Text im Dokument, nie als HTML.
export function h(tag, attrs = {}, ...kinder) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kind of kinder.flat(Infinity)) {
    if (kind === null || kind === undefined || kind === false) continue;
    el.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return el;
}

export const leeren = (el) => { while (el.firstChild) el.firstChild.remove(); return el; };

let meldungsTimer;
export function melde(text, { fehler = false, dauer = 5000 } = {}) {
  const el = document.getElementById('meldung');
  el.textContent = text;
  el.classList.toggle('fehler', fehler);
  el.hidden = false;
  clearTimeout(meldungsTimer);
  meldungsTimer = setTimeout(() => (el.hidden = true), fehler ? Math.max(dauer, 9000) : dauer);
}

// Text → Adresse: „Badsanierung in Flensburg“ → „badsanierung-in-flensburg“
export function zuSlug(text) {
  return String(text).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-')
    .slice(0, 60).replace(/-+$/, '');
}

export const kopie = (x) => structuredClone(x);
export const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function woerter(...texte) {
  return texte.flat(Infinity).filter(Boolean).join(' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
