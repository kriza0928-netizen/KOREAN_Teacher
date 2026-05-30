import OpenAI from "openai";
import { z } from "zod";
import type { AnalysisResponse, TextClassification } from "@/types";
import { CLASSIFICATION_PROMPT, classifyText, classificationToTextType } from "@/lib/ai/classify";
import { buildAnalysisResponse, enrichWithRag } from "@/lib/rag";
import {
  buildOcrMeta,
  isAiConfigured,
  MIN_CLASSIFICATION_CONFIDENCE,
  validatePreClassification,
} from "@/lib/vision/validate";

export const VISION_PROVIDER = "gpt-4o-vision";

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

const visionResponseSchema = z.object({
  extractedText: z.string(),
  extractionConfidence: z.number().min(0).max(100),
  classification: classificationSchema,
  analysis: z.union([literatureSchema, nonLiteratureSchema]),
});

const SYSTEM_PROMPT = `당신은 대한민국 고등학교 국어 교사를 위한 지문 분석 도우미입니다.
업로드된 교재·시험지·프린트 이미지를 보고 아래 4단계를 **한 번에** 수행하세요.

## 수행 순서
1. 텍스트 추출: 이미지에서 지문 텍스트를 정확히 OCR 수준으로 추출
2. 문학/비문학 분류: 내용 기준으로 분류 (형태·줄바꿈만으로 시로 분류 금지)
3. 작품명·작가·출처 후보 검색: 가능한 원작 정보를 후보로 제시
4. 교사용 수업 분석: 분류 유형에 맞는 분석 및 예상 문제 5개

${CLASSIFICATION_PROMPT}

## 분석 규칙
1. 원문 전체를 재현하거나 제공하지 마세요.
2. shortQuotes는 각 50자 이내, 최대 3개.
3. 작품명·작가·출처는 후보로 제시하고 confidence(0~1) 포함.
4. 예상 문제는 정확히 5개.
5. JSON만 응답.

## 응답 JSON 스키마
{
  "extractedText": "추출된 지문 전체",
  "extractionConfidence": 0~100,
  "classification": {
    "category": "문학" | "비문학",
    "subCategory": "...",
    "confidence": 0~100,
    "reason": "내용 기준 분류 근거",
    "warnings": []
  },
  "analysis": {
    "type": "literature" | "non_literature",
    ... (유형별 분석 필드, sourceCandidates 포함)
  }
}`;

function buildVisionUserPrompt(ragContext: string): string {
  const ragSection = ragContext
    ? `\n\n[참고 DB — 저작권 보호 발췌만]\n${ragContext}`
    : "";

  return `첨부 이미지의 국어 지문을 분석하세요.
${ragSection}

위 4단계(텍스트 추출 → 분류 → 출처 후보 → 교사용 분석)를 하나의 JSON으로 반환하세요.`;
}

