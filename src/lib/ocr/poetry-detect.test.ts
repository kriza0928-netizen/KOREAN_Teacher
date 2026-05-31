import { describe, expect, it } from "vitest";
import { isPoetryLayout } from "@/lib/ocr/poetry-detect";

describe("isPoetryLayout", () => {
  it("짧은 행·줄바꿈 많은 시 텍스트를 감지한다", () => {
    const poem = `
아아 사랑하는 나의 님은
갔습니다
나의 HJ 갔습니다
말소리 He 울려
`.trim();

    expect(isPoetryLayout(poem)).toBe(true);
  });

  it("긴 산문 텍스트는 시 모드로 판단하지 않는다", () => {
    const prose =
      "김 첨지는 설렁탕을 사다 놓았는데 죽은 이의 얼굴을 바라보며 아내에게 왜 먹지를 못하니라고 물었다.";
    expect(isPoetryLayout(prose)).toBe(false);
  });
});
