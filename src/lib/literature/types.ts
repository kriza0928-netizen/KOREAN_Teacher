export interface LiteratureWork {
  id: string;
  title: string;
  author: string;
  genre?: string;
  era?: string;
  source?: string;
  keywords: string[];
  /** OCR 오타·띄어쓰기 변형 구절 */
  keywordAliases?: string[];
  /** 고유명사 (+40점) */
  properNouns?: string[];
  /** 핵심 소재 (+25점) */
  materials?: string[];
  /** 유명 구절 (+30점) */
  famousPhrases?: string[];
  aliases?: string[];
}

export interface LiteratureWorksDatabase {
  meta: {
    version: string;
    description: string;
    targetCount: number;
    count: number;
    updatedAt: string;
    fields?: Record<string, string>;
  };
  works: LiteratureWork[];
}

export interface MatchReason {
  label: string;
  points: number;
  matchedTerm: string;
  similarity: number;
}

export interface WorkSearchMatch {
  workId: string;
  title: string;
  author: string;
  genre?: string;
  source?: string;
  /** 검색 점수 0~100 */
  confidence: number;
  score: number;
  matchReasons: MatchReason[];
  matchedKeyword: string;
  matchedPhrase: string;
}

export interface WorkSearchResult {
  phrases: string[];
  normalizedText: string;
  matches: WorkSearchMatch[];
  autoMatch?: WorkSearchMatch;
  notFound: boolean;
}

export const AUTO_MATCH_THRESHOLD = 85;
export const MIN_MATCH_THRESHOLD = 60;
export const TOP_MATCH_COUNT = 5;
export const PHRASE_COUNT_MIN = 3;
export const PHRASE_COUNT_MAX = 5;

export const SCORE = {
  TITLE_AUTHOR: 50,
  PROPER_NOUN: 40,
  FAMOUS_PHRASE: 30,
  MATERIAL: 25,
  GENERIC_KEYWORD: 20,
} as const;
