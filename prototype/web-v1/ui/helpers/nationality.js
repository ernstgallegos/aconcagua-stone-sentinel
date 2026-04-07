function deriveIsoFromFlag(flag) {
  if (typeof flag !== 'string' || !flag.trim()) return '';
  const points = Array.from(flag).map((ch) => ch.codePointAt(0));
  if (points.length !== 2) return '';
  const base = 0x1F1E6;
  const letters = points.map((cp) => {
    const idx = cp - base;
    if (idx < 0 || idx > 25) return '';
    return String.fromCharCode(65 + idx);
  });
  if (letters.some((letter) => !letter)) return '';
  return letters.join('');
}

export function getNationalityBadge(character) {
  const isoFromData = String(character?.nationalityCode || '').trim().toUpperCase();
  const isoFromFlag = deriveIsoFromFlag(character?.flag);
  const isoCode = isoFromData || isoFromFlag || 'NA';
  const emoji = typeof character?.flag === 'string' ? character.flag.trim() : '';
  const emojiHtml = emoji ? ` <span class="char-flag" aria-hidden="true">${emoji}</span>` : '';
  return `${emojiHtml} <span class="char-iso">(${isoCode})</span>`;
}

export { deriveIsoFromFlag };
