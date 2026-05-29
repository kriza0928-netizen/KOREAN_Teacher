import OpenAI from "openai";
import { z } from "zod";
import type { AnalysisResponse } from "@/types";
import { buildAnalysisResponse, enrichWithRag } from "@/lib/rag";

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
  textType: z.enum(["literature", "non_literature"]),
  confidence: z.number().min(0).max(1),
  analysis: z.union([literatureSchema, nonLiteratureSchema]),
});

const SYSTEM_PROMPT = `당신은 대한민국 고등학교 국어 교사를 위한 수업 분석 도우미입니다.

규칙:
1. 원문 전체를 재현하거나 제공하지 마세요.
2. 짧은 인용(shortQuotes)은 각 50자 이내, 최대 3개만 포함하세요.
3. 작품명·작가·출처는 "후보"로 제시하고 confidence(0~1)를 함께 제공하세요.
4. 수능/내신 출제 관점에서 실용적인 분석을 제공하세요.
5. 예상 문제는 정확히 5개 생성하세요.
6. JSON 형식으로만 응답하세요.`;

function buildUserPrompt(text: string, ragContext: string): string {
  const ragSection = ragContext
    ? `\n\n[참고 DB 컨텍스트 - 저작권 보호를 위해 발췌만 사용]\n${ragContext}`
    : "";

  return `다음 지문을 분석하세요. 문학/비문학을 분류하고 해당 유형에 맞는 분석을 JSON으로 반환하세요.

지문:
"""
${text.slice(0, 3000)}
"""
${ragSection}

응답 JSON 스키마:
{
  "textType": "literature" | "non_literature",
  "confidence": 0.0~1.0,
  "analysis": {
    // literature인 경우:
    "type": "literature",
    "sourceCandidates": [{ "title", "author", "source", "confidence" }],
    "genre", "era", "theme", "narrator", "emotionAndAttitude",
    "expressions": [], "examPoints": [], "sampleQuestions": [{ "question", "type", "hint?" }],
    "shortQuotes": [], "summary"

    // non_literature인 경우:
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

function createMockAnalysis(text: string): AnalysisResponse {
  const isLiterature =
    /시|詩|화자|운율|상징|운|시조|가사|소설|등장|서술|이/iu.test(text) ||
    text.split("\n").filter((l) => l.trim()).length <= 15;

  if (isLiterature) {
    return buildAnalysisResponse({
      textType: "literature",
      confidence: 0.72,
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
        genre: "현대시 (서정시)",
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
        shortQuotes: ["그대를 만나기 전의 나는", "아무것도 모르는 빈 종이였소"],
        summary:
          "편지를 매개로 과거의 인연을 회상하는 현대 서정시로, 그리움과 기억의 주제가 핵심입니다.",
      },
    });
  }

  return buildAnalysisResponse({
    textType: "non_literature",
    confidence: 0.78,
    analysis: {
      type: "non_literature",
      sourceCandidates: [
        {
          title: "인공지능과 교육의 미래",
          author: "미상",
          source: "교육·과학 분야 지문 (확인 필요)",
          confidence: 0.4,
        },
      ],
      field: "과학·기술 / 교육",
      centralTopic: "AI 기술 발전이 교육 환경에 미치는 영향과 대응 방안",
      paragraphSummaries: [
        { paragraph: 1, summary: "AI 기술의 급속한 발전과 교육 현장 적용 확대" },
        { paragraph: 2, summary: "맞춤형 학습과 교사 역할 변화의 가능성" },
        { paragraph: 3, summary: "윤리적 문제와 교사의 비판적 검토 필요성" },
      ],
      structure: "서론(배경) → 본론(긍정적 효과) → 본론(한계·윤리) → 결론(균형적 수용)",
      keyConcepts: ["인공지능", "맞춤형 학습", "교사 역할", "디지털 리터러시", "윤리"],
      claimEvidence: [
        {
          claim: "AI는 학습자 수준에 맞는 맞춤형 교육을 가능하게 한다.",
          evidence: "개인별 학습 데이터 분석을 통한 콘텐츠 추천 사례",
        },
        {
          claim: "교사는 AI 결과를 비판적으로 검토해야 한다.",
          evidence: "AI의 편향성과 오류 가능성에 대한 논의",
        },
      ],
      examPoints: [
        "글의 논지와 근거의 연결 관계 파악",
        "필자의 태도(긍정적 수용 + 비판적 경계)",
        "개념 간 논리적 관계 (AI → 맞춤형 학습 → 교사 역할)",
        "타당성 판단: 근거가 주장을 뒷받침하는가",
      ],
      sampleQuestions: [
        {
          question: "필자가 AI 교육에 대해 취하는 태도를 서술하시오.",
          type: "서술형",
        },
        {
          question: "2문단의 중심 내용을 한 문장으로 요약하시오.",
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
          question: "'맞춤형 학습'의 의미를 글의 맥락에서 설명하시오.",
          type: "서술형",
        },
      ],
      shortQuotes: [],
      summary:
        "AI와 교육의 관계를 다룬 설명문으로, 기술의 가능성과 한계를 균형 있게 논의합니다.",
    },
  });
}

export async function analyzeText(text: string): Promise<AnalysisResponse> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("분석할 텍스트가 비어 있습니다.");
  }

  const provider = process.env.AI_PROVIDER ?? "mock";

  const textTypeGuess = /시|화자|운|소설|등장|서사|詩|作/u.test(trimmed)
    ? "literature"
    : "non_literature";
  const rag = await enrichWithRag(trimmed.slice(0, 200), textTypeGuess);

  if (provider === "mock" || !process.env.OPENAI_API_KEY) {
    const mock = createMockAnalysis(trimmed);
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
      { role: "user", content: buildUserPrompt(trimmed, rag.context) },
    ],
    temperature: 0.4,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI 분석 응답이 비어 있습니다.");
  }

  const parsed = analysisSchema.parse(JSON.parse(content));

  return buildAnalysisResponse({
    ...parsed,
    ragContextUsed: rag.used,
    ragSources: rag.sources,
  });
}
