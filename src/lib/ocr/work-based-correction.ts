import { loadLiteratureDatabase } from "@/lib/literature/load-database";
import { bestLineSimilarity } from "@/lib/literature/line-similarity";
import {
  bestLevenshteinSimilarity,
  lightNormalizeForCompare,
} from "@/lib/literature/levenshtein";
import { buildWorkSearchProfile } from "@/lib/literature/work-profile";
import type { WorkSearchMatch } from "@/lib/literature/types";
import {
  areConfusableChars,
  CORRECTION_HIGH_CONFIDENCE,
  OCR_CONFUSION_PAIRS,
  PHRASE_CORRECTION_MIN_SIMILARITY,
  WORK_MATCH_CORRECTION_THRESHOLD,
} from "@/lib/ocr/ocr-confusion-pairs";

export type CorrectionConfidence = "high" | "medium" | "low";

export interface CorrectionSuggestion {
  id: string;
  lineIndex: number;
  originalLine: string;
  correctedLine: string;
  matchedPhrase: string;
  workId: string;
  workTitle: string;
  workAuthor: string;
  similarity: number;
  confidence: CorrectionConfidence;
  method: "phrase" | "confusion";
  reasonLabel: string;
}

export interface WorkBasedCorrectionResult {
  eligible: boolean;
  topWorkMatch?: WorkSearchMatch;
  workCandidates: WorkSearchMatch[];
  suggestions: CorrectionSuggestion[];
  previewText: string;
}

const profilesById = new Map(
  loadLiteratureDatabase().works.map((work) => [work.id, buildWorkSearchProfile(work)])
);

function toConfidence(similarity: number): CorrectionConfidence {
  if (similarity >= CORRECTION_HIGH_CONFIDENCE) return "high";
  if (similarity >= PHRASE_CORRECTION_MIN_SIMILARITY) return "medium";
  return "low";
}

function buildReasonLabel(similarity: number): string {
  return `대표구절 일치 ${Math.round(similarity)}% · 작품DB 기반 교정`;
}

function substitutionCost(a: string, b: string): number {
  if (a === b) return 0;
  if (areConfusableChars(a, b)) return 0.25;
  return 1;
}

/** DP 정렬 — reference(대표 구절) 기준 교정안 생성 */
function alignToReference(ocrLine: string, referenceLine: string): string | null {
  const ocrChars = [...ocrLine.replace(/\s/g, "")];
  const refChars = [...referenceLine.replace(/\s/g, "")];
  if (ocrChars.length === 0 || refChars.length === 0) return null;

  const m = ocrChars.length;
  const n = refChars.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );

  for (let i = 1; i <= m; i++) dp[i][0] = i;
  for (let j = 1; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + substitutionCost(ocrChars[i - 1], refChars[j - 1])
      );
    }
  }

  const correctedChars: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    const subCost = substitutionCost(ocrChars[i - 1], refChars[j - 1]);
    if (dp[i][j] === dp[i - 1][j - 1] + subCost) {
      correctedChars.unshift(refChars[j - 1]);
      i--;
      j--;
    } else if (dp[i][j] === dp[i - 1][j] + 1) {
      i--;
    } else {
      correctedChars.unshift(refChars[j - 1]);
      j--;
    }
  }

  while (j > 0) {
    correctedChars.unshift(refChars[j - 1]);
    j--;
  }

  return rebuildLineWithSpacing(ocrLine, correctedChars.join(""));
}

function rebuildLineWithSpacing(originalLine: string, correctedCore: string): string {
  if (!originalLine.includes(" ")) return correctedCore;

  const refWords = correctedCore.match(/[가-힣]+/g) ?? [correctedCore];
  if (refWords.length <= 1) return correctedCore;

  return refWords.join(" ");
}

function applyConfusionRules(line: string): string {
  let result = line;
  for (const [wrong, right] of OCR_CONFUSION_PAIRS) {
    if (wrong.length === 1) continue;
    result = result.split(wrong).join(right);
  }
  return result;
}

