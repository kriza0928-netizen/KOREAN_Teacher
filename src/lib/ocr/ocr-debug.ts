"use client";

/** NEXT_PUBLIC_OCR_DEBUG=true 일 때만 상세 OCR 로그·패널 표시 */
export function isOcrDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_OCR_DEBUG === "true";
}

type TesseractPage = {
  text?: string | null;
  confidence?: number | null;
  blocks?: Array<{
    text?: string;
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
  sourceKey: string;
  lang: string;
  psm: number;
  rawText: string;
  textLength: number;
  confidence: number;
  koreanRatio: number;
  specialCharRatio: number;
  sentenceCount: number;
  avgWordLength: number;
  readabilityScore: number;
  workPhraseBonus: number;
  combinedScore: number;
}

export interface OcrTopCandidate {
  rank: number;
  lang: string;
  source: string;
  psm: number;
  rawText: string;
  cleanedText: string;
  koreanRatio: number;
  specialCharRatio: number;
  readabilityScore: number;
  workPhraseBonus: number;
  combinedScore: number;
  matchedWork?: string;
}

export interface OcrVariantSummary {
  sourceKey: string;
  label: string;
  bestText: string;
  bestPsm: number;
  confidence: number;
  koreanRatio: number;
  sentenceCount: number;
  avgWordLength: number;
  readabilityScore: number;
}

export interface OcrDebugInfo {
  attempts: OcrAttemptLog[];
  variantSummaries: OcrVariantSummary[];
  topCandidates: OcrTopCandidate[];
  poetryMode: boolean;
  selectedLang: string;
  selectedSource: string;
  selectedSourceKey: string;
  selectedPsm: number;
  rawText: string;
  displayText: string;
  confidence: number;
  koreanRatio: number;
  specialCharRatio: number;
  sentenceCount: number;
  avgWordLength: number;
  readabilityScore: number;
  workPhraseBonus: number;
  combinedScore: number;
  trace: string[];
}

export function logTesseractRecognizeResult(label: string, result: unknown): void {
  if (!isOcrDebugEnabled()) return;
  console.log(`[OCR ${label}] result`, result);
  const data = (result as { data?: TesseractPage })?.data;
  if (data) {
    console.log(`[OCR ${label}] result.data.text`, data.text);
    console.log(`[OCR ${label}] result.data.text.length`, data.text?.length ?? 0);
    console.log(`[OCR ${label}] result.data.confidence`, data.confidence);
  }
}

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

  const lines: string[] = [];
  for (const block of blocks) {
    for (const paragraph of block.paragraphs ?? []) {
      if (paragraph.lines?.length) {
        for (const line of paragraph.lines) {
          const t = line.text?.trim();
          if (t) lines.push(t);
        }
        continue;
      }
      const pText = paragraph.text?.trim();
      if (pText) lines.push(...pText.split(/\n+/).map((l) => l.trim()).filter(Boolean));
    }

    if (!block.paragraphs?.length && block.text?.trim()) {
      lines.push(...block.text.split(/\n+/).map((l) => l.trim()).filter(Boolean));
    }
  }

  return lines.join("\n");
}

export function toDisplayText(rawText: string): string {
  return rawText.replace(/\0/g, "").replace(/\r\n/g, "\n").trim();
}

export function computeOcrConfidence(data: TesseractPage): number {
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

  return 0;
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

export function logFinalOcrText(rawText: string, displayText: string): void {
  if (!isOcrDebugEnabled()) return;
  console.log("[OCR] text.length", displayText.length);
  console.log("[OCR] text", displayText);
  console.log("[OCR] rawText.length", rawText.length);
  console.log("[OCR] rawText", rawText);
}

export function formatOcrDebugBlock(title: string, rawText: string): string {
  const body = rawText.length > 0 ? rawText : "(빈 OCR 결과)";
  return `----- ${title} -----\n${body}\n${"-".repeat(Math.max(20, title.length + 10))}`;
}

export function buildVariantSummaries(
  attempts: OcrAttemptLog[],
  debugKeys: string[]
): OcrVariantSummary[] {
  return debugKeys.map((sourceKey) => {
    const variantAttempts = attempts.filter((a) => a.sourceKey === sourceKey);
    const best = [...variantAttempts].sort(
      (a, b) =>
        b.combinedScore - a.combinedScore ||
        b.readabilityScore - a.readabilityScore ||
        b.koreanRatio - a.koreanRatio ||
        b.textLength - a.textLength
    )[0];

    return {
      sourceKey,
      label: best?.source ?? sourceKey,
      bestText: best?.rawText ?? "",
      bestPsm: best?.psm ?? 0,
      confidence: best?.confidence ?? 0,
      koreanRatio: best?.koreanRatio ?? 0,
      sentenceCount: best?.sentenceCount ?? 0,
      avgWordLength: best?.avgWordLength ?? 0,
      readabilityScore: best?.readabilityScore ?? 0,
    };
  });
}
