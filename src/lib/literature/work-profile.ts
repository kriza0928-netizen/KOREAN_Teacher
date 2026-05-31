import type { LiteratureWork } from "@/lib/literature/types";
import { expandLineVariants } from "@/lib/literature/line-similarity";
import { GLOBAL_WEAK_KEYWORDS, isWeakKeyword } from "@/lib/literature/weak-keywords";

/** 검색 엔진용 정규화된 작품 프로필 */
export interface WorkSearchProfile {
  work: LiteratureWork;
  /** 작품 특정 대표 구절 (최우선) */
  uniquePhrases: string[];
  /** 핵심어 (+10) */
  keywords: string[];
  /** 일반어 (+1, 단독 후보 불가) */
  weakKeywords: string[];
  themes: string[];
  symbols: string[];
  aliases: string[];
  isTextbook: boolean;
}

function uniqueStrings(items: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (!item?.trim()) continue;
    const key = item.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

function isTextbookSource(source?: string): boolean {
  if (!source) return false;
  return /교과서|수능|내신|EBS|모의고사/.test(source);
}

function inferWeakKeywords(work: LiteratureWork, keywords: string[]): string[] {
  const explicit = work.weakKeywords ?? [];
  const fromTitle =
    work.title.length <= 2 || GLOBAL_WEAK_KEYWORDS.has(work.title)
      ? [work.title]
      : [];
  const weakFromKw = keywords.filter((k) => isWeakKeyword(k));
  return uniqueStrings([...explicit, ...fromTitle, ...weakFromKw]);
}

function buildUniquePhrases(work: LiteratureWork): string[] {
  const base = uniqueStrings([
    ...(work.uniquePhrases ?? []),
    ...(work.representativeLines ?? []),
    ...(work.famousPhrases ?? []),
    ...(work.keywordAliases ?? []),
  ]).filter((line) => line.replace(/\s/g, "").length >= 4);

  return expandLineVariants(base).slice(0, 30);
}

function buildKeywords(work: LiteratureWork): string[] {
  return uniqueStrings([
    ...(work.searchKeywords ?? []),
    ...(work.keywords ?? work.keyWords ?? []),
    ...(work.textbookKeywords ?? []),
  ]).filter((k) => !isWeakKeyword(k.replace(/\s/g, "")) && k.length >= 2);
}

export function buildWorkSearchProfile(work: LiteratureWork): WorkSearchProfile {
  const keywords = buildKeywords(work);
  const weakKeywords = inferWeakKeywords(work, [
    ...keywords,
    ...(work.keywords ?? []),
  ]);

  return {
    work,
    uniquePhrases: buildUniquePhrases(work),
    keywords,
    weakKeywords,
    themes: work.themes ?? (work.theme ? [work.theme] : []),
    symbols: work.symbols ?? work.materials ?? [],
    aliases: uniqueStrings([...(work.aliases ?? []), work.title.replace(/\s/g, "")]),
    isTextbook: work.isTextbook ?? isTextbookSource(work.source),
  };
}

export const MAJOR_TEXTBOOK_AUTHORS = [
  "기형도", "윤동주", "김소월", "이육사", "정지용", "김영랑", "박목월", "한용운",
  "현진건", "이효석", "이상", "박경리", "황순원", "최인훈", "김동인", "염상섭",
];
