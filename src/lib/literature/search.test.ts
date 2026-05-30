import { describe, expect, it } from "vitest";
import { searchLiteratureWorks } from "@/lib/literature/search";

const SAMPLE_OCR =
  "김 첨지 설렁탕을 사다 죽은 이의 얼굴 아내 왜 먹지를 못하니";

describe("searchLiteratureWorks — 퍼지 키워드 매칭", () => {
  it("운수 좋은 날 / 현진건을 90점 이상으로 매칭한다", () => {
    const result = searchLiteratureWorks(SAMPLE_OCR);

    expect(result.notFound).toBe(false);
    expect(result.matches.length).toBeGreaterThan(0);

    const top = result.matches[0];
    expect(top.title).toBe("운수 좋은 날");
    expect(top.author).toBe("현진건");
    expect(top.score).toBeGreaterThanOrEqual(90);
    expect(top.confidence).toBeGreaterThanOrEqual(90);

    expect(result.autoMatch).toBeDefined();
    expect(result.autoMatch?.title).toBe("운수 좋은 날");
    expect(result.autoMatch?.author).toBe("현진건");

    const labels = top.matchReasons.map((r) => r.label);
    expect(labels.some((l) => l.includes("김첨지") || l.includes("김 첨지"))).toBe(true);
    expect(labels.some((l) => l.includes("설렁탕"))).toBe(true);
    expect(labels.some((l) => l.includes("왜") || l.includes("먹지"))).toBe(true);
  });

  it("OCR 정규화 텍스트를 생성한다", () => {
    const result = searchLiteratureWorks(SAMPLE_OCR);
    expect(result.normalizedText).toContain("김첨지");
    expect(result.normalizedText).toContain("설렁탕");
  });
});
