import { describe, expect, it } from "vitest";
import { areConfusableChars } from "@/lib/ocr/ocr-confusion-pairs";
import {
  applyCorrectionSuggestions,
  correctLineWithPhrase,
  generateWorkBasedCorrections,
} from "@/lib/ocr/work-based-correction";
import type { WorkSearchMatch } from "@/lib/literature/types";

describe("work-based-correction", () => {
  it("은↔슨 OCR 오인식을 감지한다", () => {
    expect(areConfusableChars("슨", "은")).toBe(true);
    expect(areConfusableChars("슬", "을")).toBe(true);
  });

  it("님슨 갔습니다 → 님은 갔습니다 교정 후보 생성", () => {
    const result = correctLineWithPhrase("님슨 갔습니다", "님은 갔습니다");
    expect(result).not.toBeNull();
    expect(result!.similarity).toBeGreaterThanOrEqual(80);
    expect(result!.corrected.replace(/\s/g, "")).toContain("님은");
  });

  it("교정 적용은 사용자 선택 ID 기준", () => {
    const ocr = "님슨 갔습니다\n안 오시네";
    const suggestions = [
      {
        id: "line-0",
        lineIndex: 0,
        originalLine: "님슨 갔습니다",
        correctedLine: "님은 갔습니다",
        matchedPhrase: "님은 갔습니다",
        workId: "work-029",
        workTitle: "님의 침묵",
        workAuthor: "한용운",
        similarity: 90,
        confidence: "high" as const,
        method: "phrase" as const,
        reasonLabel: "대표구절 일치 90% · 작품DB 기반 교정",
      },
    ];

    const applied = applyCorrectionSuggestions(ocr, suggestions, new Set(["line-0"]));
    expect(applied).toContain("님은 갔습니다");
    expect(applied).not.toContain("님슨");
  });

  it("작품 후보 90% 미만이면 교정 비활성", () => {
    const matches: WorkSearchMatch[] = [
      {
        workId: "work-001",
        title: "테스트",
        author: "작가",
        confidence: 50,
        score: 50,
        matchReasons: [],
        matchedKeyword: "",
        matchedPhrase: "",
      },
    ];

    const result = generateWorkBasedCorrections("님슨 갔습니다", matches);
    expect(result.eligible).toBe(false);
    expect(result.suggestions).toHaveLength(0);
  });
});
