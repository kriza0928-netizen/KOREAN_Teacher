import { RuleBasedAnalysisProvider } from "@/lib/providers/analysis/rule-based";
import {
  OpenAiVisionAnalysisProvider,
  type AnalysisProvider,
  type AnalyzeInput,
} from "@/lib/providers/analysis/factory";

export function createAnalysisProvider(): AnalysisProvider {
  const provider = process.env.ANALYSIS_PROVIDER ?? "rule-based";

  if (
    (provider === "openai" || provider === "openai-vision") &&
    process.env.OPENAI_API_KEY
  ) {
    return new OpenAiVisionAnalysisProvider();
  }

  return new RuleBasedAnalysisProvider();
}

export type { AnalyzeInput, AnalysisProvider };
