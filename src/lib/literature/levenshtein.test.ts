import { describe, expect, it } from "vitest";
import {
  bestLevenshteinSimilarity,
  levenshteinSimilarityPercent,
  PHRASE_LEVENSHTEIN_THRESHOLD,
} from "@/lib/literature/levenshtein";
import { bestLineSimilarity } from "@/lib/literature/line-similarity";

describe("levenshtein", () => {
  it("OCR 오인식 구절을 80% 이상 유사도로 인정한다", () => {
    const ocr = "님은 갔습니다";
    const phrase = "님은 같았습니다";
    const sim = bestLevenshteinSimilarity(ocr, phrase);
    expect(sim).toBeGreaterThanOrEqual(PHRASE_LEVENSHTEIN_THRESHOLD);
  });

  it("bestLineSimilarity에 Levenshtein이 반영된다", () => {
    const result = bestLineSimilarity("님은 갔습니다", "님은 같았습니다");
    expect(result.method).toBe("levenshtein");
    expect(result.similarity).toBeGreaterThanOrEqual(PHRASE_LEVENSHTEIN_THRESHOLD);
  });

  it("완전 일치는 100%", () => {
    expect(levenshteinSimilarityPercent("안 오시네", "안 오시네")).toBe(100);
  });
});
