/** OCR·DB 비교용 텍스트 정규화 */
const PARTICLE_SUFFIX =
  /(?:을|를|이|가|은|는|의|에|에서|으로|와|과|도|만|에게|께|한테|처럼|보다|이라|라고|이란|란|하|여|오|구나)+$/;

const PARTICLE_INLINE =
  /(?:은|는|이|가|을|를|의|에|도|만|과|와|으로|에서|에게|께|한테)(?=[가-힣])/g;

/** 한글만 추출 (비교용) */
export function extractKoreanOnly(text: string): string {
  return (text.match(/[가-힣]+/g) ?? []).join("");
}

/**
 * OCR 텍스트 정규화
 * - 공백·특수문자·숫자·깨진 영문 제거
 * - 조사 일부 제거
 */
export function normalizeOcrText(text: string): string {
  let normalized = text
    .replace(/\s+/g, "")
    .replace(/[.,!?;:'"「」『』()\[\]{}…·\-~@#$%^&*+=|\\/<>「」『』]/g, "")
    .replace(/[0-9]/g, "")
    .replace(/[a-zA-Z]/g, "");

  normalized = normalized.replace(PARTICLE_INLINE, "");
  normalized = stripTrailingParticles(normalized);

  return extractKoreanOnly(normalized);
}

export function stripTrailingParticles(text: string): string {
  let result = text;
  let prev = "";
  while (result !== prev) {
    prev = result;
    result = result.replace(PARTICLE_SUFFIX, "");
  }
  return result;
}

export function normalizeTerm(text: string): string {
  return normalizeOcrText(text);
}

export function toBigrams(text: string): Set<string> {
  const set = new Set<string>();
  const normalized = normalizeTerm(text);
  if (normalized.length < 2) {
    if (normalized.length === 1) set.add(normalized);
    return set;
  }
  for (let i = 0; i < normalized.length - 1; i++) {
    set.add(normalized.slice(i, i + 2));
  }
  return set;
}

/** Dice 계수 (0~1) */
export function diceSimilarity(a: string, b: string): number {
  const na = normalizeTerm(a);
  const nb = normalizeTerm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (longer.includes(shorter) && shorter.length >= 3) {
    return 0.92 + Math.min(0.08, (shorter.length / longer.length) * 0.08);
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

export function similarityPercent(a: string, b: string): number {
  return Math.round(diceSimilarity(a, b) * 100);
}

export const FUZZY_MATCH_THRESHOLD = 70;

export interface FuzzyMatchResult {
  matched: boolean;
  similarity: number;
  method: "exact" | "substring" | "fuzzy" | "window";
}

/** OCR 정규화 텍스트에서 용어 매칭 (70% 이상 퍼지) */
export function fuzzyMatchInOcr(ocrNormalized: string, term: string): FuzzyMatchResult {
  const termNorm = normalizeTerm(term);
  if (!termNorm || !ocrNormalized) {
    return { matched: false, similarity: 0, method: "exact" };
  }

  if (ocrNormalized === termNorm) {
    return { matched: true, similarity: 100, method: "exact" };
  }

  if (ocrNormalized.includes(termNorm) || termNorm.includes(ocrNormalized)) {
    const sim =
      termNorm.length >= 3
        ? Math.max(95, similarityPercent(ocrNormalized, termNorm))
        : similarityPercent(ocrNormalized, termNorm);
    if (sim >= FUZZY_MATCH_THRESHOLD) {
      return { matched: true, similarity: sim, method: "substring" };
    }
  }

  const fullSim = similarityPercent(ocrNormalized, termNorm);
  if (fullSim >= FUZZY_MATCH_THRESHOLD) {
    return { matched: true, similarity: fullSim, method: "fuzzy" };
  }

  const windowSizes = [
    termNorm.length,
    termNorm.length - 1,
    termNorm.length + 1,
  ].filter((n) => n >= 2);

  for (const size of windowSizes) {
    for (let i = 0; i <= ocrNormalized.length - size; i++) {
      const window = ocrNormalized.slice(i, i + size);
      const sim = similarityPercent(window, termNorm);
      if (sim >= FUZZY_MATCH_THRESHOLD) {
        return { matched: true, similarity: sim, method: "window" };
      }
    }
  }

  return { matched: false, similarity: fullSim, method: "exact" };
}

export function partialPoints(basePoints: number, similarity: number): number {
  if (similarity >= 100) return basePoints;
  if (similarity < FUZZY_MATCH_THRESHOLD) return 0;
  return Math.round(basePoints * (similarity / 100));
}
