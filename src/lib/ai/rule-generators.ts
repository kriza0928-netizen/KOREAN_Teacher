import type {
  LiteratureAnalysis,
  ManualSourceInput,
  NonLiteratureAnalysis,
  SourceCandidate,
  TextClassification,
} from "@/types";

function buildSourceCandidates(
  text: string,
  manual?: ManualSourceInput,
  searchMatches?: import("@/lib/literature/types").WorkSearchMatch[]
): SourceCandidate[] {
  const candidates: SourceCandidate[] = [];

  if (searchMatches && searchMatches.length > 0) {
    for (const match of searchMatches.slice(0, 5)) {
      candidates.push({
        title: match.title,
        author: match.author,
        source: match.source ?? "작품 DB 검색",
        confidence: match.confidence / 100,
      });
    }
  }

  if (manual?.title?.trim()) {
    const exists = candidates.some((c) => c.title === manual.title?.trim());
    if (!exists) {
      candidates.push({
        title: manual.title.trim(),
        author: manual.author?.trim() || "교사 입력",
        source: manual.source?.trim() || "교사 직접 입력",
        confidence: (manual.searchConfidence ?? 95) / 100,
      });
    }
  }

  if (candidates.length === 0) {
    candidates.push({
      title: "작품명 후보 (교사 확인 필요)",
      author: "미상",
      source: "작품 DB 검색 결과 없음 — 직접 입력 권장",
      confidence: 0.3,
    });
  }

  return candidates.slice(0, 5);
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
  manual?: ManualSourceInput,
  searchMatches?: import("@/lib/literature/types").WorkSearchMatch[]
): LiteratureAnalysis {
  const hasEmotion = /그리움|슬픔|사랑|기쁨|외로|눈물|정서/.test(text);
  const hasSpeaker = /화자|나는|내가|그대|너/.test(text);

  return {
    type: "literature",
    sourceCandidates: buildSourceCandidates(text, manual, searchMatches),
    genre: classification.subCategory || "문학",
    era: "교사 확인 필요",
    theme: hasEmotion
      ? "정서·인간 관계·삶의 의미 (초안 — 교사 검토)"
      : "주제 파악 필요 (교사 검토)",
    narrator: hasSpeaker
      ? "1인칭 화자 또는 서정적 화자 (초안)"
      : "화자/서술자 확인 필요",
    emotionAndAttitude: hasEmotion
      ? "그리움·애상·수용 등 정서 (키워드 기반 초안)"
      : "정서·태도 직접 확인 필요",
    expressions: [
      "비유·상징: 지문 내 비유/은유 표현 확인 (교사 보완)",
      "심상·정서: 핵심 시어와 정서 연결",
      "형식: 갈래에 따른 표현법 (운율·서사 등)",
    ],
    examPoints: [
      "화자/서술자의 정서와 태도",
      "핵심 시어·소재의 상징적 의미",
      "표현상의 특징 (비유·상징·역설 등)",
      "주제와 표현의 관계",
    ],
    sampleQuestions: [
      { question: "화자의 정서를 서술하시오.", type: "서술형" },
      { question: "지문에 나타난 표현법을 두 가지 이상 서술하시오.", type: "서술형" },
      { question: "핵심 소재/시어의 의미를 서술하시오.", type: "서술형" },
      { question: "이 작품의 주제를 한 문장으로 서술하시오.", type: "서술형" },
      {
        question: "다음 중 이 지문의 특징으로 적절하지 않은 것은?",
        type: "선택형",
        hint: "갈래·표현·정서 검토",
      },
    ],
    shortQuotes: extractShortQuotes(text),
    summary: `[자동 분석 초안] ${classification.category} · ${classification.subCategory}. ${classification.reason}`,
  };
}

export function generateNonLiteratureDraft(
  text: string,
  classification: TextClassification,
  manual?: ManualSourceInput,
  searchMatches?: import("@/lib/literature/types").WorkSearchMatch[]
): NonLiteratureAnalysis {
  const connectorCount = (text.match(/따라서|그러나|반면|즉|예를 들어/g) ?? []).length;

  return {
    type: "non_literature",
    sourceCandidates: buildSourceCandidates(text, manual, searchMatches),
    field: classification.subCategory || "비문학",
    centralTopic: text.slice(0, 120).replace(/\n/g, " ") + "… (초안 — 교사 확인)",
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
