"use client";

type TesseractPage = {
  text?: string | null;
  confidence?: number | null;
  blocks?: Array<{
    text?: string;
    confidence?: number;
    paragraphs?: Array<{
      text?: string;
      lines?: Array<{
        text?: string;
        words?: Array<{ text?: string; confidence?: number }>;
      }>;
    }>;
  }> | null;
};

export interface OcrAttemptLog {
  source: string;
  psm: number;
  rawText: string;
  textLength: number;
  confidence: number;
  score: number;
}

export interface OcrDebugInfo {
  attempts: OcrAttemptLog[];
  selectedSource: string;
  selectedPsm: number;
  rawText: string;
  displayText: string;
  confidence: number;
  trace: string[];
}

export function logTesseractRecognizeResult(label: string, result: unknown): void {
  console.log(`[OCR ${label}] result`, result);
  const data = (result as { data?: TesseractPage })?.data;
  if (data) {
    console.log(`[OCR ${label}] result.data.text`, data.text);
    console.log(`[OCR ${label}] result.data.text.length`, data.text?.length ?? 0);
    console.log(`[OCR ${label}] result.data.confidence`, data.confidence);
  }
}

/** OCR 텍스트 — substring/slice/split 등 후처리 없이 원본 그대로 */
export function extractRawOcrText(data: TesseractPage): string {
  const direct = data.text ?? "";
  if (direct.trim().length > 0) {
    return direct.replace(/\0/g, "");
  }

  const fromBlocks = collectTextFromBlocks(data.blocks);
  if (fromBlocks.trim().length > 0) {
    return fromBlocks.replace(/\0/g, "");
  }

  return "";
}

function collectTextFromBlocks(blocks: TesseractPage["blocks"]): string {
  if (!blocks) return "";
  return blocks
    .map((block) => {
      if (block.text?.trim()) return block.text;
      return (block.paragraphs ?? [])
        .map((p) => {
          if (p.text?.trim()) return p.text;
          return (p.lines ?? []).map((line) => line.text ?? "").join("\n");
        })
        .join("\n\n");
    })
    .join("\n\n");
}

/** 표시용 텍스트 — 현재는 trim만 적용 (내용 자르기 없음) */
export function toDisplayText(rawText: string): string {
  return rawText.trim();
}

/**
 * Tesseract confidence (MeanTextConf)와 실제 텍스트 품질을 분리 계산.
 * 짧은 오인식(예: "1"만 87%)이 긴 정상 텍스트보다 선택되지 않도록 score 사용.
 */
export function computeOcrConfidence(data: TesseractPage, rawText: string): number {
  const words = collectWordsFromBlocks(data.blocks);
  if (words.length > 0) {
    let weighted = 0;
    let weight = 0;
    for (const word of words) {
      const len = Math.max(word.text?.trim().length ?? 0, 1);
      weighted += (word.confidence ?? 0) * len;
      weight += len;
    }
    if (weight > 0) return weighted / weight;
  }

  if (typeof data.confidence === "number" && data.confidence > 0) {
    return data.confidence;
  }

  return estimateConfidenceFromText(rawText);
}

function collectWordsFromBlocks(
  blocks: TesseractPage["blocks"]
): Array<{ text?: string; confidence?: number }> {
  if (!blocks) return [];
  const words: Array<{ text?: string; confidence?: number }> = [];
  for (const block of blocks) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        words.push(...(line.words ?? []));
      }
    }
  }
  return words;
}

export function estimateConfidenceFromText(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const koreanRatio =
    (trimmed.match(/[가-힣]/g)?.length ?? 0) / Math.max(trimmed.length, 1);
  return Math.min(65, Math.round(30 + koreanRatio * 35));
}

export function scoreOcrCandidate(text: string, confidence: number): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const len = trimmed.length;
  const koreanCount = trimmed.match(/[가-힣]/g)?.length ?? 0;
  const lengthFactor = Math.min(1, len / 30);
  const koreanFactor = Math.min(1, koreanCount / 15);

  // 1~2자짜리 고 confidence 오인식(예: "1") 페널티
  const shortTextPenalty = len <= 2 ? 0.15 : len <= 5 ? 0.5 : 1;

  return confidence * shortTextPenalty * (0.25 + 0.45 * lengthFactor + 0.3 * koreanFactor);
}

export function logFinalOcrText(rawText: string, displayText: string): void {
  console.log("[OCR] text.length", displayText.length);
  console.log("[OCR] text", displayText);
  console.log("[OCR] rawText.length", rawText.length);
  console.log("[OCR] rawText", rawText);
  if (rawText !== displayText) {
    console.warn("[OCR] rawText와 displayText가 다릅니다.", { rawText, displayText });
  }
}

export function formatOcrDebugBlock(rawText: string): string {
  const body = rawText.length > 0 ? rawText : "(빈 OCR 결과)";
  return `----- OCR 원본 -----\n${body}\n--------------------`;
}
