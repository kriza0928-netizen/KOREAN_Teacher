"use client";

import type { OcrResult } from "@/lib/providers/ocr/types";
import { TESSERACT_PROVIDER } from "@/lib/providers/ocr/types";
import {
  loadResizedOcrCanvas,
  OCR_VARIANT_LABELS,
  toGrayscaleCanvas,
  toThresholdCanvas,
} from "@/lib/ocr/preprocess";
import { MIN_OCR_CONFIDENCE_PERCENT } from "@/lib/validation/text";
import { processOcrOutput } from "@/lib/ocr/post-process";
import {
  compareOcrCandidates,
  pickTopCandidates,
  type OcrCandidate,
  type OcrLangMode,
} from "@/lib/ocr/ocr-candidate";
import { isPoetryLayout } from "@/lib/ocr/poetry-detect";
import { computeTextQualityMetrics } from "@/lib/ocr/readability";
import {
  buildVariantSummaries,
  computeOcrConfidence,
  extractRawOcrText,
  isOcrDebugEnabled,
  logFinalOcrText,
  logTesseractRecognizeResult,
  type OcrAttemptLog,
  type OcrDebugInfo,
  type OcrTopCandidate,
} from "@/lib/ocr/ocr-debug";
import { OcrTimer } from "@/lib/ocr/ocr-timing";
import { recognizeCanvas, warmOcrWorkers } from "@/lib/ocr/tesseract-worker";

export { warmOcrWorkers };

const EARLY_EXIT_KOREAN_RATIO = 0.7;
const EARLY_EXIT_CONFIDENCE = 70;
const PSM_SEQUENCE = [6, 11] as const;
const LANG_SEQUENCE: OcrLangMode[] = ["kor", "kor+eng"];

type VariantKey = "original" | "grayscale" | "threshold";

const VARIANT_PIPELINE: Array<{
  key: VariantKey;
  label: string;
  build: (original: HTMLCanvasElement, cache: VariantCache) => HTMLCanvasElement;
}> = [
  {
    key: "original",
    label: OCR_VARIANT_LABELS.original,
    build: (original) => original,
  },
  {
    key: "grayscale",
    label: OCR_VARIANT_LABELS.grayscale,
    build: (original, cache) => {
      if (!cache.grayscale) cache.grayscale = toGrayscaleCanvas(original);
      return cache.grayscale;
    },
  },
  {
    key: "threshold",
    label: OCR_VARIANT_LABELS.threshold,
    build: (original, cache) => {
      if (!cache.threshold) cache.threshold = toThresholdCanvas(original);
      return cache.threshold;
    },
  },
];

interface VariantCache {
  grayscale?: HTMLCanvasElement;
  threshold?: HTMLCanvasElement;
}

export interface TesseractOcrOptions {
  onProgress?: (progress: number, message?: string) => void;
}

interface RawAttempt {
  rawText: string;
  cleanedText: string;
  confidence: number;
  lang: OcrLangMode;
  psm: number;
  source: string;
  sourceKey: VariantKey;
}

function toTopCandidate(candidate: OcrCandidate, rank: number): OcrTopCandidate {
  return {
    rank,
    lang: candidate.lang,
    source: candidate.source,
    psm: candidate.psm,
    rawText: candidate.rawText,
    cleanedText: candidate.cleanedText,
    koreanRatio: candidate.koreanRatio,
    specialCharRatio: candidate.specialCharRatio,
    readabilityScore: candidate.readabilityScore,
    workPhraseBonus: 0,
    combinedScore: candidate.combinedScore,
  };
}

function scoreAttempt(attempt: RawAttempt, poetryMode: boolean): OcrCandidate {
  const metrics = computeTextQualityMetrics(attempt.cleanedText, attempt.confidence, {
    psm: attempt.psm,
    sourceKey: attempt.sourceKey,
    poetryMode,
    lang: attempt.lang,
  });

  return {
    id: 0,
    rawText: attempt.rawText,
    cleanedText: attempt.cleanedText,
    lang: attempt.lang,
    psm: attempt.psm,
    source: attempt.source,
    sourceKey: attempt.sourceKey,
    confidence: metrics.confidence,
    koreanRatio: metrics.koreanRatio,
    specialCharRatio: metrics.specialCharRatio,
    readabilityScore: metrics.readabilityScore,
    workPhraseBonus: 0,
    combinedScore: metrics.readabilityScore,
    workPhraseMatches: [],
    metrics,
  };
}

function passesEarlyExit(candidate: OcrCandidate): boolean {
  return (
    candidate.rawText.trim().length > 0 &&
    candidate.koreanRatio >= EARLY_EXIT_KOREAN_RATIO &&
    candidate.confidence >= EARLY_EXIT_CONFIDENCE
  );
}

async function runSingleRecognize(
  canvas: HTMLCanvasElement,
  lang: OcrLangMode,
  psm: 6 | 11,
  source: string,
  sourceKey: VariantKey,
  poetryMode: boolean,
  label: string
): Promise<{ attempt: RawAttempt; candidate: OcrCandidate } | null> {
  const recognizeResult = await recognizeCanvas(canvas, lang, psm);
  if (isOcrDebugEnabled()) {
    logTesseractRecognizeResult(label, recognizeResult);
  }

  const data = recognizeResult.data;
  const extracted = extractRawOcrText(data);
  const { rawText, cleanedText } = processOcrOutput(extracted);
  if (!rawText.trim()) return null;

  const attempt: RawAttempt = {
    rawText,
    cleanedText,
    confidence: computeOcrConfidence(data),
    lang,
    psm,
    source,
    sourceKey,
  };

  return { attempt, candidate: scoreAttempt(attempt, poetryMode) };
}

