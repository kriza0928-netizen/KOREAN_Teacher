import type { AnalysisProvider, AnalyzeInput } from "@/lib/providers/analysis/factory";
import { analyzeWithRules } from "@/lib/ai/rule-analyze";

export class RuleBasedAnalysisProvider implements AnalysisProvider {
  readonly name = "rule-based";

  async analyze(input: AnalyzeInput): Promise<import("@/types").AnalysisResponse> {
    return analyzeWithRules(input);
  }
}
