import type { AnalysisResponse } from "@/types";

export interface AnalysisProvider {
  readonly name: string;
  analyze(input: AnalyzeInput): Promise<AnalysisResponse>;
}

export interface AnalyzeInput {
  text: string;
  ocr: {
    success: boolean;
    confidence: number;
    provider: string;
  };
  manualSource?: {
    title?: string;
    author?: string;
    source?: string;
  };
  textManuallyVerified?: boolean;
}

/** 유료 — OpenAI Vision 통합 분석 (추후 연동) */
export class OpenAiVisionAnalysisProvider implements AnalysisProvider {
  readonly name = "openai-vision";

  async analyze(): Promise<AnalysisResponse> {
    throw new Error(
      "OpenAI Vision 분석은 유료 API입니다. ANALYSIS_PROVIDER=openai 설정 후 활성화하세요."
    );
  }
}
