import type { AnalysisResponse, AnalysisStatus, OcrMeta } from "@/types";
import { DEFAULT_DISCLAIMER } from "@/lib/rag";

export const OCR_BLOCKED_PHRASES = [
  "OCR API 키가 설정되지 않아",
  "샘플 텍스트",
  "GOOGLE_CLOUD_VISION_API_KEY",
  "OCR_PROVIDER",
  "[MVP 데모]",
] as const;

export const MIN_TEXT_LENGTH = 200;
export const MIN_OCR_CONFIDENCE_PERCENT = 80;
export const MIN_CLASSIFICATION_CONFIDENCE = 75;

export const INSUFFICIENT_TEXT_MESSAGE =
  "분석할 텍스트가 충분하지 않습니다.\nOCR 인식이 실패했거나 지문이 일부만 촬영되었습니다.";

export interface OcrValidationInput {
  text: string;
  success: boolean;
  confidence: number;
  provider: string;
}

export function normalizeOcrConfidencePercent(confidence: number): number {
  if (confidence <= 1) {
    return Math.round(confidence * 100);
  }
  return Math.round(confidence);
}

export function containsBlockedOcrContent(text: string): boolean {
  return OCR_BLOCKED_PHRASES.some((phrase) => text.includes(phrase));
}

export function isRealOcrProvider(provider: string): boolean {
  return provider !== "mock" && provider.length > 0;
}

export function buildOcrMeta(input: {
  success: boolean;
  confidence: number;
  provider: string;
}): OcrMeta {
  return {
    success: input.success && isRealOcrProvider(input.provider),
    confidence: normalizeOcrConfidencePercent(input.confidence),
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

/**
 * OCR → 길이 → OCR 신뢰도 검증
 * 통과 시 null, 실패 시 차단 응답 반환
 */
export function validatePreClassification(
  input: OcrValidationInput
): AnalysisResponse | null {
  const ocr = buildOcrMeta(input);
  const text = input.text.trim();

  if (
    !input.success ||
    !isRealOcrProvider(input.provider) ||
    containsBlockedOcrContent(text)
  ) {
    return buildBlockedResponse(
      "ocr_invalid",
      "OCR API가 설정되지 않았거나 OCR 인식에 실패했습니다. Google Cloud Vision API를 설정한 뒤 다시 촬영해 주세요.",
      { ...ocr, success: false }
    );
  }

  if (text.length < MIN_TEXT_LENGTH) {
    return buildBlockedResponse("text_insufficient", INSUFFICIENT_TEXT_MESSAGE, ocr);
  }

  if (ocr.confidence < MIN_OCR_CONFIDENCE_PERCENT) {
    return buildBlockedResponse(
      "classification_deferred",
      "OCR 신뢰도가 80% 미만입니다. 분류 보류 — 지문을 더 선명하게 다시 촬영하거나 OCR 결과를 수정해 주세요.",
      ocr
    );
  }

  return null;
}

export function isOcrConfigured(): boolean {
  const provider = process.env.OCR_PROVIDER ?? "mock";
  if (provider !== "google-vision") return false;
  return Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY);
}

export function isAiConfigured(): boolean {
  const provider = process.env.AI_PROVIDER ?? "mock";
  if (provider === "mock") return false;
  return Boolean(process.env.OPENAI_API_KEY);
}
