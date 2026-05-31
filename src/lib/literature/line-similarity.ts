import {
  diceSimilarity,
  fuzzyMatchInOcr,
  normalizeTerm,
  similarityPercent,
} from "@/lib/literature/normalize";
import {
  bestLevenshteinSimilarity,
  lightNormalizeForCompare,
  PHRASE_LEVENSHTEIN_THRESHOLD,
} from "@/lib/literature/levenshtein";

/** 부분 OCR 발췌 허용 임계값 (%) — Dice/퍼지 */
export const PARTIAL_LINE_THRESHOLD = 55;
export const STRONG_LINE_THRESHOLD = 75;

export interface LineMatchResult {
  line: string;
  similarity: number;
  method: "exact" | "substring" | "fuzzy" | "window" | "dice" | "levenshtein";
}

/** OCR 텍스트와 대표 구절 간 최고 유사도 */
export function bestLineSimilarity(ocrText: string, line: string): LineMatchResult {
  const ocrNormalized = normalizeTerm(ocrText);
  const lineNorm = normalizeTerm(line);
  if (!lineNorm || !ocrNormalized) {
    return { line, similarity: 0, method: "dice" };
  }

  const levSim = bestLevenshteinSimilarity(ocrText, line);
  let best: LineMatchResult = {
    line,
    similarity: levSim,
    method: levSim >= PHRASE_LEVENSHTEIN_THRESHOLD ? "levenshtein" : "dice",
  };

  const consider = (candidate: LineMatchResult) => {
    if (candidate.similarity > best.similarity) {
      best = candidate;
    }
  };

  const fuzzy = fuzzyMatchInOcr(ocrNormalized, lineNorm);
  if (fuzzy.matched && fuzzy.similarity >= PARTIAL_LINE_THRESHOLD) {
    consider({ line, similarity: fuzzy.similarity, method: fuzzy.method });
  }

  const fullDice = similarityPercent(ocrNormalized, lineNorm);
  if (fullDice >= PARTIAL_LINE_THRESHOLD) {
    consider({ line, similarity: fullDice, method: "dice" });
  }

  const longer = ocrNormalized.length >= lineNorm.length ? ocrNormalized : lineNorm;
  const shorter = ocrNormalized.length >= lineNorm.length ? lineNorm : ocrNormalized;

  if (shorter.length >= 4) {
    let windowBest = 0;
    const minWin = Math.max(4, Math.floor(shorter.length * 0.6));
    for (let size = shorter.length; size >= minWin; size--) {
      for (let i = 0; i <= longer.length - size; i++) {
        const window = longer.slice(i, i + size);
        const sim = similarityPercent(window, shorter);
        if (sim > windowBest) windowBest = sim;
      }
    }
    if (windowBest >= PARTIAL_LINE_THRESHOLD) {
      consider({ line, similarity: windowBest, method: "window" });
    }
  }

  if (longer.includes(shorter) && shorter.length >= 4) {
    const subSim = Math.round(diceSimilarity(ocrNormalized, lineNorm) * 100);
    if (subSim >= PARTIAL_LINE_THRESHOLD) {
      consider({ line, similarity: subSim, method: "substring" });
    }
  }

  if (levSim >= PHRASE_LEVENSHTEIN_THRESHOLD) {
    return {
      line,
      similarity: Math.max(best.similarity, levSim),
      method: "levenshtein",
    };
  }

  return best;
}

/** 여러 OCR 구절 후보 중 대표 구절과의 최고 매칭 */
export function findBestLineMatch(
  ocrCandidates: string[],
  representativeLines: string[]
): LineMatchResult | null {
  let best: LineMatchResult | null = null;

  for (const ocr of ocrCandidates) {
    const ocrLight = lightNormalizeForCompare(ocr);
    if (!ocrLight || ocrLight.length < 4) continue;

    for (const line of representativeLines) {
      const result = bestLineSimilarity(ocr, line);
      const threshold =
        result.method === "levenshtein"
          ? PHRASE_LEVENSHTEIN_THRESHOLD
          : PARTIAL_LINE_THRESHOLD;
      if (result.similarity >= threshold) {
        if (!best || result.similarity > best.similarity) {
          best = result;
        }
      }
    }
  }

  return best;
}

/** 유사도 → 검색 점수 (대표 구절 매칭 최대 40점) */
export function lineMatchPoints(similarity: number, maxPoints = 40): number {
  if (similarity >= 95) return maxPoints;
  if (similarity >= 85) return Math.round(maxPoints * 0.85);
  if (similarity >= 75) return Math.round(maxPoints * 0.7);
  if (similarity >= 65) return Math.round(maxPoints * 0.55);
  if (similarity >= PARTIAL_LINE_THRESHOLD) return Math.round(maxPoints * 0.35);
  return 0;
}

/** OCR 변형(띄어쓰기 제거·구절 분할) 생성 */
export function expandLineVariants(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const variants = [
      trimmed,
      trimmed.replace(/\s/g, ""),
      trimmed.replace(/[,.!?…]/g, "").trim(),
    ];

    for (const part of trimmed.split(/[,;·]/)) {
      const p = part.trim();
      if (p.length >= 4) variants.push(p, p.replace(/\s/g, ""));
    }

    for (const v of variants) {
      if (v.length >= 3 && !seen.has(v)) {
        seen.add(v);
        result.push(v);
      }
    }
  }

  return result;
}