function mergeClassification(
  ruleBased: TextClassification,
  ai: z.infer<typeof classificationSchema>
): TextClassification {
  const useRuleBased =
    ruleBased.category === "비문학" &&
    (ruleBased.confidence >= 70 ||
      ruleBased.warnings.some((w) => w.includes("줄바꿈") || w.includes("OCR")));

  if (useRuleBased) {
    return {
      ...ruleBased,
      reason: `${ruleBased.reason} (Vision AI 분류 ${ai.category}/${ai.subCategory}는 규칙 기반 결과로 보정)`,
      warnings: [...new Set([...ruleBased.warnings, ...ai.warnings])],
      isUncertain: ruleBased.confidence < MIN_CLASSIFICATION_CONFIDENCE,
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
    isUncertain,
  };
}

function buildBlocked(
  status: AnalysisResponse["status"],
  message: string,
  extractionMeta: ReturnType<typeof buildOcrMeta>,
  partial?: {
    extractedText?: string;
    classification?: TextClassification;
  }
): AnalysisResponse {
  return buildAnalysisResponse({
    status,
    message,
    ocr: extractionMeta,
    extractedText: partial?.extractedText,
    classification: partial?.classification,
    ragContextUsed: false,
    ragSources: [],
  });
}

function getVisionModel(): string {
  return process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o";
}

export async function analyzeImage(input: {
  base64: string;
  mimeType: string;
}): Promise<AnalysisResponse> {
  if (!isAiConfigured()) {
    return buildBlocked(
      "ai_unconfigured",
      "OpenAI API가 설정되지 않았습니다. .env.local에 OPENAI_API_KEY를 설정해 주세요.",
      buildOcrMeta({ success: false, confidence: 0, provider: VISION_PROVIDER })
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = getVisionModel();
  const dataUrl = `data:${input.mimeType};base64,${input.base64}`;

  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: buildVisionUserPrompt("") },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Vision AI 응답이 비어 있습니다.");
  }

  const parsed = visionResponseSchema.parse(JSON.parse(content));
  const extractedText = parsed.extractedText.trim();

  const extractionMeta = buildOcrMeta({
    success: extractedText.length > 0,
    confidence: parsed.extractionConfidence,
    provider: VISION_PROVIDER,
  });

  const preCheck = validatePreClassification({
    text: extractedText,
    success: extractionMeta.success,
    confidence: parsed.extractionConfidence,
    provider: VISION_PROVIDER,
  });

  if (preCheck) {
    return {
      ...preCheck,
      extractedText,
      classification: preCheck.classification ?? {
        ...parsed.classification,
        isUncertain: parsed.classification.confidence < MIN_CLASSIFICATION_CONFIDENCE,
      },
    };
  }

  const ruleClassification = classifyText(extractedText);
  const mergedClassification = mergeClassification(ruleClassification, parsed.classification);

  if (mergedClassification.confidence < MIN_CLASSIFICATION_CONFIDENCE) {
    return buildBlocked(
      "classification_uncertain",
      "분류 신뢰도가 75% 미만입니다. 분류 불확실 — 문학·비문학 분석을 생성하지 않습니다.",
      extractionMeta,
      { extractedText, classification: { ...mergedClassification, isUncertain: true } }
    );
  }

  const textType = classificationToTextType(mergedClassification);
  const rag = await enrichWithRag(extractedText.slice(0, 200), textType);

  if (parsed.analysis.type !== textType) {
    throw new Error(
      `분석 유형(${parsed.analysis.type})이 분류(${textType})와 일치하지 않습니다.`
    );
  }

  return buildAnalysisResponse({
    status: "complete",
    ocr: extractionMeta,
    extractedText,
    classification: mergedClassification,
    textType,
    confidence: mergedClassification.confidence / 100,
    analysis: parsed.analysis,
    ragContextUsed: rag.used,
    ragSources: rag.sources,
  });
}

export async function analyzeTextOnly(text: string): Promise<AnalysisResponse> {
  if (!isAiConfigured()) {
    return buildBlocked(
      "ai_unconfigured",
      "OpenAI API가 설정되지 않았습니다.",
      buildOcrMeta({ success: false, confidence: 0, provider: VISION_PROVIDER })
    );
  }

  const trimmed = text.trim();
  const extractionMeta = buildOcrMeta({
    success: true,
    confidence: 90,
    provider: VISION_PROVIDER,
  });

  const preCheck = validatePreClassification({
    text: trimmed,
    success: true,
    confidence: 90,
    provider: VISION_PROVIDER,
  });
  if (preCheck) return { ...preCheck, extractedText: trimmed };

  const ruleClassification = classifyText(trimmed);
  if (ruleClassification.confidence < MIN_CLASSIFICATION_CONFIDENCE) {
    return buildBlocked(
      "classification_uncertain",
      "분류 신뢰도가 75% 미만입니다.",
      extractionMeta,
      { extractedText: trimmed, classification: ruleClassification }
    );
  }

  const textType = classificationToTextType(ruleClassification);
  const rag = await enrichWithRag(trimmed.slice(0, 200), textType);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `다음 지문 텍스트를 분류·출처 후보 검색·교사용 분석하세요.\n\n"""${trimmed.slice(0, 3000)}"""\n\nextractedText 필드에는 입력 텍스트를 그대로 넣고 extractionConfidence는 90으로 설정하세요.`,
      },
    ],
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("AI 분석 응답이 비어 있습니다.");

  const parsed = visionResponseSchema.parse(JSON.parse(content));
  const mergedClassification = mergeClassification(ruleClassification, parsed.classification);

  if (mergedClassification.confidence < MIN_CLASSIFICATION_CONFIDENCE) {
    return buildBlocked(
      "classification_uncertain",
      "분류 신뢰도가 75% 미만입니다.",
      extractionMeta,
      { extractedText: trimmed, classification: mergedClassification }
    );
  }

  const finalType = classificationToTextType(mergedClassification);
  if (parsed.analysis.type !== finalType) {
    throw new Error("분석 유형이 분류와 일치하지 않습니다.");
  }

  return buildAnalysisResponse({
    status: "complete",
    ocr: extractionMeta,
    extractedText: trimmed,
    classification: mergedClassification,
    textType: finalType,
    confidence: mergedClassification.confidence / 100,
    analysis: parsed.analysis,
    ragContextUsed: rag.used,
    ragSources: rag.sources,
  });
}
