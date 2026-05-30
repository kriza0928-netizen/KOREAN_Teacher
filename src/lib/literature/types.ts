export interface LiteratureWork {
  id: string;
  title: string;
  author: string;
  genre?: string;
  era?: string;
  source?: string;
  keywords: string[];
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

export interface WorkSearchMatch {
  workId: string;
  title: string;
  author: string;
  genre?: string;
  source?: string;
  /** 0~100 */
  confidence: number;
  matchedKeyword: string;
  matchedPhrase: string;
}

export interface WorkSearchResult {
  phrases: string[];
  matches: WorkSearchMatch[];
  /** confidence >= 90% */
  autoMatch?: WorkSearchMatch;
  notFound: boolean;
}

export const AUTO_MATCH_THRESHOLD = 90;
export const MIN_MATCH_THRESHOLD = 30;
export const TOP_MATCH_COUNT = 5;
export const PHRASE_COUNT_MIN = 3;
export const PHRASE_COUNT_MAX = 5;
