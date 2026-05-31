import { describe, expect, it } from "vitest";
import { searchLiteratureWorks } from "@/lib/literature/search";
import {
  correctLineWithPhrase,
  generateWorkBasedCorrections,
} from "@/lib/ocr/work-based-correction";

const NIM_OCR = `님슨 갔습니다
탄나루 숲슬 향하여
작슨 길
미에`;

describe("님의 침묵 OCR 교정", () => {
  it("작품 90% 이상 + 대표 구절 교정 후보 생성", () => {
    const search = searchLiteratureWorks(NIM_OCR);
    expect(search.matches[0]?.title).toBe("님의 침묵");
    expect(search.matches[0]?.score).toBeGreaterThanOrEqual(90);

    const corr = generateWorkBasedCorrections(NIM_OCR, search.matches);
    expect(corr.eligible).toBe(true);
    expect(corr.suggestions.length).toBeGreaterThanOrEqual(2);

    const line1 = corr.suggestions.find((s) => s.originalLine.includes("님슨"));
    expect(line1?.correctedLine).toContain("님은");
    expect(line1?.similarity).toBeGreaterThanOrEqual(80);
  });

  it("개별 구절 유사도", () => {
    const r1 = correctLineWithPhrase("님슨 갔습니다", "님은 갔습니다");
    expect(r1?.similarity).toBeGreaterThanOrEqual(80);

    const r2 = correctLineWithPhrase("탄나루 숲슬 향하여", "단풍나무 숲을 향하여");
    expect(r2?.similarity).toBeGreaterThanOrEqual(80);
  });
});
