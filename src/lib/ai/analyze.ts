import OpenAI from "openai";
import { z } from "zod";
import type { AnalysisResponse, AnalyzeRequest, TextClassification } from "@/types";
import { buildAnalysisResponse, enrichWithRag } from "@/lib/rag";
import {
  CLASSIFICATION_PROMPT,
  classifyText,
  classificationToTextType,
} from "@/lib/ai/classify";
import {
  buildOcrMeta,
  isAiConfigured,
  MIN_CLASSIFICATION_CONFIDENCE,
  validatePreClassification,
} from "@/lib/ocr/validate";

const sourceCandidateSchema = z.object({
  title: z.string(),
  author: z.string(),
  source: z.string(),
  confidence: z.number().min(0).max(1),
});

const sampleQuestionSchema = z.object({
  question: z.string(),
  type: z.string(),
  hint: z.string().optional(),
});

const classificationSchema = z.object({
  category: z.enum(["문학", "비문학"]),
  subCategory: z.string(),
  confidence: z.number().min(0).max(100),
  reason: z.string(),
  warnings: z.array(z.string()),
});

const literatureSchema = z.object({
  type: z.literal("literature"),
  sourceCandidates: z.array(sourceCandidateSchema),
  genre: z.string(),
  era: z.string(),
  theme: z.string(),
  narrator: z.string(),
  emotionAndAttitude: z.string(),
  expressions: z.array(z.string()),
  examPoints: z.array(z.string()),
  sampleQuestions: z.array(sampleQuestionSchema).length(5),
  shortQuotes: z.array(z.string()).max(3),
  summary: z.string(),
});

const nonLiteratureSchema = z.object({
  type: z.literal("non_literature"),
  sourceCandidates: z.array(sourceCandidateSchema),
  field: z.string(),
  centralTopic: z.string(),
  paragraphSummaries: z.array(
    z.object({ paragraph: z.number(), summary: z.string() })
  ),
  structure: z.string(),
  keyConcepts: z.array(z.string()),
  claimEvidence: z.array(
    z.object({ claim: z.string(), evidence: z.string() })
  ),
  examPoints: z.array(z.string()),
  sampleQuestions: z.array(sampleQuestionSchema).length(5),
  shortQuotes: z.array(z.string()).max(3),
  summary: z.string(),
});

const analysisSchema = z.object({
  classification: classificationSchema,
  analysis: z.union([literatureSchema, nonLiteratureSchema]),
});

const SYSTEM_PROMPT = `당신은 대한민국 고등학교 국어 교사를 위한 수업 분석 도우미입니다.

${CLASSIFICATION_PROMPT}

분석 규칙:
1. 원문 전체를 재현하거나 제공하지 마세요.
2. 짧은 인용(shortQuotes)은 각 50자 이내, 최대 3개만 포함하세요.
3. 작품명·작가·출처는 "후보"로 제시하고 confidence(0~1)를 함께 제공하세요.
4. 수능/내신 출제 관점에서 실용적인 분석을 제공하세요.
5. 예상 문제는 정확히 5개 생성하세요.
6. JSON 형식으로만 응답하세요.
7. 사전 분류 결과(ruleBasedClassification)가 제공되면 이를 존중하세요.`;

function buildUserPrompt(
  text: string,
  ragContext: string,
  ruleClassification: TextClassification
): string {
  const ragSection = ragContext
    ? `\n\n[참고 DB 컨텍스트 - 저작권 보호를 위해 발췌만 사용]\n${ragContext}`
    : "";

  return `다음 지문을 분석하세요.

[사전 규칙 기반 분류 결과 — 확정]
${JSON.stringify(ruleClassification, null, 2)}

지문:
"""
${text.slice(0, 3000)}
"""
${ragSection}

응답 JSON 스키마:
{
  "classification": { ... },
  "analysis": { "type": "literature" | "non_literature", ... }
}`;
}

