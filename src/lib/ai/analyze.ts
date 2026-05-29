import OpenAI from "openai";
import { z } from "zod";
import type { AnalysisResponse, TextClassification } from "@/types";
import { buildAnalysisResponse, enrichWithRag } from "@/lib/rag";
import {
  CLASSIFICATION_PROMPT,
  classifyText,
  classificationToTextType,
} from "@/lib/ai/classify";

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
7. 사전 분류 결과(ruleBasedClassification)가 제공되면 이를 존중하되, 분석 내용과 모순되지 않게 조정하세요.`;

function buildUserPrompt(
  text: string,
  ragContext: string,
  ruleClassification: TextClassification
): string {
  const ragSection = ragContext
    ? `\n\n[참고 DB 컨텍스트 - 저작권 보호를 위해 발췌만 사용]\n${ragContext}`
    : "";

  return `다음 지문을 분석하세요.

[사전 규칙 기반 분류 결과 — 우선 참고]
${JSON.stringify(ruleClassification, null, 2)}

지문:
"""
${text.slice(0, 3000)}
"""
${ragSection}

응답 JSON 스키마:
{
  "classification": {
    "category": "문학" | "비문학",
    "subCategory": "현대시/현대소설/고전시가/고전소설/수필/인문/사회/과학/기술/예술/융합/분류 불확실",
    "confidence": 0~100,
    "reason": "분류 근거",
    "warnings": []
  },
  "analysis": {
    // category가 문학이고 subCategory가 현대시/현대소설 등일 때:
    "type": "literature",
    "sourceCandidates": [{ "title", "author", "source", "confidence" }],
    "genre", "era", "theme", "narrator", "emotionAndAttitude",
    "expressions": [], "examPoints": [], "sampleQuestions": [{ "question", "type", "hint?" }],
    "shortQuotes": [], "summary"

    // category가 비문학일 때:
    "type": "non_literature",
    "sourceCandidates": [...],
    "field", "centralTopic",
    "paragraphSummaries": [{ "paragraph": 1, "summary": "..." }],
    "structure", "keyConcepts": [],
    "claimEvidence": [{ "claim", "evidence" }],
    "examPoints": [], "sampleQuestions": [...],
    "shortQuotes": [], "summary"
  }
}`;
}

function mergeClassification(
  ruleBased: TextClassification,
  ai?: z.infer<typeof classificationSchema>
): TextClassification {
  if (!ai) return ruleBased;

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

  const isUncertain = ai.confidence < 75 || ai.subCategory === "분류 불확실";
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

function createMockAnalysis(
  text: string,
  classification: TextClassification
): AnalysisResponse {
  const textType = classificationToTextType(classification);
  const confidence = classification.confidence / 100;

  if (textType === "literature" && !classification.isUncertain) {
    return buildAnalysisResponse({
      textType: "literature",
      confidence,
      classification,
      analysis: {
        type: "literature",
        sourceCandidates: [
          {
            title: "편지 (추정)",
            author: "미상 (현대시 추정)",
            source: "교재·문제집 발췌 (확인 필요)",
            confidence: 0.45,
          },
        ],
        genre: classification.subCategory || "현대시 (서정시)",
        era: "현대",
        theme: "그리움, 시간의 흐름, 기억과 상실",
        narrator: "1인칭 화자 — 과거의 인연을 회상하는 서정적 화자",
        emotionAndAttitude: "그리움과 아련함, 따뜻한 그리움 속의 쓸쓸함",
        expressions: [
          "시각적 이미지: '잉크가 번진 글씨', '지는 해'",
          "은유: '빈 종이' — 만남 이전의 공허한 자아",
          "대구/반복: 편지와 바람, 해의 이미지 대비",
          "감각적 표현: '따뜻한 숨결' — 촉각·온기 이미지",
        ],
        examPoints: [
          "화자의 정서 변화 추적 (회상 → 그리움 → 수용)",
          "시어(종이, 편지, 바람, 해)의 상징적 의미",
          "운율·형식 (자유시, 구분 없는 연속 서술)",
          "화자와 청자(그대)의 관계 설정",
        ],
        sampleQuestions: [
          {
            question: "화자가 '빈 종이'에 비유한 것은 무엇이며, 그 의미를 서술하시오.",
            type: "서술형",
            hint: "만남 이전의 자아",
          },
          {
            question: "'잉크가 번진 글씨'에 담긴 표현상의 효과를 설명하시오.",
            type: "서술형",
          },
          {
            question: "이 시의 화자가 지닌 정서를 두 가지 이상 서술하시오.",
            type: "서술형",
          },
          {
            question: "마지막 연의 '지는 해'가 시 전체의 주제와 어떻게 연결되는지 서술하시오.",
            type: "서술형",
          },
          {
            question: "다음 중 이 시의 표현법으로 적절하지 않은 것은?",
            type: "선택형",
            hint: "직유, 은유, 의인법, 역설 등 검토",
          },
        ],
        shortQuotes: extractShortQuotes(text),
        summary:
          "편지를 매개로 과거의 인연을 회상하는 현대 서정시로, 그리움과 기억의 주제가 핵심입니다.",
      },
    });
  }

  return buildAnalysisResponse({
    textType: "non_literature",
    confidence,
    classification,
    analysis: {
      type: "non_literature",
      sourceCandidates: [
        {
          title: "지문 출처 (추정)",
          author: "미상",
          source: `${classification.subCategory} 분야 지문 (확인 필요)`,
          confidence: 0.4,
        },
      ],
      field: classification.subCategory || "인문·사회",
      centralTopic: inferCentralTopic(text),
      paragraphSummaries: inferParagraphSummaries(text),
      structure: inferStructure(text),
      keyConcepts: inferKeyConcepts(text),
      claimEvidence: inferClaimEvidence(text),
      examPoints: [
        "글의 논지와 근거의 연결 관계 파악",
        "필자의 태도 및 논조 파악",
        "개념 간 논리적 관계 정리",
        "타당성 판단: 근거가 주장을 뒷받침하는가",
      ],
      sampleQuestions: [
        {
          question: "필자의 중심 주장을 한 문장으로 서술하시오.",
          type: "서술형",
        },
        {
          question: "2문단의 중심 내용을 요약하시오.",
          type: "서술형",
        },
        {
          question: "필자의 주장과 그 근거를 하나씩 짝지어 서술하시오.",
          type: "서술형",
        },
        {
          question: "이 글의 구조를 서론-본론-결론으로 나누어 설명하시오.",
          type: "서술형",
        },
        {
          question: "글에 등장하는 핵심 개념의 의미를 맥락에 맞게 설명하시오.",
          type: "서술형",
        },
      ],
      shortQuotes: extractShortQuotes(text, 1),
      summary: `${classification.subCategory} 분야의 설명/논설 지문으로, ${classification.reason}`,
    },
  });
}

function extractShortQuotes(text: string, max = 2): string[] {
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/[.!?。]\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 50);
  return sentences.slice(0, max);
}

function inferCentralTopic(text: string): string {
  const firstParagraph = text.split(/\n\s*\n/)[0]?.replace(/\n/g, " ").slice(0, 120);
  return firstParagraph
    ? `${firstParagraph}… (핵심 화제 — 교사 확인 필요)`
    : "지문의 중심 화제 (교사 확인 필요)";
}

function inferParagraphSummaries(text: string) {
  const paragraphs = text.split(/\n\s*\n+/).filter((p) => p.trim().length > 20);
  if (paragraphs.length === 0) {
    const lines = text.split("\n").filter((l) => l.trim());
    return lines.slice(0, 3).map((line, i) => ({
      paragraph: i + 1,
      summary: line.trim().slice(0, 80) + (line.length > 80 ? "…" : ""),
    }));
  }
  return paragraphs.slice(0, 5).map((p, i) => ({
    paragraph: i + 1,
    summary: p.replace(/\n/g, " ").trim().slice(0, 100) + (p.length > 100 ? "…" : ""),
  }));
}

function inferStructure(text: string): string {
  const connectorCount = (text.match(/따라서|그러나|반면|즉|예를 들어/g) ?? []).length;
  if (connectorCount >= 3) return "서론(도입) → 본론(주장·근거) → 결론(정리) — 논설문 구조";
  return "개념 제시 → 설명·예시 → 정리 — 설명문 구조";
}

function inferKeyConcepts(text: string): string[] {
  const matches = text.match(/[가-힣]{2,8}(?:\s*(?:이란|란|이다|적|성))/g) ?? [];
  const unique = [...new Set(matches.map((m) => m.replace(/(?:이란|란|이다|적|성)$/, "").trim()))];
  return unique.slice(0, 5).length > 0 ? unique.slice(0, 5) : ["핵심 개념 (교사 확인 필요)"];
}

function inferClaimEvidence(text: string) {
  const hasClaim = /주장|해야|필요|중요|문제|해결/.test(text);
  if (!hasClaim) {
    return [
      {
        claim: "글의 중심 내용 (교사 확인 필요)",
        evidence: "지문 내 근거 문장 확인 필요",
      },
    ];
  }
  return [
    {
      claim: "필자의 주장 또는 관점 (교사 확인 필요)",
      evidence: "지문 내 근거·예시 문장",
    },
  ];
}

export async function analyzeText(text: string): Promise<AnalysisResponse> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("분석할 텍스트가 비어 있습니다.");
  }

  const ruleClassification = classifyText(trimmed);
  const textType = classificationToTextType(ruleClassification);
  const rag = await enrichWithRag(trimmed.slice(0, 200), textType);

  const provider = process.env.AI_PROVIDER ?? "mock";

  if (provider === "mock" || !process.env.OPENAI_API_KEY) {
    const mock = createMockAnalysis(trimmed, ruleClassification);
    return {
      ...mock,
      ragContextUsed: rag.used,
      ragSources: rag.sources,
    };
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
        content: buildUserPrompt(trimmed, rag.context, ruleClassification),
      },
    ],
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI 분석 응답이 비어 있습니다.");
  }

  const parsed = analysisSchema.parse(JSON.parse(content));
  const classification = mergeClassification(ruleClassification, parsed.classification);
  const finalTextType = classificationToTextType(classification);

  if (parsed.analysis.type !== finalTextType) {
    const mock = createMockAnalysis(trimmed, classification);
    return {
      ...mock,
      analysis: parsed.analysis.type === finalTextType ? parsed.analysis : mock.analysis,
      ragContextUsed: rag.used,
      ragSources: rag.sources,
    };
  }

  return buildAnalysisResponse({
    textType: finalTextType,
    confidence: classification.confidence / 100,
    classification,
    analysis: parsed.analysis,
    ragContextUsed: rag.used,
    ragSources: rag.sources,
  });
}
