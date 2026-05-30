import type { TextClassification, TextType } from "@/types";

const LITERATURE_PATTERN =
  /화자|정서|심상|비유|상징|운율|서술자|인물|사건|그리움|눈물|처럼|같이|마치|시\b|詩|소설|운|상징적|은유/g;

const NONLITERATURE_PATTERN =
  /개념|주장|근거|원인|결과|비교|대조|설명|정보|과학|기술|사회|인문|따라서|그러나|반면|즉|예를\s*들어|이론|현상|법칙|정책|경제|환경/g;

const LITERATURE_LABELS: Record<string, string> = {
  speaker: "화자·서술자",
  emotion: "정서·심상",
  device: "비유·상징·운율",
  narrative: "인물·사건",
};

const NONLIT_LABELS: Record<string, string> = {
  concept: "개념 설명",
  claim: "주장·근거",
  cause: "원인·결과",
  compare: "비교·대조",
  info: "정보 전달",
  field: "과학·기술·사회·인문",
};

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function evaluate(text: string) {
  const litSpeaker = countMatches(text, /화자|서술자|나는|내가|그대/) >= 1;
  const litEmotion = countMatches(text, /정서|심상|그리움|슬픔|사랑|눈물|기쁨|외로/) >= 1;
  const litDevice = countMatches(text, /비유|상징|운율|은유|직유|처럼|같이|마치/) >= 2;
  const litNarrative = countMatches(text, /인물|사건|등장|소설|「/) >= 1;

  const nonConcept = countMatches(text, /개념|정의|이란|란|원리|법칙|이론/) >= 2;
  const nonClaim = countMatches(text, /주장|근거|논거|해야|필요|목적/) >= 2;
  const nonCause = countMatches(text, /원인|결과|때문에|영향|효과/) >= 2;
  const nonCompare = countMatches(text, /비교|대조|차이|공통점|반면/) >= 1;
  const nonInfo = countMatches(text, /설명|전달|알려|정보|기술|과학|사회|인문/) >= 2;

  const litScore = [litSpeaker, litEmotion, litDevice, litNarrative].filter(Boolean).length;
  const litKeywordScore = countMatches(text, LITERATURE_PATTERN);
  const nonLitScore = [nonConcept, nonClaim, nonCause, nonCompare, nonInfo].filter(Boolean).length;
  const nonLitKeywordScore = countMatches(text, NONLITERATURE_PATTERN);

  return { litScore, litKeywordScore, nonLitScore, nonLitKeywordScore, litSpeaker, litEmotion, litDevice, litNarrative, nonConcept, nonClaim, nonCause, nonCompare, nonInfo };
}

function detectSubCategory(text: string, isLiterature: boolean): string {
  if (!isLiterature) {
    if (/과학|실험|유전|물리|화학/.test(text)) return "과학";
    if (/기술|AI|인공지능|디지털|컴퓨터/.test(text)) return "기술";
    if (/경제|정치|법|사회|제도/.test(text)) return "사회";
    if (/철학|역사|윤리|인문/.test(text)) return "인문";
    return "인문";
  }
  if (/시조|가사|한시|향가/.test(text)) return "고전시가";
  if (/소설|등장|「/.test(text)) return "현대소설";
  if (/수필|에세이/.test(text)) return "수필";
  if (countMatches(text, /화자|정서|심상|비유|운/) >= 3) return "현대시";
  return "현대시";
}

export function classifyText(text: string): TextClassification {
  const trimmed = text.trim();
  const ev = evaluate(trimmed);

  const literatureTotal = ev.litScore + (ev.litKeywordScore >= 3 ? 1 : 0);
  const nonLitTotal = ev.nonLitScore + (ev.nonLitKeywordScore >= 4 ? 1 : 0);

  const litHits: string[] = [];
  if (ev.litSpeaker) litHits.push(LITERATURE_LABELS.speaker);
  if (ev.litEmotion) litHits.push(LITERATURE_LABELS.emotion);
  if (ev.litDevice) litHits.push(LITERATURE_LABELS.device);
  if (ev.litNarrative) litHits.push(LITERATURE_LABELS.narrative);

  const nonLitHits: string[] = [];
  if (ev.nonConcept) nonLitHits.push(NONLIT_LABELS.concept);
  if (ev.nonClaim) nonLitHits.push(NONLIT_LABELS.claim);
  if (ev.nonCause) nonLitHits.push(NONLIT_LABELS.cause);
  if (ev.nonCompare) nonLitHits.push(NONLIT_LABELS.compare);
  if (ev.nonInfo) nonLitHits.push(NONLIT_LABELS.field);

  let category: "문학" | "비문학";
  let subCategory: string;
  let confidence: number;
  let isUncertain = false;

  if (nonLitTotal >= 2 && nonLitTotal >= literatureTotal) {
    category = "비문학";
    subCategory = detectSubCategory(trimmed, false);
    confidence = Math.min(90, 55 + nonLitTotal * 8);
  } else if (literatureTotal >= 2) {
    category = "문학";
    subCategory = detectSubCategory(trimmed, true);
    confidence = Math.min(88, 52 + literatureTotal * 9);
  } else if (literatureTotal > nonLitTotal) {
    category = "문학";
    subCategory = "분류 불확실";
    confidence = 55;
    isUncertain = true;
  } else if (nonLitTotal > literatureTotal) {
    category = "비문학";
    subCategory = "분류 불확실";
    confidence = 55;
    isUncertain = true;
  } else {
    category = "비문학";
    subCategory = "분류 불확실";
    confidence = 45;
    isUncertain = true;
  }

  const reason = isUncertain
    ? `문학 신호(${litHits.join(", ") || "약함"}) vs 비문학 신호(${nonLitHits.join(", ") || "약함"}) — 분류 불확실`
    : category === "문학"
      ? `문학 중심 요소: ${litHits.join(", ") || "키워드 분석"}`
      : `비문학 중심 요소: ${nonLitHits.join(", ") || "키워드 분석"}`;

  return {
    category,
    subCategory,
    confidence: Math.round(confidence),
    reason,
    warnings: [
      "무료 버전 규칙 기반 분류 — 교사 검토 필수",
      "OCR 줄바꿈은 문학 판정에 사용하지 않음",
    ],
    isUncertain,
  };
}

export function classificationToTextType(classification: TextClassification): TextType {
  if (classification.isUncertain && classification.subCategory === "분류 불확실") {
    return classification.category === "문학" ? "literature" : "non_literature";
  }
  return classification.category === "문학" ? "literature" : "non_literature";
}

export const CLASSIFICATION_PROMPT = "규칙 기반 분류 (무료 버전)";