function computePhraseSimilarity(ocrLine: string, referencePhrase: string): number {
  const ocrNorm = lightNormalizeForCompare(ocrLine);
  const refNorm = lightNormalizeForCompare(referencePhrase);
  if (!ocrNorm || !refNorm) return 0;
  if (ocrNorm === refNorm) return 100;

  const lineMatch = bestLineSimilarity(ocrLine, referencePhrase);
  const levBest = bestLevenshteinSimilarity(ocrLine, referencePhrase);
  const alignScore = alignmentSimilarityPercent(ocrNorm, refNorm);
  const tailScore = tailAnchoredSimilarity(ocrNorm, refNorm);
  const fragmentScore = shortFragmentSimilarity(ocrNorm, refNorm);

  return Math.min(
    100,
    Math.max(lineMatch.similarity, levBest, alignScore, tailScore, fragmentScore)
  );
}

function alignmentSimilarityPercent(ocrNorm: string, refNorm: string): number {
  const ocrChars = [...ocrNorm];
  const refChars = [...refNorm];
  const m = ocrChars.length;
  const n = refChars.length;
  if (m === 0 || n === 0) return 0;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );

  for (let i = 1; i <= m; i++) dp[i][0] = i;
  for (let j = 1; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + substitutionCost(ocrChars[i - 1], refChars[j - 1])
      );
    }
  }

  const dist = dp[m][n];
  const maxLen = Math.max(m, n);
  const sumLen = m + n;
  const maxRatio = Math.round((1 - dist / maxLen) * 100);
  const sumRatio = Math.round((1 - (2 * dist) / sumLen) * 100);
  return Math.max(maxRatio, sumRatio);
}

/** 공통 접미(시 구절 끝) 기준 유사도 — OCR 앞부분 누락·왜곡 허용 */
function tailAnchoredSimilarity(ocrNorm: string, refNorm: string): number {
  let sharedSuffix = 0;
  for (let len = Math.min(ocrNorm.length, refNorm.length); len >= 3; len--) {
    if (ocrNorm.slice(-len) === refNorm.slice(-len)) {
      sharedSuffix = len;
      break;
    }
  }

  if (sharedSuffix === 0) return 0;

  const ocrHead = ocrNorm.slice(0, -sharedSuffix);
  const refHead = refNorm.slice(0, -sharedSuffix);
  const headScore =
    ocrHead.length > 0 && refHead.length > 0
      ? alignmentSimilarityPercent(ocrHead, refHead)
      : 100;

  const suffixRatio = sharedSuffix / Math.max(ocrNorm.length, refNorm.length);
  const coverage = ocrNorm.length / refNorm.length;

  if (sharedSuffix >= 3 && coverage >= 0.5) {
    return Math.min(
      100,
      Math.max(82, Math.round(headScore * 0.35 + 100 * suffixRatio * 0.65))
    );
  }

  return Math.min(100, Math.round(headScore * 0.55 + 100 * suffixRatio * 0.45));
}

/** 짧은 OCR 발췌(2~5자) — 대표 구절 앞부분과 순서 일치 시 */
function shortFragmentSimilarity(ocrNorm: string, refNorm: string): number {
  if (ocrNorm.length > 5 || ocrNorm.length < 2) return 0;

  let refIndex = 0;
  for (const ch of ocrNorm) {
    const next = refNorm.indexOf(ch, refIndex);
    if (next === -1) return 0;
    refIndex = next + 1;
  }

  if (!refNorm.startsWith(ocrNorm[0])) return 0;

  const spanRatio = ocrNorm.length / refIndex;
  if (spanRatio < 0.35) return 0;

  return Math.min(100, Math.round(76 + spanRatio * 18 + ocrNorm.length * 2));
}

function buildCorrectedLine(
  ocrLine: string,
  referencePhrase: string,
  similarity: number
): string {
  const trimmed = ocrLine.trim();
  const ocrNorm = lightNormalizeForCompare(trimmed);
  const refNorm = lightNormalizeForCompare(referencePhrase);

  if (ocrNorm === refNorm) return trimmed;

  const aligned = alignToReference(trimmed, referencePhrase);

  if (refNorm.length > ocrNorm.length * 1.1 && similarity >= PHRASE_CORRECTION_MIN_SIMILARITY) {
    for (let len = Math.min(ocrNorm.length, 10); len >= 3; len--) {
      const suffix = ocrNorm.slice(-len);
      if (refNorm.includes(suffix)) {
        return referencePhrase;
      }
    }

    for (let len = Math.min(ocrNorm.length, 5); len >= 2; len--) {
      const prefix = ocrNorm.slice(0, len);
      if (refNorm.startsWith(prefix)) {
        return referencePhrase;
      }
    }
  }

  if (aligned) {
    const alignedNorm = lightNormalizeForCompare(aligned);
    if (alignedNorm !== ocrNorm) {
      if (refNorm.length > alignedNorm.length * 1.2 && similarity >= CORRECTION_HIGH_CONFIDENCE) {
        return referencePhrase;
      }
      return aligned;
    }
  }

  if (similarity >= PHRASE_CORRECTION_MIN_SIMILARITY) {
    return referencePhrase;
  }

  return aligned ?? trimmed;
}

