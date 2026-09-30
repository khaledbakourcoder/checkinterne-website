// Kleine Helfer, die in Cloudflare Workers und in Node gleich funktionieren (kein Buffer).

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const textZuBytes = (text) => encoder.encode(text);
export const bytesZuText = (bytes) => decoder.decode(bytes);

export function bytesZuBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function base64ZuBytes(b64) {
  const s = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

export class CmsFehler extends Error {
  constructor(status, meldung) {
    super(meldung);
    this.status = status;
  }
}
