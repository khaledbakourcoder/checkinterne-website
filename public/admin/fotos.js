// Fotos vom Handy vorbereiten: richtig drehen, auf höchstens 2000 px verkleinern, als JPEG speichern.
// So bleibt der Upload klein (statt 5–8 MB), die endgültige Optimierung macht der Website-Build.
const MAX_KANTE = 2000;
const QUALITAET = 0.85;

async function bitmapAus(datei) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(datei, { imageOrientation: 'from-image' }); } catch { /* weiter mit <img> */ }
  }
  const url = URL.createObjectURL(datei);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function fotoVorbereiten(datei) {
  if (!datei.type.startsWith('image/')) throw new Error('Das ist kein Foto.');
  let bild;
  try {
    bild = await bitmapAus(datei);
  } catch {
    throw new Error('Dieses Foto kann der Browser nicht öffnen. Bitte als JPEG speichern (auf dem iPhone: Einstellungen › Kamera › Formate › „Maximale Kompatibilität“).');
  }
  const b = bild.width, hh = bild.height;
  const faktor = Math.min(1, MAX_KANTE / Math.max(b, hh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(b * faktor);
  canvas.height = Math.round(hh * faktor);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bild, 0, 0, canvas.width, canvas.height);
  bild.close?.();
  const blob = await new Promise((ok, fehl) => canvas.toBlob((x) => (x ? ok(x) : fehl(new Error('Foto konnte nicht umgewandelt werden.'))), 'image/jpeg', QUALITAET));
  return { blob, breite: canvas.width, hoehe: canvas.height };
}

export function blobZuBase64(blob) {
  return new Promise((ok, fehl) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1]);
    r.onerror = () => fehl(r.error);
    r.readAsDataURL(blob);
  });
}

// Eindeutiger, sprechender Dateiname: badsanierung-flensburg-3.jpg (gut für Google-Bildersuche)
export function freierName(basis, vergeben) {
  const b = basis || 'foto';
  for (let n = 1; ; n++) {
    const name = `${b}-${n}.jpg`;
    if (!vergeben.has(name)) return name;
  }
}
