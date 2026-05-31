import { describe, expect, it } from "vitest";
import { bestLineSimilarity, findBestLineMatch, lineMatchPoints } from "@/lib/literature/line-similarity";

describe("line-similarity", () => {
  it("부분 OCR과 대표 구절의 유사도를 계산한다", () => {
    const result = bestLineSimilarity("설렁탕을 사다 놓았는데 왜 먹지를 못하니", "왜 먹지를 못하니");
    expect(result.similarity).toBeGreaterThanOrEqual(70);
  });

  it("띄어쓰기 없는 OCR도 매칭한다", () => {
    const result = bestLineSimilarity("죽는날까지하늘을우러러", "죽는 날까지 하늘을 우러러");
    expect(result.similarity).toBeGreaterThanOrEqual(85);
  });

  it("findBestLineMatch는 최고 유사 구절을 반환한다", () => {
    const lines = [
      "힘없는책갈피는이종이를떨어뜨리리",
      "질투는 나의 힘",
      "운수 좋은 날",
    ];
    const best = findBestLineMatch(["힘없는 책갈피는 이 종이를"], lines);
    expect(best?.line).toContain("책갈피");
    expect(best?.similarity).toBeGreaterThanOrEqual(55);
  });

  it("lineMatchPoints는 유사도에 비례한다", () => {
    expect(lineMatchPoints(95)).toBe(40);
    expect(lineMatchPoints(60)).toBeGreaterThan(0);
    expect(lineMatchPoints(40)).toBe(0);
  });
});