function mergeClassification(
  ruleBased: TextClassification,
  ai: z.infer<typeof classificationSchema>
): TextClassification {
  const useRuleBased =
    ruleBased.category === "비문학" &&
    (ruleBased.confidence >= 70 || ruleBased.warnings.some((w) => w.includes("OCR")));

  if (useRuleBased) {
    return {
      ...ruleBased,
      reason: `${ruleBased.reason} (AI 분류 ${ai.category}/${ai.subCategory}는 규칙 기반 결과로 보정됨)`,
      warnings: [...new Set([...ruleBased.warnings, ...ai.warnings])],
    };
  }

  const isUncertain = ai.confidence < MIN_CLASSIFICATION_CONFIDENCE;
  const subCategory =
    isUncertain && ai.subCategory === "현대시" ? "분류 불확실" : ai.subCategory;

  return {
    category: ai.category,
    subCategory,
    confidence: Math.round(ai.confidence),
    reason: ai.reason,
    warnings: ai.warnings,
    isUncertain: isUncertain || ruleBased.isUncertain,
  };
}

function buildUncertainResponse(
  ocr: ReturnType<typeof buildOcrMeta>,
  classification: TextClassification
): AnalysisResponse {
  return buildAnalysisResponse({
    status: "classification_uncertain",
    message:
      "분류 신뢰도가 75% 미만입니다. 분류 불확실 — 문학·비문학 분석을 생성하지 않습니다. 지문을 다시 확인하거나 교사가 직접 분류해 주세요.",
    ocr,
    classification: {
      ...classification,
      isUncertain: true,
      subCategory:
        classification.confidence < MIN_CLASSIFICATION_CONFIDENCE
          ? "분류 불확실"
          : classification.subCategory,
    },
    ragContextUsed: false,
    ragSources: [],
  });
}

export async function analyzeText(input: AnalyzeRequest): Promise<AnalysisResponse> {
  const trimmed = input.text.trim();
  const ocrMeta = buildOcrMeta(input.ocr);

  const preCheck = validatePreClassification({
    text: trimmed,
    success: input.ocr.success,
    confidence: input.ocr.confidence,
    provider: input.ocr.provider,
  });
  if (preCheck) {
    return preCheck;
  }

  const classification = classifyText(trimmed);

  if (classification.confidence < MIN_CLASSIFICATION_CONFIDENCE) {
    return buildUncertainResponse(ocrMeta, classification);
  }

  const textType = classificationToTextType(classification);
  const rag = await enrichWithRag(trimmed.slice(0, 200), textType);

  if (!isAiConfigured()) {
    return buildAnalysisResponse({
      status: "ai_unconfigured",
      message:
        "문학/비문학 분류는 완료되었으나 AI 분석 API가 설정되지 않았습니다. OPENAI_API_KEY를 설정해 주세요.",
      ocr: ocrMeta,
      classification,
      textType,
      confidence: classification.confidence / 100,
      ragContextUsed: rag.used,
      ragSources: rag.sources,
    });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildUserPrompt(trimmed, rag.context, classification),
      },
    ],
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI 분석 응답이 비어 있습니다.");
  }

  const parsed = analysisSchema.parse(JSON.parse(content));
  const mergedClassification = mergeClassification(classification, parsed.classification);

  if (mergedClassification.confidence < MIN_CLASSIFICATION_CONFIDENCE) {
    return buildUncertainResponse(ocrMeta, mergedClassification);
  }

  const finalTextType = classificationToTextType(mergedClassification);

  if (parsed.analysis.type !== finalTextType) {
    throw new Error(
      `AI 분석 유형(${parsed.analysis.type})이 분류 결과(${finalTextType})와 일치하지 않습니다.`
    );
  }

  return buildAnalysisResponse({
    status: "complete",
    ocr: ocrMeta,
    classification: mergedClassification,
    textType: finalTextType,
    confidence: mergedClassification.confidence / 100,
    analysis: parsed.analysis,
    ragContextUsed: rag.used,
    ragSources: rag.sources,
  });
}
