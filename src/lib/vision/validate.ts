import type { AnalysisResponse, AnalysisStatus, OcrMeta } from "@/types";
import { DEFAULT_DISCLAIMER } from "@/lib/rag";

export const VISION_PROVIDER = "gpt-4o-vision";

export const MIN_TEXT_LENGTH = 200;
export const MIN_OCR_CONFIDENCE_PERCENT = 80;
export const MIN_CLASSIFICATION_CONFIDENCE = 75;

export const INSUFFICIENT_TEXT_MESSAGE =
  "분석할 텍스트가 충분하지 않습니다.\nOCR 인식이 실패했거나 지문이 일부만 촬영되었습니다.";

export interface ExtractionValidationInput {
  text: string;
  success: boolean;
  confidence: number;
  provider: string;
}

export function normalizeExtractionConfidencePercent(confidence: number): number {
  if (confidence <= 1) {
    return Math.round(confidence * 100);
  }
  return Math.round(confidence);
}

export function isRealVisionProvider(provider: string): boolean {
  return provider === VISION_PROVIDER;
}

export function isRealOcrProvider(provider: string): boolean {
  return isRealVisionProvider(provider);
}

export function buildOcrMeta(input: {
  success: boolean;
  confidence: number;
  provider: string;
}): OcrMeta {
  return {
    success: input.success && isRealVisionProvider(input.provider),
    confidence: normalizeExtractionConfidencePercent(input.confidence),
    provider: input.provider,
  };
}

function buildBlockedResponse(
  status: AnalysisStatus,
  message: string,
  ocr: OcrMeta
): AnalysisResponse {
  return {
    status,
    message,
    ocr,
    disclaimer: DEFAULT_DISCLAIMER,
    ragContextUsed: false,
    ragSources: [],
  };
}

export function validatePreClassification(
  input: ExtractionValidationInput
): AnalysisResponse | null {
  const ocr = buildOcrMeta(input);
  const text = input.text.trim();

  if (!input.success || !isRealVisionProvider(input.provider) || !text) {
    return buildBlockedResponse(
      "ocr_invalid",
      "텍스트 추출에 실패했습니다. 지문이 선명하게 보이도록 다시 촬영해 주세요.",
      { ...ocr, success: false }
    );
  }

  if (text.length < MIN_TEXT_LENGTH) {
    return buildBlockedResponse("text_insufficient", INSUFFICIENT_TEXT_MESSAGE, ocr);
  }

  if (ocr.confidence < MIN_OCR_CONFIDENCE_PERCENT) {
    return buildBlockedResponse(
      "classification_deferred",
      "텍스트 추출 신뢰도가 80% 미만입니다. 분류 보류 — 지문을 더 선명하게 다시 촬영해 주세요.",
      ocr
    );
  }

  return null;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function isOcrConfigured(): boolean {
  return isAiConfigured();
}

export function isVisionConfigured(): boolean {
  return isAiConfigured();
}
