import type { LiteratureWork, LiteratureWorksDatabase } from "@/lib/literature/types";
import { expandLineVariants } from "@/lib/literature/line-similarity";
import { isWeakKeyword } from "@/lib/literature/weak-keywords";
import { TEXTBOOK_CURATED } from "./data/curated";
import type { TextbookWorkEnrichment } from "./types";

export type { TextbookWorkEnrichment, TextbookEnrichmentMap } from "./types";
export { TEXTBOOK_CURATED } from "./data/curated";

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function buildUniquePhrases(lines: string[]): string[] {
  return expandLineVariants(
    unique(lines).filter((line) => line.replace(/\s/g, "").length >= 4)
  ).slice(0, 28);
}

function mergeEnrichment(
  work: LiteratureWork,
  curated?: TextbookWorkEnrichment
): LiteratureWork {
  if (!curated) {
    return autoEnrichWork(work);
  }

  const phraseSource = unique([
    ...(curated.uniquePhrases ?? []),
    ...curated.representativeLines,
    ...(work.uniquePhrases ?? []),
    ...(work.famousPhrases ?? []),
    ...(work.keywordAliases ?? []),
  ]).filter((line) => !isWeakKeyword(line.replace(/\s/g, "")) || line.length >= 8);

  const uniquePhrases = buildUniquePhrases(phraseSource);
  const searchKeywords = unique([
    ...(curated.keyWords ?? []),
    ...(work.searchKeywords ?? []),
    ...(work.keywords ?? []),
  ]).filter((k) => !isWeakKeyword(k.replace(/\s/g, "")));

  const weakKeywords = unique([
    ...(curated.weakKeywords ?? []),
    ...(work.weakKeywords ?? []),
    ...curated.keyWords.filter((k) => isWeakKeyword(k.replace(/\s/g, ""))),
  ]);

  return {
    ...work,
    isTextbook: work.isTextbook ?? true,
    uniquePhrases,
    representativeLines: uniquePhrases,
    searchKeywords,
    keywords: searchKeywords.length > 0 ? searchKeywords : work.keywords,
    weakKeywords,
    themes: unique([...(curated.themes ?? []), ...(work.themes ?? [])]),
    symbols: unique([...(curated.symbols ?? []), ...(work.symbols ?? [])]),
    emotions: unique([...(curated.emotions ?? []), ...(work.emotions ?? [])]),
    keyWords: searchKeywords,
    theme: work.theme ?? curated.themes.join(", "),
  };
}

function autoEnrichWork(work: LiteratureWork): LiteratureWork {
  const distinctive = unique([
    ...(work.uniquePhrases ?? []),
    ...(work.representativeLines ?? []),
    ...(work.famousPhrases ?? []),
    ...(work.keywordAliases ?? []),
    ...work.keywords.filter((k) => k.length >= 8),
  ]).filter((line) => line.replace(/\s/g, "").length >= 6);

  const uniquePhrases = buildUniquePhrases(distinctive);
  const searchKeywords = unique([
    ...(work.searchKeywords ?? []),
    ...work.keywords,
  ]).filter((k) => !isWeakKeyword(k.replace(/\s/g, "")) && k.length >= 2);

  return {
    ...work,
    uniquePhrases,
    representativeLines: uniquePhrases,
    searchKeywords,
    weakKeywords: unique([
      ...(work.weakKeywords ?? []),
      ...work.keywords.filter((k) => isWeakKeyword(k.replace(/\s/g, ""))),
    ]),
    keyWords: searchKeywords,
  };
}

/** 교과서 enrichment를 literature-works.json에 병합 */
export function applyTextbookEnrichment(db: LiteratureWorksDatabase): LiteratureWorksDatabase {
  const works = db.works.map((work) => mergeEnrichment(work, TEXTBOOK_CURATED[work.id]));

  return {
    ...db,
    meta: {
      ...db.meta,
      version: "3.1.0",
      description: "교과서 수록 작품 DB — uniquePhrases·keywords·weakKeywords",
      count: works.length,
      updatedAt: new Date().toISOString().slice(0, 10),
    },
    works,
  };
}

export function getTextbookEnrichment(workId: string): TextbookWorkEnrichment | undefined {
  return TEXTBOOK_CURATED[workId];
}
