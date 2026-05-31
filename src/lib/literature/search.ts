import { loadLiteratureDatabase } from "@/lib/literature/load-database";
import { extractOcrSearchFeatures } from "@/lib/literature/extract-features";
import { extractSearchPhrases } from "@/lib/literature/extract-phrases";
import { normalizeOcrText } from "@/lib/literature/normalize";
import { compareScoredWorks, scoreWorkMatch } from "@/lib/literature/scoring";
import { buildWorkSearchProfile } from "@/lib/literature/work-profile";
import { postProcessOcrText, preserveRawOcrText } from "@/lib/ocr/post-process";
import {
  AUTO_MATCH_THRESHOLD,
  TOP_MATCH_COUNT,
  type WorkSearchMatch,
  type WorkSearchResult,
  type LiteratureWork,
} from "@/lib/literature/types";

const db = loadLiteratureDatabase();
const profiles = db.works.map(buildWorkSearchProfile);

export function getLiteratureWorks(): LiteratureWork[] {
  return db.works;
}

export function getDatabaseMeta() {
  return {
    ...db.meta,
    count: db.works.length,
  };
}

function toWorkSearchMatch(item: ReturnType<typeof scoreWorkMatch>): WorkSearchMatch {
  const work = item.profile.work;
  const topReasons = [...item.reasons]
    .filter((r) => r.label !== "일반어")
    .sort((a, b) => b.points - a.points);
  const topReason = topReasons[0] ?? item.reasons[0];

  return {
    workId: work.id,
    title: work.title,
    author: work.author,
    genre: work.genre,
    source: work.source,
    confidence: item.confidence,
    score: item.confidence,
    matchReasons: item.reasons,
    matchedKeyword: topReason?.matchedTerm ?? work.title,
    matchedPhrase: topReason?.label ?? "",
  };
}

export { getWorkById, enrichWorkSelection } from "@/lib/literature/enrich-work-selection";

export function searchLiteratureWorks(
  text: string,
  options?: { rawText?: string; cleanedText?: string }
): WorkSearchResult {
  const rawText = preserveRawOcrText(options?.rawText ?? text);
  const cleanedText = options?.cleanedText ?? postProcessOcrText(rawText);
  const normalizedText = normalizeOcrText(rawText);
  const cleanedNormalizedText = normalizeOcrText(cleanedText);
  const phrases = extractSearchPhrases(rawText);
  const cleanedPhrases = extractSearchPhrases(cleanedText);
  const features = extractOcrSearchFeatures(rawText);

  if (
    (!normalizedText || normalizedText.length < 6) &&
    (!cleanedNormalizedText || cleanedNormalizedText.length < 6)
  ) {
    return {
      phrases,
      normalizedText,
      cleanedText,
      cleanedNormalizedText,
      matches: [],
      notFound: true,
      extractedFeatures: features,
    };
  }

  const scored = profiles
    .map((profile) =>
      scoreWorkMatch(profile, rawText, phrases, {
        cleanedText,
        cleanedPhrases,
      })
    )
    .filter((item) => item.confidence > 0)
    .sort(compareScoredWorks);

  const matches = scored.slice(0, TOP_MATCH_COUNT).map(toWorkSearchMatch);
  const autoMatch = matches.find((m) => m.score >= AUTO_MATCH_THRESHOLD);

  return {
    phrases,
    normalizedText,
    cleanedText,
    cleanedNormalizedText,
    matches,
    autoMatch,
    notFound: matches.length === 0,
    extractedFeatures: features,
  };
}

export { extractOcrSearchFeatures, summarizeFeatures } from "@/lib/literature/extract-features";
export { scoreWorkMatch, compareScoredWorks } from "@/lib/literature/scoring";
