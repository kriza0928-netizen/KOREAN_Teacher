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

export interface TextClassification {
  category: CategoryLabel;
  subCategory: SubCategoryLabel | string;
  confidence: number;
  reason: string;
  warnings: string[];
  isUncertain: boolean;
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

export interface AnalysisResponse {
  textType: TextType;
  confidence: number;
  classification: TextClassification;
  analysis: AnalysisResult;
  disclaimer: Disclaimer;
  ragContextUsed: boolean;
  ragSources: string[];
}

export interface OcrResult {
  text: string;
  confidence: number;
  provider: string;
}

export interface AppState {
  step: "capture" | "edit" | "analyze" | "result";
  imagePreview?: string;
  ocrText: string;
  ocrConfidence: number;
  analysis?: AnalysisResponse;
  error?: string;
}
