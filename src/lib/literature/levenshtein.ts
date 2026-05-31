/** 대표 구절 OCR 오인식 허용 임계값 (%) */
export const PHRASE_LEVENSHTEIN_THRESHOLD = 80;

/** Levenshtein 비교용 — 한글·공백만 정리, 조사·단어 변경 없음 */
export function lightNormalizeForCompare(text: string): string {
  return text
    .replace(/\s+/g, "")
    .replace(/[.,!?;:'"「」『』()\[\]{}…·\-~@#$%^&*+=|\\/<>※]/g, "")
    .replace(/[0-9a-zA-Z]/g, "");
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

function splitSyllables(text: string): string[] {
  return [...text].filter((ch) => /[가-힣]/.test(ch));
}

function commonAffixSyllables(a: string[], b: string[]): number {
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix++;
  }

  return prefix + suffix;
}

function syllableLevenshteinDistance(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

function syllableLevenshteinSimilarity(a: string, b: string): number {
  const sa = splitSyllables(a);
  const sb = splitSyllables(b);
  if (sa.length === 0 || sb.length === 0) return 0;
  if (sa.join("") === sb.join("")) return 100;

  const dist = syllableLevenshteinDistance(sa, sb);
  const maxLen = Math.max(sa.length, sb.length);
  const sumLen = sa.length + sb.length;
  const maxRatio = Math.round((1 - dist / maxLen) * 100);
  const sumRatio = Math.round((1 - (2 * dist) / sumLen) * 100);

  const affix = commonAffixSyllables(sa, sb);
  const affixBoost = affix >= 4 ? 12 : affix >= 3 ? 8 : affix >= 2 ? 5 : 0;

  return Math.min(100, Math.max(maxRatio, sumRatio) + affixBoost);
}

/** 정규화 후 Levenshtein 유사도 (0~100) — OCR 오인식 허용 */
export function levenshteinSimilarityPercent(a: string, b: string): number {
  const na = lightNormalizeForCompare(a);
  const nb = lightNormalizeForCompare(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;

  const dist = levenshteinDistance(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const sumLen = na.length + nb.length;
  const maxRatio = Math.round((1 - dist / maxLen) * 100);
  const sumRatio = Math.round((1 - (2 * dist) / sumLen) * 100);
  const syllableRatio = syllableLevenshteinSimilarity(na, nb);

  return Math.max(maxRatio, sumRatio, syllableRatio);
}

/** 긴 OCR 텍스트에서 구절 길이에 맞는 최고 Levenshtein 유사도 */
export function bestLevenshteinSimilarity(ocrText: string, phrase: string): number {
  const ocrNorm = lightNormalizeForCompare(ocrText);
  const phraseNorm = lightNormalizeForCompare(phrase);
  if (!ocrNorm || !phraseNorm) return 0;

  const full = levenshteinSimilarityPercent(ocrNorm, phraseNorm);
  if (full >= PHRASE_LEVENSHTEIN_THRESHOLD) return full;

  const longer = ocrNorm.length >= phraseNorm.length ? ocrNorm : phraseNorm;
  const shorter = ocrNorm.length >= phraseNorm.length ? phraseNorm : ocrNorm;

  if (shorter.length < 4) return full;

  let windowBest = 0;
  const minWin = Math.max(4, Math.floor(shorter.length * 0.7));

  for (let size = shorter.length; size >= minWin; size--) {
    for (let i = 0; i <= longer.length - size; i++) {
      const window = longer.slice(i, i + size);
      const sim = levenshteinSimilarityPercent(window, shorter);
      if (sim > windowBest) windowBest = sim;
    }
  }

  return Math.max(full, windowBest);
}
