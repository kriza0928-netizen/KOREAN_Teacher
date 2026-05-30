"use client";

import type { OcrResult } from "@/lib/providers/ocr/types";
import { TESSERACT_PROVIDER } from "@/lib/providers/ocr/types";

export async function runTesseractOcr(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  const Tesseract = (await import("tesseract.js")).default;

  const result = await Tesseract.recognize(file, "kor", {
    logger: (info) => {
      if (info.status === "recognizing text" && typeof info.progress === "number") {
        onProgress?.(Math.round(info.progress * 100));
      }
    },
  });

  const text = result.data.text?.trim() ?? "";
  const confidence =
    typeof result.data.confidence === "number" && result.data.confidence > 0
      ? result.data.confidence
      : estimateConfidence(result.data.text);

  return {
    text,
    confidence: confidence <= 1 ? confidence * 100 : confidence,
    provider: TESSERACT_PROVIDER,
    success: text.length > 0,
  };
}

function estimateConfidence(text: string): number {
  if (!text.trim()) return 0;
  const koreanRatio =
    (text.match(/[가-힣]/g)?.length ?? 0) / Math.max(text.length, 1);
  return Math.min(85, Math.round(40 + koreanRatio * 45));
}
