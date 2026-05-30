import type { AnalysisResponse } from "@/types";
import type { AnalyzeInput } from "@/lib/providers/analysis/factory";
import { classifyText, classificationToTextType } from "@/lib/ai/classify";
import { buildAnalysisResponse } from "@/lib/rag";
import {
  buildOcrMeta,
  validatePreClassification,
} from "@/lib/validation/text";
import { generateLiteratureDraft, generateNonLiteratureDraft } from "@/lib/ai/rule-generators";

export async function analyzeWithRules(input: AnalyzeInput): Promise<AnalysisResponse> {
  const trimmed = input.text.trim();
  const ocrMeta = buildOcrMeta(input.ocr);

  const preCheck = validatePreClassification({
    text: trimmed,
    success: input.ocr.success,
    confidence: input.ocr.confidence,
    provider: input.ocr.provider,
    textManuallyVerified: input.textManuallyVerified,
  });

  if (preCheck) {
    return { ...preCheck, extractedText: trimmed, isDraft: false, analysisProvider: "rule-based" };
  }

  const classification = classifyText(trimmed);
  const textType = classificationToTextType(classification);

  const analysis =
    textType === "literature"
      ? generateLiteratureDraft(trimmed, classification, input.manualSource)
      : generateNonLiteratureDraft(trimmed, classification, input.manualSource);

  return buildAnalysisResponse({
    status: "complete",
    ocr: ocrMeta,
    extractedText: trimmed,
    classification,
    textType,
    confidence: classification.confidence / 100,
    analysis,
    isDraft: true,
    analysisProvider: "rule-based",
    ragContextUsed: false,
    ragSources: [],
  });
}
