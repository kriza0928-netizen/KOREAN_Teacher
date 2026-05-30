"use client";

import type { OcrResult } from "@/lib/providers/ocr/types";
import { TESSERACT_PROVIDER } from "@/lib/providers/ocr/types";
import { preprocessImageForOcr } from "@/lib/ocr/preprocess";
import { MIN_OCR_CONFIDENCE_PERCENT } from "@/lib/validation/text";

/** Tesseract PSM 모드 — 여러 모드 시도 후 최고 confidence 선택 */
const PSM_ATTEMPTS = [
  { mode: "3" as const, label: 3 },
  { mode: "4" as const, label: 4 },
  { mode: "6" as const, label: 6 },
  { mode: "11" as const, label: 11 },
  { mode: "13" as const, label: 13 },
] as const;

export interface TesseractOcrOptions {
  onProgress?: (progress: number, message?: string) => void;
}

export async function runTesseractOcr(
  file: File,
  options?: TesseractOcrOptions | ((progress: number) => void)
): Promise<OcrResult> {
  const onProgress =
    typeof options === "function" ? options : options?.onProgress;
  const report = (progress: number, message?: string) => onProgress?.(progress, message);

  report(0, "이미지 전처리 중...");
  const preprocessed = await preprocessImageForOcr(file, ({ step, progress }) => {
    report(progress, step);
  });

  const Tesseract = await import("tesseract.js");
  const { createWorker, PSM } = Tesseract;

  const psmByValue: Record<string, (typeof PSM)[keyof typeof PSM]> = {
    "3": PSM.AUTO,
    "4": PSM.SINGLE_COLUMN,
    "6": PSM.SINGLE_BLOCK,
    "11": PSM.SPARSE_TEXT,
    "13": PSM.RAW_LINE,
  };

  report(72, "Tesseract OCR 준비 중 (kor+eng)...");
  const worker = await createWorker("kor+eng", 1, {
    logger: (info) => {
      if (info.status === "recognizing text" && typeof info.progress === "number") {
        report(72 + Math.round(info.progress * 18));
      }
    },
  });

  let bestText = "";
  let bestConfidence = 0;
  let bestPsm: number = PSM_ATTEMPTS[0].label;

  try {
    for (let i = 0; i < PSM_ATTEMPTS.length; i++) {
      const { mode, label } = PSM_ATTEMPTS[i];
      report(72 + Math.round((i / PSM_ATTEMPTS.length) * 18), `PSM ${label} 모드 시도 중...`);

      await worker.setParameters({
        tessedit_pageseg_mode: psmByValue[mode],
      });

      const { data } = await worker.recognize(preprocessed);
      const text = data.text?.trim() ?? "";
      const confidence =
        typeof data.confidence === "number" && data.confidence > 0
          ? data.confidence
          : estimateConfidence(text);

      if (confidence > bestConfidence || (confidence === bestConfidence && text.length > bestText.length)) {
        bestText = text;
        bestConfidence = confidence;
        bestPsm = label;
      }
    }
  } finally {
    await worker.terminate();
  }

  report(100, "OCR 완료");

  const confidencePercent =
    bestConfidence <= 1 ? Math.round(bestConfidence * 100) : Math.round(bestConfidence);

  const lowConfidence = confidencePercent < MIN_OCR_CONFIDENCE_PERCENT;

  return {
    text: bestText,
    confidence: confidencePercent,
    provider: TESSERACT_PROVIDER,
    success: bestText.length > 0 && !lowConfidence,
    psm: bestPsm,
    preprocessed: true,
    lowConfidence,
  };
}

function estimateConfidence(text: string): number {
  if (!text.trim()) return 0;
  const koreanRatio =
    (text.match(/[가-힣]/g)?.length ?? 0) / Math.max(text.length, 1);
  return Math.min(65, Math.round(30 + koreanRatio * 35));
}
