export type TextType = "literature" | "non_literature";

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
