export type TextType = "literature" | "non_literature";

export type CategoryLabel = "문학" | "비문학";

export type SubCategoryLabel =
  | "현대시"
  | "현대소설"
  | "고전시가"
  | "고전소설"
  | "수필"
  | "인문"
  | "사회"
  | "과학"
  | "기술"
  | "예술"
  | "융합"
  | "분류 불확실";

export type AnalysisStatus =
  | "ocr_invalid"
  | "text_insufficient"
  | "classification_deferred"
  | "classification_uncertain"
  | "ai_unconfigured"
  | "complete";

export interface TextClassification {
  category: CategoryLabel;
  subCategory: SubCategoryLabel | string;
  confidence: number;
  reason: string;
  warnings: string[];
  isUncertain: boolean;
}

export interface OcrMeta {
  success: boolean;
  confidence: number;
  provider: string;
}

export interface SourceCandidate {
  title: string;
  author: string;
  source: string;
  confidence: number;
}

export interface Disclaimer {
  sourceAccuracy: string;
  copyrightNotice: string;
  teacherReviewRequired: string;
}

export interface SampleQuestion {
  question: string;
  type: string;
  hint?: string;
}

export interface LiteratureAnalysis {
  type: "literature";
  sourceCandidates: SourceCandidate[];
  genre: string;
  era: string;
  theme: string;
  narrator: string;
  emotionAndAttitude: string;
  expressions: string[];
  examPoints: string[];
  sampleQuestions: SampleQuestion[];
  shortQuotes: string[];
  summary: string;
}

export interface NonLiteratureAnalysis {
  type: "non_literature";
  sourceCandidates: SourceCandidate[];
  field: string;
  centralTopic: string;
  paragraphSummaries: { paragraph: number; summary: string }[];
  structure: string;
  keyConcepts: string[];
  claimEvidence: { claim: string; evidence: string }[];
  examPoints: string[];
  sampleQuestions: SampleQuestion[];
  shortQuotes: string[];
  summary: string;
}

export type AnalysisResult = LiteratureAnalysis | NonLiteratureAnalysis;

export interface ManualSourceInput {
  title?: string;
  author?: string;
  source?: string;
  searchConfidence?: number;
}

export type { WorkSelection, WorkSelectionMode, WorkSearchMatch, WorkSearchResult } from "@/lib/literature/types";

export interface AnalysisResponse {
  status: AnalysisStatus;
  message?: string;
  ocr: OcrMeta;
  extractedText?: string;
  classification?: TextClassification;
  textType?: TextType;
  confidence?: number;
  analysis?: AnalysisResult;
  selectedWork?: import("@/lib/literature/types").WorkSelection;
  isDraft: boolean;
  analysisProvider: string;
  disclaimer: Disclaimer;
  ragContextUsed: boolean;
  ragSources: string[];
}

export interface OcrResult {
  text: string;
  confidence: number;
  provider: string;
  success: boolean;
}

export interface AnalyzeRequest {
  text: string;
  ocr: {
    success: boolean;
    confidence: number;
    provider: string;
  };
  manualSource?: ManualSourceInput;
  /** OCR 신뢰도가 낮을 때 사용자가 텍스트를 직접 수정·입력한 경우 */
  textManuallyVerified?: boolean;
  selectedWork?: import("@/lib/literature/types").WorkSelection;
}

export interface AppState {
  step: "capture" | "edit" | "analyze" | "result";
  imagePreview?: string;
  ocrText: string;
  ocrConfidence: number;
  ocrProvider: string;
  ocrSuccess: boolean;
  analysis?: AnalysisResponse;
  error?: string;
}
