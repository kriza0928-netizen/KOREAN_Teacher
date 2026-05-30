"use client";

import type { OcrResult } from "@/lib/providers/ocr/types";
import { TESSERACT_PROVIDER } from "@/lib/providers/ocr/types";
import { preprocessImageVariants } from "@/lib/ocr/preprocess";
import { MIN_OCR_CONFIDENCE_PERCENT } from "@/lib/validation/text";
import {
  computeOcrConfidence,
  extractRawOcrText,
  logFinalOcrText,
  logTesseractRecognizeResult,
  scoreOcrCandidate,
  toDisplayText,
  type OcrAttemptLog,
  type OcrDebugInfo,
} from "@/lib/ocr/ocr-debug";

const PSM_ATTEMPTS = [
  { mode: "3" as const, label: 3 },
  { mode: "4" as const, label: 4 },
  { mode: "6" as const, label: 6 },
  { mode: "11" as const, label: 11 },
  { mode: "13" as const, label: 13 },
] as const;

const OCR_SOURCES = [
  { key: "grayscale", label: "전처리(흑백·확대)" },
  { key: "fallback", label: "전처리(크롭 없음)" },
  { key: "binary", label: "threshold 이진화" },
] as const;

export interface TesseractOcrOptions {
  onProgress?: (progress: number, message?: string) => void;
}

interface BestCandidate {
  rawText: string;
  displayText: string;
  confidence: number;
  score: number;
  psm: number;
  source: string;
}

export async function runTesseractOcr(
  file: File,
  options?: TesseractOcrOptions | ((progress: number) => void)
): Promise<OcrResult> {
  const onProgress =
    typeof options === "function" ? options : options?.onProgress;
  const report = (progress: number, message?: string) => onProgress?.(progress, message);

  report(0, "이미지 전처리 중...");
  const variants = await preprocessImageVariants(file, ({ step, progress }) => {
    report(progress, step);
  });

  const sourceCanvas: Record<string, HTMLCanvasElement> = {
    grayscale: variants.grayscale,
    fallback: variants.fallback,
    binary: variants.binary,
  };

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

  const attempts: OcrAttemptLog[] = [];
  let best: BestCandidate | null = null;

  try {
    for (const { key, label: sourceLabel } of OCR_SOURCES) {
      const canvas = sourceCanvas[key];

      for (const { mode, label: psmLabel } of PSM_ATTEMPTS) {
        report(
          72 + Math.round((attempts.length / (OCR_SOURCES.length * PSM_ATTEMPTS.length)) * 18),
          `${sourceLabel} · PSM ${psmLabel}`
        );

        await worker.setParameters({
          tessedit_pageseg_mode: psmByValue[mode],
        });

        const recognizeResult = await worker.recognize(canvas);
        logTesseractRecognizeResult(`${sourceLabel}/PSM${psmLabel}`, recognizeResult);

        const data = recognizeResult.data;
        const rawText = extractRawOcrText(data);
        const displayText = toDisplayText(rawText);
        const confidence = computeOcrConfidence(data, rawText);
        const score = scoreOcrCandidate(displayText, confidence);

        attempts.push({
          source: sourceLabel,
          psm: psmLabel,
          rawText,
          textLength: displayText.length,
          confidence,
          score,
        });

        if (
          !best ||
          score > best.score ||
          (score === best.score && displayText.length > best.displayText.length)
        ) {
          best = {
            rawText,
            displayText,
            confidence,
            score,
            psm: psmLabel,
            source: sourceLabel,
          };
        }
      }
    }
  } finally {
    await worker.terminate();
  }

  report(100, "OCR 완료");

  const rawText = best?.rawText ?? "";
  const displayText = best?.displayText ?? "";
  const bestConfidence = best?.confidence ?? 0;

  logFinalOcrText(rawText, displayText);

  const confidencePercent =
    bestConfidence <= 1 ? Math.round(bestConfidence * 100) : Math.round(bestConfidence);

  const lowConfidence = confidencePercent < MIN_OCR_CONFIDENCE_PERCENT;

  const debug: OcrDebugInfo = {
    attempts,
    selectedSource: best?.source ?? "",
    selectedPsm: best?.psm ?? 0,
    rawText,
    displayText,
    confidence: confidencePercent,
    trace: [
      `선택: ${best?.source ?? "없음"} / PSM ${best?.psm ?? "-"}`,
      `score=${best?.score?.toFixed(1) ?? 0} confidence=${confidencePercent}%`,
      `raw.length=${rawText.length} display.length=${displayText.length}`,
      rawText === displayText
        ? "rawText === displayText (변형 없음)"
        : "rawText !== displayText (trim만 적용됨)",
    ],
  };

  console.log("[OCR] debug", debug);

  return {
    text: displayText,
    rawText,
    confidence: confidencePercent,
    provider: TESSERACT_PROVIDER,
    success: displayText.length > 0 && !lowConfidence,
    psm: best?.psm,
    preprocessed: true,
    lowConfidence,
    debug,
  };
}