export function correctLineWithPhrase(
  ocrLine: string,
  referencePhrase: string
): { corrected: string; similarity: number; method: "phrase" | "confusion" } | null {
  const trimmed = ocrLine.trim();
  if (trimmed.length < 2) return null;

  const similarity = computePhraseSimilarity(trimmed, referencePhrase);
  if (similarity < PHRASE_CORRECTION_MIN_SIMILARITY) return null;

  const corrected = buildCorrectedLine(trimmed, referencePhrase, similarity);
  if (lightNormalizeForCompare(corrected) === lightNormalizeForCompare(trimmed)) return null;

  const method: "phrase" | "confusion" =
    similarity >= CORRECTION_HIGH_CONFIDENCE ? "phrase" : "confusion";

  return { corrected, similarity, method };
}

function findBestLineCorrection(
  line: string,
  workIds: string[],
  priorityWorkId?: string
): Omit<CorrectionSuggestion, "id" | "lineIndex" | "originalLine"> | null {
  const orderedIds = priorityWorkId
    ? [priorityWorkId, ...workIds.filter((id) => id !== priorityWorkId)]
    : workIds;

  let best: Omit<CorrectionSuggestion, "id" | "lineIndex" | "originalLine"> | null = null;

  for (const workId of orderedIds) {
    const profile = profilesById.get(workId);
    if (!profile) continue;

    for (const phrase of profile.uniquePhrases) {
      const result = correctLineWithPhrase(line, phrase);
      if (!result) continue;

      const candidate = {
        correctedLine: result.corrected,
        matchedPhrase: phrase,
        workId,
        workTitle: profile.work.title,
        workAuthor: profile.work.author,
        similarity: result.similarity,
        confidence: toConfidence(result.similarity),
        method: result.method,
        reasonLabel: buildReasonLabel(result.similarity),
      };

      if (!best || candidate.similarity > best.similarity) {
        best = candidate;
      }
    }
  }

  return best;
}

export function applyCorrectionSuggestions(
  ocrText: string,
  suggestions: CorrectionSuggestion[],
  appliedIds: Set<string>
): string {
  const lines = ocrText.split("\n");

  for (const suggestion of suggestions) {
    if (!appliedIds.has(suggestion.id)) continue;
    if (suggestion.lineIndex >= 0 && suggestion.lineIndex < lines.length) {
      lines[suggestion.lineIndex] = suggestion.correctedLine;
    }
  }

  return lines.join("\n");
}

export function generateWorkBasedCorrections(
  ocrText: string,
  matches: WorkSearchMatch[]
): WorkBasedCorrectionResult {
  const workCandidates = matches.slice(0, 5);
  const topWorkMatch = workCandidates[0];
  const eligible = (topWorkMatch?.score ?? 0) >= WORK_MATCH_CORRECTION_THRESHOLD;

  if (!eligible || !ocrText.trim()) {
    return {
      eligible,
      topWorkMatch,
      workCandidates,
      suggestions: [],
      previewText: ocrText,
    };
  }

  const workIds = workCandidates.map((m) => m.workId);
  const rawLines = ocrText.split("\n");
  const suggestions: CorrectionSuggestion[] = [];

  rawLines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (trimmed.length < 2) return;

    const best = findBestLineCorrection(trimmed, workIds, topWorkMatch?.workId);
    if (!best || best.correctedLine === trimmed) return;
    if (best.confidence === "low") return;

    suggestions.push({
      id: `line-${lineIndex}`,
      lineIndex,
      originalLine: line,
      ...best,
    });
  });

  const previewIds = new Set(suggestions.map((s) => s.id));
  const previewText = applyCorrectionSuggestions(ocrText, suggestions, previewIds);

  return {
    eligible,
    topWorkMatch,
    workCandidates,
    suggestions,
    previewText,
  };
}

/** 단일 줄 confusion 규칙만 적용 (테스트·폴백) */
export function suggestConfusionCorrection(line: string): string {
  return applyConfusionRules(line);
}
