/** 교과서 작품 enrichment 스키마 */
export interface TextbookWorkEnrichment {
  representativeLines: string[];
  uniquePhrases?: string[];
  keyWords: string[];
  weakKeywords?: string[];
  themes: string[];
  emotions: string[];
  symbols: string[];
}

export type TextbookEnrichmentMap = Record<string, TextbookWorkEnrichment>;
