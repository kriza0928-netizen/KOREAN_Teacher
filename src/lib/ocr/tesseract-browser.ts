"use client";

import type { OcrResult } from "@/lib/providers/ocr/types";
import { TESSERACT_PROVIDER } from "@/lib/providers/ocr/types";
import {
  buildOcrImageVariants,
  OCR_VARIANT_LABELS,
  type OcrImageVariants,
} from "@/lib/ocr/preprocess";
import { MIN_OCR_CONFIDENCE_PERCENT } from "@/lib/validation/text";
import {
  buildVariantSummaries,
  computeOcrConfidence,
  extractRawOcrText,
  logFinalOcrText,
  logTesseractRecognizeResult,
  toDisplayText,
  type OcrAttemptLog,
  type OcrDebugInfo,
} from "@/lib/ocr/ocr-debug";
import { computeTextQualityMetrics } from "@/lib/ocr/readability";

/** PSM 3, 4, 6, 11 — 가독성 점수 최고 선택 (PSM 6은 한글 문학 우선) */
const PSM_ATTEMPTS = [
  { mode: "3" as const, label: 3 },
  { mode: "4" as const, label: 4 },
  { mode: "6" as const, label: 6 },
  { mode: "11" as const, label: 11 },
] as const;

const VARIANT_ORDER: (keyof OcrImageVariants)[] = [
  "original",
  "grayscale",
  "threshold",
  "scaled",
  "denoised",
];

/** 디버그 패널에 표시할 4종 */
const DEBUG_VARIANT_KEYS: (keyof OcrImageVariants)[] = [
  "original",
  "grayscale",
  "threshold",
  "scaled",
];

export interface TesseractOcrOptions {
  onProgress?: (progress: number, message?: string) => void;
}

interface BestCandidate {
  rawText: string;
  displayText: string;
  confidence: number;
  koreanRatio: number;
  sentenceCount: number;
  avgWordLength: number;
  readabilityScore: number;
  psm: number;
  source: string;
  sourceKey: string;
}

export async function runTesseractOcr(
  file: File,
  options?: TesseractOcrOptions | ((progress: number) => void)
): Promise<OcrResult> {
  const onProgress =
    typeof options === "function" ? options : options?.onProgress;
  const report = (progress: number, message?: string) => onProgress?.(progress, message);

  report(0, "OCR 이미지 준비 중...");
  const variants = await buildOcrImageVariants(file, ({ step, progress }) => {
    report(progress, step);
  });

  const Tesseract = await import("tesseract.js");
  const { createWorker, PSM } = Tesseract;

  const psmByValue: Record<string, (typeof PSM)[keyof typeof PSM]> = {
    "3": PSM.AUTO,
    "4": PSM.SINGLE_COLUMN,
    "6": PSM.SINGLE_BLOCK,
    "11": PSM.SPARSE_TEXT,
  };

  report(72, "Tesseract OCR 준비 (kor+eng)...");
  const worker = await createWorker("kor+eng", 1, {
    logger: (info) => {
      if (info.status === "recognizing text" && typeof info.progress === "number") {
        report(72 + Math.round(info.progress * 18));
      }
    },
  });

  const attempts: OcrAttemptLog[] = [];
  let best: BestCandidate | null = null;
  const totalRuns = VARIANT_ORDER.length * PSM_ATTEMPTS.length;
  let runIndex = 0;

  try {
    for (const sourceKey of VARIANT_ORDER) {
      const canvas = variants[sourceKey];
      const sourceLabel = OCR_VARIANT_LABELS[sourceKey];

      for (const { mode, label: psmLabel } of PSM_ATTEMPTS) {
        runIndex++;
        report(
          72 + Math.round((runIndex / totalRuns) * 18),
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
        const confidence = computeOcrConfidence(data);
        const metrics = computeTextQualityMetrics(displayText, confidence, {
          psm: psmLabel,
          sourceKey,
        });

        attempts.push({
          source: sourceLabel,
          sourceKey,
          psm: psmLabel,
          rawText,
          textLength: displayText.length,
          confidence: metrics.confidence,
          koreanRatio: metrics.koreanRatio,
          sentenceCount: metrics.sentenceCount,
          avgWordLength: metrics.avgWordLength,
          readabilityScore: metrics.readabilityScore,
        });

        const candidate: BestCandidate = {
          rawText,
          displayText,
          confidence: metrics.confidence,
          koreanRatio: metrics.koreanRatio,
          sentenceCount: metrics.sentenceCount,
          avgWordLength: metrics.avgWordLength,
          readabilityScore: metrics.readabilityScore,
          psm: psmLabel,
          source: sourceLabel,
          sourceKey,
        };

        if (
          !best ||
          candidate.readabilityScore > best.readabilityScore ||
          (candidate.readabilityScore === best.readabilityScore &&
            candidate.koreanRatio > best.koreanRatio) ||
          (candidate.readabilityScore === best.readabilityScore &&
            candidate.koreanRatio === best.koreanRatio &&
            candidate.displayText.length > best.displayText.length)
        ) {
          best = candidate;
        }
      }
    }
  } finally {
    await worker.terminate();
  }

  report(100, "OCR 완료");

  const rawText = best?.rawText ?? "";
  const displayText = best?.displayText ?? "";
  const confidencePercent = best?.confidence ?? 0;

  logFinalOcrText(rawText, displayText);

  const lowConfidence = confidencePercent < MIN_OCR_CONFIDENCE_PERCENT;

  const variantSummaries = buildVariantSummaries(
    attempts,
    DEBUG_VARIANT_KEYS as string[]
  );

  const debug: OcrDebugInfo = {
    attempts,
    variantSummaries,
    selectedSource: best?.source ?? "",
    selectedSourceKey: best?.sourceKey ?? "",
    selectedPsm: best?.psm ?? 0,
    rawText,
    displayText,
    confidence: confidencePercent,
    koreanRatio: best?.koreanRatio ?? 0,
    sentenceCount: best?.sentenceCount ?? 0,
    avgWordLength: best?.avgWordLength ?? 0,
    readabilityScore: best?.readabilityScore ?? 0,
    trace: [
      `선택: ${best?.source ?? "없음"} / PSM ${best?.psm ?? "-"}`,
      `가독성=${best?.readabilityScore ?? 0} confidence=${confidencePercent}%`,
      `한글비율=${Math.round((best?.koreanRatio ?? 0) * 100)}% 문장=${best?.sentenceCount ?? 0}`,
      `평균단어길이=${best?.avgWordLength ?? 0}`,
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
    preprocessed: best?.sourceKey !== "original",
    lowConfidence,
    debug,
  };
}