export async function runTesseractOcr(
  file: File,
  options?: TesseractOcrOptions | ((progress: number) => void)
): Promise<OcrResult> {
  const onProgress =
    typeof options === "function" ? options : options?.onProgress;
  const report = (progress: number, message?: string) => onProgress?.(progress, message);
  const timer = new OcrTimer();

  console.time("[OCR] total");
  report(0, "OCR 준비 중...");

  timer.startStage("worker 준비");
  await warmOcrWorkers();
  timer.endStage();

  timer.startStage("이미지 로드");
  const imageLoadStartedAt = performance.now();
  const original = await loadResizedOcrCanvas(file);
  const imageLoadMs = performance.now() - imageLoadStartedAt;
  timer.endStage();

  const variantCache: VariantCache = {};
  const collected: OcrCandidate[] = [];
  let attemptCount = 0;
  let best: OcrCandidate | null = null;
  let poetryMode = false;

  const ocrStartedAt = performance.now();
  timer.startStage("OCR");

  outer: for (const lang of LANG_SEQUENCE) {
    for (const variant of VARIANT_PIPELINE) {
      const canvas = variant.build(original, variantCache);

      for (const psm of PSM_SEQUENCE) {
        attemptCount++;
        report(
          20 + Math.min(70, attemptCount * 12),
          `${lang} · ${variant.label} · PSM ${psm}`
        );

        const label = `${lang}/${variant.label}/PSM${psm}`;
        const result = await runSingleRecognize(
          canvas,
          lang,
          psm,
          variant.label,
          variant.key,
          poetryMode,
          label
        );

        if (!result) continue;

        const { candidate } = result;
        let scored = candidate;
        if (!poetryMode && isPoetryLayout(candidate.rawText)) {
          poetryMode = true;
          scored = scoreAttempt(result.attempt, true);
        }

        collected.push(scored);
        if (!best || compareOcrCandidates(scored, best) < 0) {
          best = scored;
        }

        if (passesEarlyExit(scored)) {
          break outer;
        }

        if (psm === 6) {
          continue;
        }
      }
    }

    if (best && passesEarlyExit(best)) {
      break;
    }
  }

  timer.endStage();

  report(95, "OCR 결과 정리 중...");
  const sorted = [...collected].sort(compareOcrCandidates);
  const topTwo = pickTopCandidates(collected, 2);
  best = topTwo[0] ?? best;

  const attempts: OcrAttemptLog[] = sorted.map((c) => ({
    source: c.source,
    sourceKey: c.sourceKey,
    lang: c.lang,
    psm: c.psm,
    rawText: c.rawText,
    textLength: c.rawText.length,
    confidence: c.confidence,
    koreanRatio: c.koreanRatio,
    specialCharRatio: c.specialCharRatio,
    sentenceCount: c.metrics.sentenceCount,
    avgWordLength: c.metrics.avgWordLength,
    readabilityScore: c.readabilityScore,
    workPhraseBonus: 0,
    combinedScore: c.combinedScore,
  }));

  const timing = timer.finish(attemptCount, imageLoadMs, ocrStartedAt);
  console.timeEnd("[OCR] total");

  report(100, "OCR 완료");

  const rawText = best?.rawText ?? "";
  const cleanedText = best?.cleanedText ?? "";
  const displayText = rawText;
  const confidencePercent = best?.confidence ?? 0;
  const lowConfidence = confidencePercent < MIN_OCR_CONFIDENCE_PERCENT;

  if (isOcrDebugEnabled()) {
    logFinalOcrText(rawText, displayText);
  }

  const topCandidates = topTwo.map((c, i) => toTopCandidate(c, i + 1));
  const debug: OcrDebugInfo | undefined = isOcrDebugEnabled()
    ? {
        attempts,
        variantSummaries: buildVariantSummaries(attempts, ["original", "grayscale", "threshold"]),
        topCandidates,
        poetryMode,
        selectedLang: best?.lang ?? "",
        selectedSource: best?.source ?? "",
        selectedSourceKey: best?.sourceKey ?? "",
        selectedPsm: best?.psm ?? 0,
        rawText,
        displayText,
        confidence: confidencePercent,
        koreanRatio: best?.koreanRatio ?? 0,
        specialCharRatio: best?.specialCharRatio ?? 0,
        sentenceCount: best?.metrics.sentenceCount ?? 0,
        avgWordLength: best?.metrics.avgWordLength ?? 0,
        readabilityScore: best?.readabilityScore ?? 0,
        workPhraseBonus: 0,
        combinedScore: best?.combinedScore ?? 0,
        trace: [
          `시 모드: ${poetryMode ? "ON" : "OFF"}`,
          `시도 ${attemptCount}회 · ${timing.totalMs}ms`,
          `선택: ${best?.lang ?? "-"} / ${best?.source ?? "없음"} / PSM ${best?.psm ?? "-"}`,
          `한글비율=${Math.round((best?.koreanRatio ?? 0) * 100)}% conf=${Math.round(confidencePercent)}%`,
        ],
      }
    : undefined;

  if (isOcrDebugEnabled()) {
    console.log("[OCR] debug", debug);
    console.log("[OCR] timing", timing);
  }

  return {
    text: displayText,
    rawText,
    cleanedText,
    confidence: confidencePercent,
    provider: TESSERACT_PROVIDER,
    success: displayText.length > 0 && !lowConfidence,
    psm: best?.psm,
    preprocessed: best?.sourceKey !== "original",
    lowConfidence,
    poetryMode,
    topCandidates,
    debug,
    timing,
  };
}
