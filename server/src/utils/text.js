// Helpers for matching Arabic + Latin text loosely.

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "  Fairuz " -> "fairuz", "فَيْرُوز" -> "فيروز", "أ/إ/آ" -> "ا" */
export function normalizeKey(s = '') {
  return s
    .toString()
    .normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Regex that matches the query regardless of alef/ya/ta-marbuta variants and case. */
export function looseRegex(q) {
  const key = normalizeKey(q);
  const pattern = escapeRegex(key)
    .replace(/ا/g, '[اأإآٱ]')
    .replace(/ي/g, '[يى]')
    .replace(/ه/g, '[هة]');
  return new RegExp(pattern, 'i');
}
