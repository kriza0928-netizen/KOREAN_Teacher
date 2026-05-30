import type { AnalysisResponse, AnalysisStatus, OcrMeta } from "@/types";
import { DEFAULT_DISCLAIMER } from "@/lib/rag";
import { TESSERACT_PROVIDER } from "@/lib/providers/ocr/types";

export { TESSERACT_PROVIDER };

export const MIN_TEXT_LENGTH = 50;
export const MIN_OCR_CONFIDENCE_PERCENT = 70;
export const MIN_CLASSIFICATION_CONFIDENCE = 75;

export const INSUFFICIENT_TEXT_MESSAGE =
  "분석할 텍스트가 충분하지 않습니다.\nOCR 인식이 실패했거나 지문이 일부만 촬영되었습니다.";

export const LOW_OCR_CONFIDENCE_MESSAGE =
  "OCR 정확도가 낮습니다. 더 선명한 사진을 사용하거나 텍스트를 직접 붙여넣어 주세요.";

export interface ExtractionValidationInput {
  text: string;
  success: boolean;
  confidence: number;
  provider: string;
  textManuallyVerified?: boolean;
}

const VALID_PROVIDERS = [TESSERACT_PROVIDER, "google-vision", "gpt-4o-vision"];

export function normalizeExtractionConfidencePercent(confidence: number): number {
  if (confidence <= 1) {
    return Math.round(confidence * 100);
  }
  return Math.round(confidence);
}

export function isValidOcrProvider(provider: string): boolean {
  return VALID_PROVIDERS.includes(provider);
}

export function buildOcrMeta(input: {
  success: boolean;
  confidence: number;
  provider: string;
}): OcrMeta {
  return {
    success: input.success && isValidOcrProvider(input.provider),
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
    isDraft: false,
    analysisProvider: "rule-based",
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

  if (!input.success || !isValidOcrProvider(input.provider) || !text) {
    return buildBlockedResponse(
      "ocr_invalid",
      "텍스트 추출에 실패했습니다. 지문이 선명하게 보이도록 다시 촬영하거나 텍스트를 직접 입력해 주세요.",
      { ...ocr, success: false }
    );
  }

  if (
    !input.textManuallyVerified &&
    ocr.confidence < MIN_OCR_CONFIDENCE_PERCENT
  ) {
    return buildBlockedResponse("ocr_invalid", LOW_OCR_CONFIDENCE_MESSAGE, ocr);
  }

  if (text.length < MIN_TEXT_LENGTH) {
    return buildBlockedResponse("text_insufficient", INSUFFICIENT_TEXT_MESSAGE, ocr);
  }

  return null;
}
