import worksDatabase from "@/data/literature-works.json";
import { extractSearchPhrases } from "@/lib/literature/extract-phrases";
import {
  fuzzyMatchInOcr,
  normalizeOcrText,
  partialPoints,
} from "@/lib/literature/normalize";
import {
  AUTO_MATCH_THRESHOLD,
  MIN_MATCH_THRESHOLD,
  SCORE,
  TOP_MATCH_COUNT,
  type LiteratureWork,
  type LiteratureWorksDatabase,
  type MatchReason,
  type WorkSearchMatch,
  type WorkSearchResult,
} from "@/lib/literature/types";

const db = worksDatabase as LiteratureWorksDatabase;

export function getLiteratureWorks(): LiteratureWork[] {
  return db.works;
}

export function getDatabaseMeta() {
  return {
    ...db.meta,
    count: db.works.length,
  };
}

interface ScoredWork {
  work: LiteratureWork;
  score: number;
  reasons: MatchReason[];
}

function reasonKey(reason: MatchReason): string {
  return `${reason.label}:${reason.matchedTerm}`;
}

function addReason(
  reasons: MatchReason[],
  seen: Set<string>,
  label: string,
  basePoints: number,
  term: string,
  similarity: number
): number {
  const points = partialPoints(basePoints, similarity);
  if (points <= 0) return 0;

  const reason: MatchReason = { label, points, matchedTerm: term, similarity };
  const key = reasonKey(reason);
  if (seen.has(key)) return 0;

  seen.add(key);
  reasons.push(reason);
  return points;
}

function tryMatchTerms(
  ocrNorm: string,
  terms: string[],
  basePoints: number,
  labelFn: (term: string) => string,
  reasons: MatchReason[],
  seen: Set<string>
): number {
  let total = 0;
  for (const term of terms) {
    const match = fuzzyMatchInOcr(ocrNorm, term);
    if (match.matched) {
      total += addReason(
        reasons,
        seen,
        labelFn(term),
        basePoints,
        term,
        match.similarity
      );
    }
  }
  return total;
}

function scoreWork(work: LiteratureWork, ocrNorm: string): ScoredWork {
  const reasons: MatchReason[] = [];
  const seen = new Set<string>();
  let score = 0;

  score += tryMatchTerms(
    ocrNorm,
    [work.title, ...(work.aliases ?? [])],
    SCORE.TITLE_AUTHOR,
    () => "작품명 일치",
    reasons,
    seen
  );

  score += tryMatchTerms(
    ocrNorm,
    [work.author],
    SCORE.TITLE_AUTHOR,
    () => "작가명 일치",
    reasons,
    seen
  );

  score += tryMatchTerms(
    ocrNorm,
    work.properNouns ?? [],
    SCORE.PROPER_NOUN,
    (term) => `${term} 일치`,
    reasons,
    seen
  );

  score += tryMatchTerms(
    ocrNorm,
    work.materials ?? [],
    SCORE.MATERIAL,
    (term) => `${term} 일치`,
    reasons,
    seen
  );

  score += tryMatchTerms(
    ocrNorm,
    work.famousPhrases ?? [],
    SCORE.FAMOUS_PHRASE,
    (term) => `${term} 구절 일치`,
    reasons,
    seen
  );

  score += tryMatchTerms(
    ocrNorm,
    work.keywordAliases ?? [],
    SCORE.FAMOUS_PHRASE,
    (term) => `${term} 구절 일치`,
    reasons,
    seen
  );

  const genericKeywords = work.keywords.filter(
    (kw) =>
      !(work.properNouns ?? []).includes(kw) &&
      !(work.materials ?? []).includes(kw) &&
      !(work.famousPhrases ?? []).includes(kw)
  );

  score += tryMatchTerms(
    ocrNorm,
    genericKeywords,
    SCORE.GENERIC_KEYWORD,
    (term) => `${term} 키워드 일치`,
    reasons,
    seen
  );

  const cappedScore = Math.min(100, score);

  return { work, score: cappedScore, reasons };
}

function toWorkSearchMatch(item: ScoredWork): WorkSearchMatch {
  const topReason = [...item.reasons].sort((a, b) => b.points - a.points)[0];
  return {
    workId: item.work.id,
    title: item.work.title,
    author: item.work.author,
    genre: item.work.genre,
    source: item.work.source,
    confidence: item.score,
    score: item.score,
    matchReasons: item.reasons,
    matchedKeyword: topReason?.matchedTerm ?? item.work.title,
    matchedPhrase: topReason?.label ?? "",
  };
}

export function searchLiteratureWorks(text: string): WorkSearchResult {
  const normalizedText = normalizeOcrText(text);
  const phrases = extractSearchPhrases(text);

  if (!normalizedText || normalizedText.length < 8) {
    return { phrases, normalizedText, matches: [], notFound: true };
  }

  const scored = db.works
    .map((work) => scoreWork(work, normalizedText))
    .filter((item) => item.score >= MIN_MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score || b.reasons.length - a.reasons.length);

  const matches = scored.slice(0, TOP_MATCH_COUNT).map(toWorkSearchMatch);
  const autoMatch = matches.find((m) => m.score >= AUTO_MATCH_THRESHOLD);

  return {
    phrases,
    normalizedText,
    matches,
    autoMatch,
    notFound: matches.length === 0,
  };
}
