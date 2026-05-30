import type {
  LiteratureAnalysis,
  NonLiteratureAnalysis,
  SourceCandidate,
  TextClassification,
} from "@/types";
import type { WorkSelection } from "@/lib/literature/types";

function buildSourceCandidatesFromSelection(
  selected?: WorkSelection
): SourceCandidate[] {
  if (!selected?.title?.trim()) {
    return [
      {
        title: "작품명 (교사 확인 필요)",
        author: "미상",
        source: "미선택",
        confidence: 0.3,
      },
    ];
  }

  return [
    {
      title: selected.title.trim(),
      author: selected.author?.trim() || "미상",
      source: selected.source?.trim() || (selected.mode === "db" ? "작품 DB" : "교사 직접 입력"),
      confidence: (selected.matchScore ?? 95) / 100,
    },
  ];
}

function extractShortQuotes(text: string, max = 2): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/[.!?。]\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 50)
    .slice(0, max);
}

function inferParagraphSummaries(text: string) {
  const paragraphs = text.split(/\n\s*\n+/).filter((p) => p.trim().length > 15);
  if (paragraphs.length === 0) {
    return text
      .split("\n")
      .filter((l) => l.trim())
      .slice(0, 4)
      .map((line, i) => ({
        paragraph: i + 1,
        summary: line.trim().slice(0, 100),
      }));
  }
  return paragraphs.slice(0, 5).map((p, i) => ({
    paragraph: i + 1,
    summary: p.replace(/\n/g, " ").trim().slice(0, 120),
  }));
}

function inferKeyConcepts(text: string): string[] {
  const matches = text.match(/[가-힣]{2,10}(?:이란|란|이다|적|성|론)/g) ?? [];
  const unique = [...new Set(matches.map((m) => m.replace(/(?:이란|란|이다|적|성|론)$/, "")))];
  return unique.slice(0, 5).length > 0 ? unique.slice(0, 5) : ["핵심 개념 (교사 확인)"];
}

export function generateLiteratureDraft(
  text: string,
  classification: TextClassification,
  selectedWork?: WorkSelection
): LiteratureAnalysis {
  const hasEmotion = /그리움|슬픔|사랑|기쁨|외로|눈물|정서/.test(text);
  const hasSpeaker = /화자|나는|내가|그대|너/.test(text);

  const dbGenre = selectedWork?.genre;
  const dbTheme = selectedWork?.theme;
  const dbEra = selectedWork?.era;
  const dbGuide = selectedWork?.textbookGuide;

  const theme = dbTheme
    ? `${dbTheme} (DB 참조 — 교사 검토)`
    : hasEmotion
      ? "정서·인간 관계·삶의 의미 (초안 — 교사 검토)"
      : "주제 파악 필요 (교사 검토)";

  const expressions = dbGuide
    ? [
        `교과서 해설 참조: ${dbGuide.slice(0, 80)}…`,
        "비유·상징: 지문 내 표현 확인 (교사 보완)",
        "형식: 갈래에 따른 표현법 (운율·서사 등)",
      ]
    : [
        "비유·상징: 지문 내 비유/은유 표현 확인 (교사 보완)",
        "심상·정서: 핵심 시어와 정서 연결",
        "형식: 갈래에 따른 표현법 (운율·서사 등)",
      ];

  const summaryParts = [
    `[자동 분석 초안] ${classification.category} · ${classification.subCategory}`,
    selectedWork ? `선택 작품: ${selectedWork.title} (${selectedWork.author})` : "",
    dbGuide ? `교과서 해설: ${dbGuide.slice(0, 120)}…` : classification.reason,
  ].filter(Boolean);

  return {
    type: "literature",
    sourceCandidates: buildSourceCandidatesFromSelection(selectedWork),
    genre: dbGenre ?? classification.subCategory ?? "문학",
    era: dbEra ?? "교사 확인 필요",
    theme,
    narrator: hasSpeaker
      ? "1인칭 화자 또는 서정적 화자 (초안)"
      : "화자/서술자 확인 필요",
    emotionAndAttitude: hasEmotion
      ? "그리움·애상·수용 등 정서 (키워드 기반 초안)"
      : dbGuide
        ? `교과서 해설 기반 정서 추론: ${dbGuide.slice(0, 60)}…`
        : "정서·태도 직접 확인 필요",
    expressions,
    examPoints: [
      selectedWork ? `${selectedWork.title}의 주제와 표현` : "화자/서술자의 정서와 태도",
      "핵심 시어·소재의 상징적 의미",
      "표현상의 특징 (비유·상징·역설 등)",
      dbGuide ? "교과서 해설과 지문의 연결" : "주제와 표현의 관계",
    ],
    sampleQuestions: [
      { question: "화자/서술자의 정서를 서술하시오.", type: "서술형" },
      { question: "지문에 나타난 표현법을 두 가지 이상 서술하시오.", type: "서술형" },
      {
        question: selectedWork
          ? `「${selectedWork.title}」의 주제를 서술하시오.`
          : "이 작품의 주제를 한 문장으로 서술하시오.",
        type: "서술형",
      },
      { question: "핵심 소재/시어의 의미를 서술하시오.", type: "서술형" },
      {
        question: "다음 중 이 지문의 특징으로 적절하지 않은 것은?",
        type: "선택형",
        hint: "갈래·표현·정서 검토",
      },
    ],
    shortQuotes: extractShortQuotes(text),
    summary: summaryParts.join(" "),
  };
}

export function generateNonLiteratureDraft(
  text: string,
  classification: TextClassification,
  selectedWork?: WorkSelection
): NonLiteratureAnalysis {
  const connectorCount = (text.match(/따라서|그러나|반면|즉|예를 들어/g) ?? []).length;

  return {
    type: "non_literature",
    sourceCandidates: buildSourceCandidatesFromSelection(selectedWork),
    field: classification.subCategory || "비문학",
    centralTopic: selectedWork?.theme
      ? `${selectedWork.theme} (선택 출처 참조)`
      : text.slice(0, 120).replace(/\n/g, " ") + "… (초안 — 교사 확인)",
    paragraphSummaries: inferParagraphSummaries(text),
    structure:
      connectorCount >= 2
        ? "논설/설명 구조 (도입 → 전개 → 정리) — 초안"
        : "설명문 구조 (개념 → 예시 → 정리) — 초안",
    keyConcepts: inferKeyConcepts(text),
    claimEvidence: [
      {
        claim: "글의 중심 주장 (교사 확인)",
        evidence: "지문 내 근거 문장 직접 표시",
      },
    ],
    examPoints: [
      "글의 중심 내용·주장 파악",
      "근거와 주장의 연결 관계",
      "글의 구조와 전개 방식",
      "개념의 의미와 맥락",
    ],
    sampleQuestions: [
      { question: "필자의 중심 주장을 한 문장으로 서술하시오.", type: "서술형" },
      { question: "글의 구조를 서론-본론-결론으로 설명하시오.", type: "서술형" },
      { question: "주장과 근거를 하나씩 짝지어 서술하시오.", type: "서술형" },
      { question: "핵심 개념의 의미를 맥락에 맞게 설명하시오.", type: "서술형" },
      { question: "필자의 태도를 서술하시오.", type: "서술형" },
    ],
    shortQuotes: extractShortQuotes(text, 1),
    summary: `[자동 분석 초안] ${classification.subCategory} 분야. ${classification.reason}`,
  };
}
