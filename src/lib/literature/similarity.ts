/** OCR·DB 비교용 텍스트 정규화 */
export function normalizeForMatch(text: string): string {
  return text
    .replace(/\s+/g, "")
    .replace(/[.,!?;:'"「」『』()\[\]{}…·\-~]/g, "")
    .replace(/[0-9]/g, "")
    .trim();
}

export function toBigrams(text: string): Set<string> {
  const set = new Set<string>();
  const normalized = normalizeForMatch(text);
  if (normalized.length < 2) {
    if (normalized.length === 1) set.add(normalized);
    return set;
  }
  for (let i = 0; i < normalized.length - 1; i++) {
    set.add(normalized.slice(i, i + 2));
  }
  return set;
}

/** Dice 계수 기반 유사도 (0~1) */
export function diceSimilarity(a: string, b: string): number {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (longer.includes(shorter) && shorter.length >= 6) {
    return 0.92 + Math.min(0.08, shorter.length / longer.length * 0.08);
  }

  const ba = toBigrams(na);
  const bb = toBigrams(nb);
  if (ba.size === 0 || bb.size === 0) return 0;

  let intersect = 0;
  for (const bg of ba) {
    if (bb.has(bg)) intersect++;
  }
  return (2 * intersect) / (ba.size + bb.size);
}

/** 0~100 퍼센트 */
export function similarityPercent(a: string, b: string): number {
  return Math.round(diceSimilarity(a, b) * 100);
}
