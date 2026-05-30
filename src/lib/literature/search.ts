import worksDatabase from "@/data/literature-works.json";
import { extractSearchPhrases } from "@/lib/literature/extract-phrases";
import { similarityPercent } from "@/lib/literature/similarity";
import {
  AUTO_MATCH_THRESHOLD,
  MIN_MATCH_THRESHOLD,
  TOP_MATCH_COUNT,
  type LiteratureWork,
  type LiteratureWorksDatabase,
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

interface WorkScore {
  work: LiteratureWork;
  confidence: number;
  matchedKeyword: string;
  matchedPhrase: string;
}

function scoreWorkAgainstPhrases(work: LiteratureWork, phrases: string[]): WorkScore | null {
  const searchTexts = [
    ...work.keywords,
    work.title,
    ...(work.aliases ?? []),
  ].filter(Boolean);

  let best: WorkScore | null = null;

  for (const phrase of phrases) {
    for (const keyword of searchTexts) {
      const confidence = similarityPercent(phrase, keyword);
      if (!best || confidence > best.confidence) {
        best = {
          work,
          confidence,
          matchedKeyword: keyword,
          matchedPhrase: phrase,
        };
      }
    }
  }

  return best;
}

export function searchLiteratureWorks(text: string): WorkSearchResult {
  const phrases = extractSearchPhrases(text);

  if (phrases.length === 0 || text.trim().length < 20) {
    return { phrases: [], matches: [], notFound: true };
  }

  const scored: WorkScore[] = [];

  for (const work of db.works) {
    const result = scoreWorkAgainstPhrases(work, phrases);
    if (result && result.confidence >= MIN_MATCH_THRESHOLD) {
      scored.push(result);
    }
  }

  scored.sort(
    (a, b) =>
      b.confidence - a.confidence ||
      b.matchedKeyword.length - a.matchedKeyword.length
  );

  const top = scored.slice(0, TOP_MATCH_COUNT);

  const matches: WorkSearchMatch[] = top.map((item) => ({
    workId: item.work.id,
    title: item.work.title,
    author: item.work.author,
    genre: item.work.genre,
    source: item.work.source,
    confidence: item.confidence,
    matchedKeyword: item.matchedKeyword,
    matchedPhrase: item.matchedPhrase,
  }));

  const autoMatch = matches.find((m) => m.confidence >= AUTO_MATCH_THRESHOLD);

  return {
    phrases,
    matches,
    autoMatch,
    notFound: matches.length === 0,
  };
}
