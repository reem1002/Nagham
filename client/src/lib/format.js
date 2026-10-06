export function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtDuration(sec) {
  const m = Math.round((sec || 0) / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function fmtBytes(b) {
  if (!b) return '0 MB';
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Same normalisation as the server, so local artists merge the same way. */
export function normalizeKey(s = '') {
  return s
    .toString()
    .normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function matches(text, q) {
  return normalizeKey(text).includes(normalizeKey(q));
}

/** Deterministic gradient for items without artwork. */
export function gradientFor(seed = '') {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const hue = h % 360;
  const hue2 = (hue + 40 + (h % 60)) % 360;
  return `linear-gradient(135deg, hsl(${hue} 45% 32%), hsl(${hue2} 55% 18%))`;
}

export function initials(text = '') {
  const t = text.replace(/^(the|al|ال)\s*/i, '').trim();
  return [...t][0]?.toUpperCase() || '♪';
}
