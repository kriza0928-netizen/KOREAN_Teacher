import { describe, expect, it } from "vitest";
import {
  postProcessOcrText,
  preserveRawOcrText,
  processOcrOutput,
  stripEnglishOcrNoiseInKoreanContext,
} from "@/lib/ocr/post-process";

describe("postProcessOcrText", () => {
  it("한글 단어를 자동 교정하지 않는다", () => {
    const raw = "님은 갔습니다\n안 오시네";
    expect(postProcessOcrText(raw)).toBe("님은 갔습니다\n안 오시네");
  });

  it("의미 추론 보정을 하지 않는다", () => {
    const raw = "갔습니다\n안 오네요";
    const cleaned = postProcessOcrText(raw);
    expect(cleaned).not.toContain("같습니다");
    expect(cleaned).toContain("갔습니다");
  });

  it("한글 문맥 사이 영문 OCR 노이즈를 제거한다", () => {
    expect(stripEnglishOcrNoiseInKoreanContext("나의 HJ 갔습니다")).toBe("나의 갔습니다");
    expect(stripEnglishOcrNoiseInKoreanContext("님은 HY 침묵")).toBe("님은 침묵");
    expect(stripEnglishOcrNoiseInKoreanContext("말소리 He 울려")).toBe("말소리 울려");
  });

  it("특수문자·OCR 노이즈만 제거한다", () => {
    const raw = "단풍나무 숲\n탄※@나루 Sd\nTEA\n시장에 간 우리 엄마";
    const cleaned = postProcessOcrText(raw);
    expect(cleaned).toContain("단풍나무 숲");
    expect(cleaned).toContain("탄나루");
    expect(cleaned).toContain("시장에 간 우리 엄마");
    expect(cleaned).not.toContain("TEA");
    expect(cleaned).not.toContain("※");
    expect(cleaned).not.toContain("Sd");
  });

  it("연속 공백을 정리한다", () => {
    expect(postProcessOcrText("안   오시네")).toBe("안 오시네");
  });

  it("원문과 정제본을 분리한다", () => {
    const { rawText, cleanedText } = processOcrOutput("  안 오시네  \n※@#  ");
    expect(preserveRawOcrText("  안 오시네  \n※@#  ")).toBe(rawText);
    expect(cleanedText).toBe("안 오시네");
  });
});
