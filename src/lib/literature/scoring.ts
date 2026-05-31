import { findBestLineMatch } from "@/lib/literature/line-similarity";
import {
  fuzzyMatchInOcr,
  normalizeOcrText,
  normalizeTerm,
} from "@/lib/literature/normalize";
import type { MatchReason } from "@/lib/literature/types";
import type { WorkSearchProfile } from "@/lib/literature/work-profile";
import {
  isWeakKeyword,
  isWeakSingleWordTitle,
  SCORE_WEIGHTS,
} from "@/lib/literature/weak-keywords";

const EXACT_SIMILARITY = 90;
const PARTIAL_SIMILARITY = 55;

export interface WorkMatchMetrics {
  uniquePhraseScore: number;
  uniquePhraseExactCount: number;
  uniquePhrasePartialCount: number;
  titleMatched: boolean;
  authorMatched: boolean;
  keywordMatchCount: number;
  weakKeywordMatchCount: number;
  rawScore: number;
  hasStrongSignal: boolean;
  weakOnly: boolean;
}

export interface ScoredWorkResult {
  profile: WorkSearchProfile;
  metrics: WorkMatchMetrics;
  reasons: MatchReason[];
  score: number;
  confidence: number;
}

function reasonKey(reason: MatchReason): string {
  return `${reason.label}:${reason.matchedTerm}`;
}

function addReason(
  reasons: MatchReason[],
  seen: Set<string>,
  label: string,
  points: number,
  term: string,
  similarity: number
): void {
  if (points <= 0) return;
  const reason: MatchReason = { label, points, matchedTerm: term, similarity };
  const key = reasonKey(reason);
  if (seen.has(key)) return;
  seen.add(key);
  reasons.push(reason);
}

function ocrCandidates(ocrNorm: string, ocrPhrases: string[], sourceText: string): string[] {
  const lineNorms = sourceText
    .split(/\n+/)
    .map((l) => normalizeOcrText(l))
    .filter((l) => l.length >= 4);

  return uniqueCandidateStrings([
    ocrNorm,
    ...lineNorms,
    ...ocrPhrases.map((p) => normalizeOcrText(p)),
    ...ocrPhrases,
  ]);
}

function buildDualCandidates(
  rawNorm: string,
  rawPhrases: string[],
  rawText: string,
  cleanedNorm?: string,
  cleanedPhrases?: string[],
  cleanedText?: string
): string[] {
  const rawCandidates = ocrCandidates(rawNorm, rawPhrases, rawText);
  if (!cleanedText || !cleanedNorm || cleanedText.trim() === rawText.trim()) {
    return rawCandidates;
  }

  const cleanedCandidates = ocrCandidates(
    cleanedNorm,
    cleanedPhrases ?? [],
    cleanedText
  );

  return uniqueCandidateStrings([...rawCandidates, ...cleanedCandidates]);
}

function uniqueCandidateStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((c) => {
    if (!c || c.length < 3 || seen.has(c)) return false;
    seen.add(c);
    return true;
  });
}

function matchUniquePhrases(
  candidates: string[],
  phrases: string[],
  reasons: MatchReason[],
  seen: Set<string>
): { score: number; exact: number; partial: number } {
  let score = 0;
  let exact = 0;
  let partial = 0;
  const matchedPhrases = new Set<string>();

  for (const phrase of phrases) {
    if (matchedPhrases.has(phrase)) continue;

    const best = findBestLineMatch(candidates, [phrase]);
    if (!best || best.similarity < PARTIAL_SIMILARITY) continue;

    matchedPhrases.add(phrase);

    if (best.similarity >= EXACT_SIMILARITY) {
      exact++;
      score += SCORE_WEIGHTS.UNIQUE_PHRASE_EXACT;
      addReason(reasons, seen, "대표 구절", SCORE_WEIGHTS.UNIQUE_PHRASE_EXACT, phrase, best.similarity);
    } else {
      partial++;
      score += SCORE_WEIGHTS.UNIQUE_PHRASE_PARTIAL;
      addReason(reasons, seen, "대표 구절", SCORE_WEIGHTS.UNIQUE_PHRASE_PARTIAL, phrase, best.similarity);
    }
  }

  return { score, exact, partial };
}

