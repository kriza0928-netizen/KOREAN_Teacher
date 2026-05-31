import type { OcrSearchFeatures } from "@/lib/literature/extract-features";

export interface LiteratureWork {
  id: string;
  title: string;
  author: string;
  genre?: string;
  era?: string;
  source?: string;
  /** @deprecated textbookKeywords·examKeywords 사용 권장 */
  keywords: string[];
  keywordAliases?: string[];
  properNouns?: string[];
  materials?: string[];
  famousPhrases?: string[];
  aliases?: string[];
  theme?: string;
  textbookGuide?: string;
  /** 주제 목록 (상실, 고독, 자기 성찰 등) */
  themes?: string[];
  /** 상징어 (책갈피, 종이 등) */
  symbols?: string[];
  /** 대표 구절·시어 (uniquePhrases로 통합 권장) */
  representativeLines?: string[];
  /** 작품 특정 대표 구절 — 검색 최우선 */
  uniquePhrases?: string[];
  /** 핵심어 (+10점) */
  searchKeywords?: string[];
  /** 일반어 (+1점, 단독 후보 불가) */
  weakKeywords?: string[];
  /** 교과서 핵심어 */
  textbookKeywords?: string[];
  /** 내신·수능 출제어 */
  examKeywords?: string[];
  /** 반복 시어 */
  repeatedTerms?: string[];
  /** 정서 키워드 */
  emotions?: string[];
  /** 핵심 시어 (교과서) */
  keyWords?: string[];
  /** 교과서 수록 여부 (미지정 시 source에서 추론) */
  isTextbook?: boolean;
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
  confidence: number;
  score: number;
  matchReasons: MatchReason[];
  matchedKeyword: string;
  matchedPhrase: string;
}

export type WorkSelectionMode = "db" | "manual";

export interface WorkSelection {
  mode: WorkSelectionMode;
  workId?: string;
  title: string;
  author: string;
  source?: string;
  genre?: string;
  era?: string;
  theme?: string;
  textbookGuide?: string;
  matchScore?: number;
  matchReasons?: MatchReason[];
}

export interface WorkSearchResult {
  phrases: string[];
  /** 원문 OCR 정규화 (검색 비교용) */
  normalizedText: string;
  /** 정제 OCR 원문 */
  cleanedText?: string;
  /** 정제 OCR 정규화 (검색 비교용) */
  cleanedNormalizedText?: string;
  matches: WorkSearchMatch[];
  /** @deprecated UI에서 자동 선택하지 않음 */
  autoMatch?: WorkSearchMatch;
  notFound: boolean;
  /** OCR에서 추출한 작품 특징 */
  extractedFeatures?: OcrSearchFeatures;
}

export const AUTO_MATCH_THRESHOLD = 85;
export const MIN_MATCH_THRESHOLD = 40;
export const TOP_MATCH_COUNT = 5;

export const PHRASE_COUNT_MIN = 3;
export const PHRASE_COUNT_MAX = 5;
