import type { AnalysisResponse } from "@/types";
import type { AnalyzeInput } from "@/lib/providers/analysis/factory";
import { classifyText, classificationToTextType } from "@/lib/ai/classify";
import { buildAnalysisResponse } from "@/lib/rag";
import {
  buildOcrMeta,
  validatePreClassification,
} from "@/lib/validation/text";
import { generateDeepAnalysis } from "@/lib/ai/deep-analysis/generator";

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
    return {
      ...preCheck,
      extractedText: trimmed,
      originalOcrText: input.originalOcrText?.trim() || trimmed,
      correctedOcrText: input.correctedOcrText?.trim(),
      isDraft: false,
      analysisProvider: "rule-based",
    };
  }

  if (!input.selectedWork?.title?.trim()) {
    return {
      ...buildAnalysisResponse({
        status: "classification_deferred",
        message: "분석 전 작품을 선택해 주세요.",
        ocr: ocrMeta,
        extractedText: trimmed,
        isDraft: false,
        analysisProvider: "rule-based",
        ragContextUsed: false,
        ragSources: [],
      }),
    };
  }

  const classification = classifyText(trimmed);
  const textType = classificationToTextType(classification);

  const analysis = generateDeepAnalysis(trimmed, classification, input.selectedWork);

  return buildAnalysisResponse({
    status: "complete",
    ocr: ocrMeta,
    extractedText: trimmed,
    originalOcrText: input.originalOcrText?.trim() || trimmed,
    correctedOcrText: input.correctedOcrText?.trim(),
    classification,
    textType,
    confidence: classification.confidence / 100,
    analysis,
    selectedWork: input.selectedWork,
    isDraft: true,
    analysisProvider: "rule-based",
    ragContextUsed: false,
    ragSources: [],
  });
}