function matchTitle(
  ocrNorm: string,
  profile: WorkSearchProfile,
  reasons: MatchReason[],
  seen: Set<string>
): { matched: boolean; points: number } {
  const titles = [profile.work.title, ...profile.aliases];
  const weakTitle = isWeakSingleWordTitle(profile.work.title);

  for (const title of titles) {
    const match = fuzzyMatchInOcr(ocrNorm, title);
    if (!match.matched || match.similarity < 85) continue;

    const points = weakTitle ? SCORE_WEIGHTS.TITLE_WEAK : SCORE_WEIGHTS.TITLE;
    addReason(reasons, seen, "작품명", points, title, match.similarity);
    return { matched: true, points };
  }
  return { matched: false, points: 0 };
}

function matchAuthor(
  ocrNorm: string,
  author: string,
  reasons: MatchReason[],
  seen: Set<string>
): { matched: boolean; points: number } {
  const match = fuzzyMatchInOcr(ocrNorm, author);
  if (!match.matched || match.similarity < 85) {
    return { matched: false, points: 0 };
  }
  addReason(reasons, seen, "작가", SCORE_WEIGHTS.AUTHOR, author, match.similarity);
  return { matched: true, points: SCORE_WEIGHTS.AUTHOR };
}

function isStrongTermMatch(ocrNorm: string, term: string, match: { matched: boolean; similarity: number }): boolean {
  if (!match.matched || match.similarity < 70) return false;

  const termNorm = normalizeTerm(term);
  if (!termNorm) return false;

  if (ocrNorm.includes(termNorm)) return true;
  if (ocrNorm === termNorm) return true;

  if (termNorm.includes(ocrNorm)) {
    if (isWeakKeyword(ocrNorm)) return false;
    const coverage = ocrNorm.length / termNorm.length;
    return coverage >= 0.45;
  }

  return true;
}

function matchKeywords(
  ocrNorm: string,
  keywords: string[],
  weakKeywords: string[],
  reasons: MatchReason[],
  seen: Set<string>
): { keywordCount: number; weakCount: number; score: number } {
  let keywordCount = 0;
  let weakCount = 0;
  let score = 0;

  for (const kw of keywords) {
    if (isWeakKeyword(kw) || weakKeywords.includes(kw.replace(/\s/g, ""))) continue;
    const match = fuzzyMatchInOcr(ocrNorm, kw);
    if (isStrongTermMatch(ocrNorm, kw, match)) {
      keywordCount++;
      score += SCORE_WEIGHTS.KEYWORD;
      addReason(reasons, seen, "핵심어", SCORE_WEIGHTS.KEYWORD, kw, match.similarity);
    }
  }

  for (const wk of weakKeywords) {
    const match = fuzzyMatchInOcr(ocrNorm, wk);
    if (match.matched && match.similarity >= 70) {
      weakCount++;
      score += SCORE_WEIGHTS.WEAK_KEYWORD;
      addReason(reasons, seen, "일반어", SCORE_WEIGHTS.WEAK_KEYWORD, wk, match.similarity);
    }
  }

  return { keywordCount, weakCount, score };
}

