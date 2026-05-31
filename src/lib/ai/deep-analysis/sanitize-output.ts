import { computeKoreanRatio } from "@/lib/ocr/readability";

const NOISE_CHAR_PATTERN = /[※@|^=<>~`\\]/g;
const OCR_LOW_QUALITY_NOTICE =
  "OCR 품질이 낮아 작품 해설 중심으로 분석합니다.";

export { OCR_LOW_QUALITY_NOTICE };

export interface OcrQualityInput {
  confidence?: number;
  success?: boolean;
  textManuallyVerified?: boolean;
}

export function sanitizeAnalysisText(text: string): string {
  if (!text) return text;

  return text
    .replace(NOISE_CHAR_PATTERN, "")
    .replace(/\|[\s|]*\|/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function sanitizeStringArray(items: string[]): string[] {
  return items.map((item) => sanitizeAnalysisText(item)).filter(Boolean);
}

export function assessOcrQuality(text: string, ocr?: OcrQualityInput): "good" | "low" {
  if (ocr?.textManuallyVerified) return "good";

  const trimmed = text.trim();
  if (trimmed.length < 8) return "low";

  const confidence = ocr?.confidence ?? 0;
  const confidencePercent = confidence <= 1 ? confidence * 100 : confidence;
  const koreanRatio = computeKoreanRatio(trimmed);
  const hasNoise = NOISE_CHAR_PATTERN.test(trimmed) || /(?:^|\s)[A-Za-z]{2,}(?:\s|$)/.test(trimmed);

  if (!ocr?.success || confidencePercent < 70 || koreanRatio < 0.55 || hasNoise) {
    return "low";
  }

  return "good";
}

function normalizeForCompare(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

/** OCR 원문이 그대로 포함됐는지 검사 (40% 이상 겹치면 차단) */
export function containsOcrVerbatim(analysisText: string, ocrText: string): boolean {
  const normalizedAnalysis = normalizeForCompare(analysisText);
  const ocrLines = ocrText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.replace(/\s/g, "").length >= 6);

  for (const line of ocrLines) {
    const normalizedLine = normalizeForCompare(line);
    if (normalizedLine.length >= 6 && normalizedAnalysis.includes(normalizedLine)) {
      return true;
    }
  }

  return false;
}

export function sanitizeReportValue<T>(value: T, ocrText?: string): T {
  if (typeof value === "string") {
    let cleaned = sanitizeAnalysisText(value);
    if (ocrText && containsOcrVerbatim(cleaned, ocrText)) {
      cleaned = cleaned
        .split("\n")
        .filter((line) => !containsOcrVerbatim(line, ocrText))
        .join("\n")
        .trim();
    }
    return cleaned as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeReportValue(item, ocrText)) as T;
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizeReportValue(nested, ocrText);
    }
    return result as T;
  }

  return value;
}
