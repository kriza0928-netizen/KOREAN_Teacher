import type { WorkPhraseMatch } from "@/lib/ocr/work-phrase-bonus";
import type { TextQualityMetrics } from "@/lib/ocr/readability";

export type OcrLangMode = "kor" | "kor+eng";

export interface OcrCandidate {
  id: number;
  rawText: string;
  cleanedText: string;
  lang: OcrLangMode;
  psm: number;
  source: string;
  sourceKey: string;
  confidence: number;
  koreanRatio: number;
  specialCharRatio: number;
  readabilityScore: number;
  workPhraseBonus: number;
  combinedScore: number;
  workPhraseMatches: WorkPhraseMatch[];
  metrics: TextQualityMetrics;
}

export function compareOcrCandidates(a: OcrCandidate, b: OcrCandidate): number {
  return (
    b.combinedScore - a.combinedScore ||
    b.readabilityScore - a.readabilityScore ||
    b.koreanRatio - a.koreanRatio ||
    b.workPhraseBonus - a.workPhraseBonus ||
    a.specialCharRatio - b.specialCharRatio
  );
}

export function pickTopCandidates(candidates: OcrCandidate[], count = 3): OcrCandidate[] {
  const seen = new Set<string>();
  const unique: OcrCandidate[] = [];

  for (const candidate of [...candidates].sort(compareOcrCandidates)) {
    const key = candidate.cleanedText.slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
    if (unique.length >= count) break;
  }

  return unique;
}
