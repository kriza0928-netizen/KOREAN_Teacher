import { describe, expect, it } from "vitest";
import {
  assessOcrQuality,
  containsOcrVerbatim,
  sanitizeAnalysisText,
} from "@/lib/ai/deep-analysis/sanitize-output";

describe("sanitize-output", () => {
  it("특수문자를 제거한다", () => {
    expect(sanitizeAnalysisText("※ @ | = ^ 테스트")).toBe("테스트");
  });

  it("OCR 원문 그대로 포함 여부를 검사한다", () => {
    const ocr = "님슨 갔습니다\n탄나루 숲슬 향하여";
    expect(containsOcrVerbatim("님슨 갔습니다", ocr)).toBe(true);
    expect(containsOcrVerbatim("화자는 이별의 슬픔을 표현한다.", ocr)).toBe(false);
  });

  it("낮은 OCR 품질을 감지한다", () => {
    expect(
      assessOcrQuality("님슨 갔습니다 ※", { confidence: 40, success: false })
    ).toBe("low");
    expect(
      assessOcrQuality("정상적인 한글 문장입니다.", { confidence: 85, success: true })
    ).toBe("good");
  });
});