function computeConfidence(metrics: WorkMatchMetrics, workTitle: string): number {
  const phraseCount = metrics.uniquePhraseExactCount + metrics.uniquePhrasePartialCount;
  const strongTitleMatch =
    metrics.titleMatched && !isWeakSingleWordTitle(workTitle);

  const allow100 =
    strongTitleMatch ||
    phraseCount >= 3 ||
    (phraseCount >= 2 && metrics.authorMatched);

  let confidence =
    phraseCount * 19 +
    metrics.uniquePhraseExactCount * 2 +
    (strongTitleMatch ? 12 : metrics.titleMatched ? 3 : 0) +
    (metrics.authorMatched ? 8 : 0) +
    metrics.keywordMatchCount * 2;

  if (phraseCount >= 5) confidence = Math.max(confidence, 97);
  else if (phraseCount >= 4) confidence = Math.max(confidence, 96);
  else if (phraseCount >= 3) confidence = Math.max(confidence, 94);
  else if (phraseCount >= 2) confidence = Math.max(confidence, 88);
  else if (phraseCount >= 1) confidence = Math.max(confidence, 72);

  confidence = Math.min(SCORE_WEIGHTS.MAX_CONFIDENCE_DEFAULT, confidence);

  if (allow100) {
    confidence = Math.min(100, Math.max(confidence, phraseCount >= 4 ? 98 : 96));
  }

  return Math.round(confidence);
}

export interface ScoreWorkMatchOptions {
  /** 검색 보조용 정제 OCR */
  cleanedText?: string;
  cleanedPhrases?: string[];
}

export function scoreWorkMatch(
  profile: WorkSearchProfile,
  rawText: string,
  ocrPhrases: string[],
  options?: ScoreWorkMatchOptions
): ScoredWorkResult {
  const reasons: MatchReason[] = [];
  const seen = new Set<string>();

  const rawNorm = normalizeOcrText(rawText);
  const cleanedText = options?.cleanedText;
  const cleanedNorm = cleanedText ? normalizeOcrText(cleanedText) : undefined;
  const candidates = buildDualCandidates(
    rawNorm,
    ocrPhrases,
    rawText,
    cleanedNorm,
    options?.cleanedPhrases,
    cleanedText
  );

  const phraseResult = matchUniquePhrases(candidates, profile.uniquePhrases, reasons, seen);
  const titleResult = matchTitle(rawNorm, profile, reasons, seen);
  const authorResult = matchAuthor(rawNorm, profile.work.author, reasons, seen);
  const kwResult = matchKeywords(
    rawNorm,
    profile.keywords,
    profile.weakKeywords,
    reasons,
    seen
  );

  const rawScore =
    phraseResult.score +
    titleResult.points +
    authorResult.points +
    kwResult.score;

  const weakTitle = isWeakSingleWordTitle(profile.work.title);
  const titleStrong = titleResult.matched && !weakTitle;

  const hasStrongSignal =
    phraseResult.exact + phraseResult.partial > 0 ||
    titleStrong ||
    authorResult.matched ||
    kwResult.keywordCount > 0;

  const weakOnly =
    !hasStrongSignal &&
    (kwResult.weakCount > 0 || (titleResult.matched && weakTitle));

  const metrics: WorkMatchMetrics = {
    uniquePhraseScore: phraseResult.score,
    uniquePhraseExactCount: phraseResult.exact,
    uniquePhrasePartialCount: phraseResult.partial,
    titleMatched: titleResult.matched,
    authorMatched: authorResult.matched,
    keywordMatchCount: kwResult.keywordCount,
    weakKeywordMatchCount: kwResult.weakCount,
    rawScore,
    hasStrongSignal,
    weakOnly,
  };

  if (weakOnly || !hasStrongSignal) {
    return {
      profile,
      metrics,
      reasons: [],
      score: 0,
      confidence: 0,
    };
  }

  const confidence = computeConfidence(metrics, profile.work.title);

  return {
    profile,
    metrics,
    reasons,
    score: confidence,
    confidence,
  };
}

export function compareScoredWorks(a: ScoredWorkResult, b: ScoredWorkResult): number {
  const phraseA = a.metrics.uniquePhraseExactCount + a.metrics.uniquePhrasePartialCount;
  const phraseB = b.metrics.uniquePhraseExactCount + b.metrics.uniquePhrasePartialCount;

  return (
    b.metrics.uniquePhraseScore - a.metrics.uniquePhraseScore ||
    phraseB - phraseA ||
    b.confidence - a.confidence ||
    b.metrics.rawScore - a.metrics.rawScore
  );
}

export function normalizeForMatch(text: string): string {
  return normalizeTerm(text);
}
