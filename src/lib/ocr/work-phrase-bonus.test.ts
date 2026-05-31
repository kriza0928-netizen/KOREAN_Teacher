import { describe, expect, it } from "vitest";
import { computeWorkPhraseBonus } from "@/lib/ocr/work-phrase-bonus";

describe("computeWorkPhraseBonus", () => {
  it("님의 침묵 대표 구절에 가산점을 부여한다", () => {
    const text = "아아 사랑하는 나의\n님은 갔습니다";
    const result = computeWorkPhraseBonus(text);

    expect(result.bonus).toBeGreaterThan(0);
    expect(result.matches.some((m) => m.title === "님의 침묵")).toBe(true);
  });
});
