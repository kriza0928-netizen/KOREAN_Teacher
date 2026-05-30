import type { TextClassification, TextType } from "@/types";

const CONNECTOR_PATTERN =
  /그러나|따라서|즉,|예를\s*들어|반면|이러한|또한|뿐만\s*아니라|결론적으로|첫째|둘째|셋째/g;

const SPEAKER_EMOTION_PATTERN =
  /화자|나는|내가|우리는|저는|정서|마음|가슴|눈물|그리움|슬픔|기쁨|외로움|아련|쓸쓸|울먹|울었|그리워|설레/g;

const EMOTION_CONFESSION_PATTERN =
  /사랑|미워|그리워|고백|바라|원하|그립|애틋|회한|후회|감사|미안|태도|느낌|느껴|외롭|고독|그리운|미워하|사모/g;

const POETIC_DEVICE_PATTERN =
  /비유|상징|역설|반어|심상|은유|직유|의인|활유|천유|대구|대조법|메타포|처럼|같이|마치|듯이|겉은.*속은|아니.*이니/g;

const EMOTION_LEXICON_PATTERN =
  /그리움|슬픔|기쁨|외로|사랑|눈물|아련|쓸쓸|그리워|미워|행복|고통|설렘|애틋|회한|한|비|애|정/g;

const CONCEPT_EXPLANATION_PATTERN =
  /란\s|이란|란\?|개념|정의|원리|메커니즘|특징|성질|현상|법칙|이론|체계|과정|방법|유형|종류/g;

const CLAIM_EVIDENCE_PATTERN =
  /주장|근거|논거|반박|입장|견해|해야\s|해야만|필요하|중요하|문제|해결|대책|방안|목적|타당|필연/g;

const CAUSE_EFFECT_PATTERN =
  /원인|결과|인과|때문에|로\s*인해|초래|야기|영향|효과|작용|발생|형성/g;

const COMPARE_ANALYZE_PATTERN =
  /비교|대조|분류|분석|구분|차이|공통점|상반|양면|측면|관점|유사|상이|대립/g;

const INFORMATION_TRANSFER_PATTERN =
  /알려|설명|소개|제시|전달|이해|학습|독자|독자에게|밝히|드러내|보여\s*준|기술/g;

const FIELD_THEORY_PATTERN =
  /과학|기술|인공지능|AI|경제|사회|정치|법|윤리|철학|역사|교육|환경|의학|심리|문화|예술|이론|연구|실험|통계|데이터/g;

const LITERATURE_GENRE_PATTERN = {
  modernPoetry: /(?:^|\s)시(?:\s|$)|詩|시조|자유시|서정\s*시|현대\s*시/g,
  modernNovel: /소설|등장인물|인물|서술자|대화|「|」/g,
  classicPoetry: /시조|가사|향가|시\s*경|한시|고전\s*시/g,
  classicNovel: /고전\s*소설|전기|판소리|허균|김\s*시습/g,
  essay: /수필|에세이|산문|随筆|회고|체험\s*담/g,
};

const NONLIT_FIELD_MAP: Record<string, RegExp> = {
  인문: /철학|역사|윤리|인문|사상|종교|문화\s*인류|고전\s*문헌/,
  사회: /사회|경제|정치|법|제도|정책|시민|복지|노동|인권/,
  과학: /과학|실험|연구|가설|검증|생물|물리|화학|우주|유전/,
  기술: /기술|인공지능|AI|디지털|컴퓨터|프로그램|로봇|인터넷|데이터/,
  예술: /예술|미술|음악|연극|영화|건축|디자인|미학|작품\s*세계/,
  융합: /융합|복합|학제|다학제|통합|interdisciplinary/i,
};

const POETRY_CONTENT_LABELS: Record<string, string> = {
  speakerEmotion: "화자 중심 정서 표현",
  emotionAttitudeConfession: "감정·태도·내면 고백",
  poeticDevices: "비유·상징·역설·반어·심상",
  emotionOverExplanation: "정서 전달 중심",
  stanzaMeaningStructure: "행·연 구분의 의미 형성",
};

const NONLIT_CONTENT_LABELS: Record<string, string> = {
  conceptExplanation: "개념 설명",
  claimEvidence: "주장·근거",
  causeEffect: "원인·결과 설명",
  compareAnalyzeStructure: "비교·대조·분류·분석",
  informationTransfer: "정보 전달 목적",
  fieldTheory: "분야 이론 설명",
  connectorWords: "접속어 다수",
};

interface PoetryContentCriteria {
  speakerEmotion: boolean;
  emotionAttitudeConfession: boolean;
  poeticDevices: boolean;
  emotionOverExplanation: boolean;
  stanzaMeaningStructure: boolean;
}

interface NonLiteratureContentCriteria {
  conceptExplanation: boolean;
  claimEvidence: boolean;
  causeEffect: boolean;
  compareAnalyzeStructure: boolean;
  informationTransfer: boolean;
  fieldTheory: boolean;
  connectorWords: boolean;
}

interface CriteriaScore {
  poetry: PoetryContentCriteria;
  nonLiterature: NonLiteratureContentCriteria;
}

const MIN_POETRY_CONTENT = 3;
const MIN_NONLIT_CONTENT = 2;

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function hasRefrainPattern(text: string): boolean {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 8);
  const freq = new Map<string, number>();
  for (const line of lines) {
    freq.set(line, (freq.get(line) ?? 0) + 1);
  }
  return [...freq.values()].some((n) => n >= 2);
}

function hasExplicitStanzaMarkers(text: string): boolean {
  return /(?:^|\n)\s*(?:제?\s?[1-9一二三四][연章]|첫\s?연|둘째\s?연|셋째\s?연|마지막\s?연)/m.test(
    text
  );
}

function evaluateCriteria(text: string): CriteriaScore {
  const flattened = text.replace(/\n+/g, " ");

  const speakerEmotionCount = countMatches(text, SPEAKER_EMOTION_PATTERN);
  const emotionConfessionCount = countMatches(text, EMOTION_CONFESSION_PATTERN);
  const poeticDeviceCount = countMatches(text, POETIC_DEVICE_PATTERN);
  const emotionLexiconCount = countMatches(text, EMOTION_LEXICON_PATTERN);
  const conceptCount = countMatches(flattened, CONCEPT_EXPLANATION_PATTERN);
  const claimCount = countMatches(flattened, CLAIM_EVIDENCE_PATTERN);
  const connectorCount = countMatches(flattened, CONNECTOR_PATTERN);

  const expositoryScore =
    conceptCount + claimCount + countMatches(flattened, CAUSE_EFFECT_PATTERN);

  return {
    poetry: {
      speakerEmotion: speakerEmotionCount >= 2,
      emotionAttitudeConfession: emotionConfessionCount >= 2,
      poeticDevices: poeticDeviceCount >= 2,
      emotionOverExplanation:
        emotionLexiconCount >= 3 && emotionLexiconCount > expositoryScore,
      stanzaMeaningStructure:
        hasExplicitStanzaMarkers(text) ||
        (hasRefrainPattern(text) && emotionLexiconCount >= 2),
    },
    nonLiterature: {
      conceptExplanation: conceptCount >= 2,
      claimEvidence: claimCount >= 2,
      causeEffect: countMatches(flattened, CAUSE_EFFECT_PATTERN) >= 2,
      compareAnalyzeStructure: countMatches(flattened, COMPARE_ANALYZE_PATTERN) >= 2,
      informationTransfer: countMatches(flattened, INFORMATION_TRANSFER_PATTERN) >= 2,
      fieldTheory: countMatches(flattened, FIELD_THEORY_PATTERN) >= 2,
      connectorWords: connectorCount >= 3,
    },
  };
}

function countTrue(criteria: PoetryContentCriteria | NonLiteratureContentCriteria): number {
  return Object.values(criteria).filter(Boolean).length;
}

function getHitLabels(
  criteria: PoetryContentCriteria | NonLiteratureContentCriteria,
  labels: Record<string, string>
): string[] {
  return Object.entries(criteria)
    .filter(([, v]) => v)
    .map(([k]) => labels[k])
    .filter(Boolean);
}

function detectNonLitSubCategory(text: string): string {
  const scores = Object.entries(NONLIT_FIELD_MAP).map(([field, pattern]) => ({
    field,
    count: countMatches(text, pattern),
  }));
  scores.sort((a, b) => b.count - a.count);

  if (scores[0]?.count >= 1 && scores[1]?.count >= 1) return "융합";
  if (scores[0]?.count >= 1) return scores[0].field;
  return "인문";
}

function detectLiteratureSubCategory(text: string, poetryContentCount: number): string {
  if (LITERATURE_GENRE_PATTERN.classicPoetry.test(text)) return "고전시가";
  if (LITERATURE_GENRE_PATTERN.classicNovel.test(text)) return "고전소설";
  if (LITERATURE_GENRE_PATTERN.modernNovel.test(text)) return "현대소설";
  if (LITERATURE_GENRE_PATTERN.essay.test(text)) return "수필";
  if (poetryContentCount >= MIN_POETRY_CONTENT) return "현대시";
  if (LITERATURE_GENRE_PATTERN.modernPoetry.test(text) && poetryContentCount >= 2) {
    return "현대시";
  }
  return "현대소설";
}

function buildReason(
  poetryCount: number,
  nonLitCount: number,
  poetryHits: string[],
  nonLitHits: string[],
  outcome: "non_literature" | "modern_poetry" | "literature_genre" | "uncertain"
): string {
  if (outcome === "non_literature") {
    return `비문학 내용 조건 ${nonLitCount}개 충족(${nonLitHits.join(", ")}). OCR 줄바꿈·짧은 문장은 판정에 사용하지 않음.`;
  }
  if (outcome === "modern_poetry") {
    return `현대시 내용 조건 ${poetryCount}개 충족(${poetryHits.join(", ")}). 비문학 조건 ${nonLitCount}개(${nonLitHits.join(", ") || "없음"}).`;
  }
  if (outcome === "literature_genre") {
    return `문학 갈래 특성과 내용 조건(${poetryHits.join(", ") || "갈래 표지"})으로 문학 분류. 비문학 조건 ${nonLitCount}개.`;
  }
  return `비문학 ${nonLitCount}개(${nonLitHits.join(", ") || "없음"}), 현대시 내용 ${poetryCount}개(${poetryHits.join(", ") || "없음"}) — 분류 불확실.`;
}

function buildWarnings(
  nonLitCount: number,
  poetryCount: number,
  confidence: number
): string[] {
  const warnings: string[] = [];

  warnings.push("OCR 줄바꿈·짧은 줄·문단 번호는 문학/비문학 판정 근거에서 제외됨.");

  if (nonLitCount >= 1 && poetryCount >= 2 && poetryCount < MIN_POETRY_CONTENT) {
    warnings.push("설명·논증 신호와 정서 표현이 혼재 — 교사 확인 권장.");
  }

  if (confidence < 75) {
    warnings.push("분류 신뢰도 75% 미만 — 교사 검토 필요.");
  }

  return warnings;
}

/**
 * 지문 분류 — 내용 기준 (형태·OCR 줄바꿈 미사용)
 */
export function classifyText(text: string): TextClassification {
  const trimmed = text.trim();
  const criteria = evaluateCriteria(trimmed);
  const poetryCount = countTrue(criteria.poetry);
  const nonLitCount = countTrue(criteria.nonLiterature);
  const poetryHits = getHitLabels(criteria.poetry, POETRY_CONTENT_LABELS);
  const nonLitHits = getHitLabels(criteria.nonLiterature, NONLIT_CONTENT_LABELS);

  let category: "문학" | "비문학";
  let subCategory: string;
  let confidence: number;
  let isUncertain = false;
  let reason: string;

  const hasLiteratureGenreMarker =
    LITERATURE_GENRE_PATTERN.classicPoetry.test(trimmed) ||
    LITERATURE_GENRE_PATTERN.classicNovel.test(trimmed) ||
    LITERATURE_GENRE_PATTERN.modernNovel.test(trimmed) ||
    LITERATURE_GENRE_PATTERN.essay.test(trimmed);

  if (nonLitCount >= MIN_NONLIT_CONTENT) {
    category = "비문학";
    subCategory = detectNonLitSubCategory(trimmed);
    confidence = Math.min(95, 58 + nonLitCount * 7);
    reason = buildReason(poetryCount, nonLitCount, poetryHits, nonLitHits, "non_literature");
  } else if (poetryCount >= MIN_POETRY_CONTENT) {
    category = "문학";
    subCategory = detectLiteratureSubCategory(trimmed, poetryCount);
    confidence = Math.min(92, 52 + poetryCount * 9);
    reason = buildReason(poetryCount, nonLitCount, poetryHits, nonLitHits, "modern_poetry");
  } else if (hasLiteratureGenreMarker && nonLitCount < MIN_NONLIT_CONTENT) {
    category = "문학";
    subCategory = detectLiteratureSubCategory(trimmed, poetryCount);
    confidence = Math.min(78, 48 + poetryCount * 6);
    reason = buildReason(poetryCount, nonLitCount, poetryHits, nonLitHits, "literature_genre");
  } else {
    category = nonLitCount >= poetryCount ? "비문학" : "문학";
    subCategory = "분류 불확실";
    confidence = Math.min(65, 35 + Math.max(poetryCount, nonLitCount) * 6);
    isUncertain = true;
    reason = buildReason(poetryCount, nonLitCount, poetryHits, nonLitHits, "uncertain");
  }

  if (confidence < 75) {
    isUncertain = true;
    if (subCategory === "현대시" && poetryCount < MIN_POETRY_CONTENT) {
      subCategory = "분류 불확실";
    }
  }

  if (isUncertain && subCategory === "현대시" && poetryCount < MIN_POETRY_CONTENT) {
    subCategory = "분류 불확실";
  }

  const warnings = buildWarnings(nonLitCount, poetryCount, confidence);

  return {
    category,
    subCategory,
    confidence: Math.round(confidence),
    reason,
    warnings,
    isUncertain,
  };
}

export function classificationToTextType(classification: TextClassification): TextType {
  if (classification.isUncertain && classification.subCategory === "분류 불확실") {
    return classification.category === "문학" ? "literature" : "non_literature";
  }
  return classification.category === "문학" ? "literature" : "non_literature";
}

export const CLASSIFICATION_PROMPT = `
## 지문 분류 규칙 (반드시 준수)

### 형태 기준 금지
행갈이, 짧은 문장, OCR 줄바꿈, 문단 번호, 연/시 '형식'만으로 현대시로 분류하지 마세요.

### 현대시 (내용 기준 — 3개 이상 충족 필요)
1. 화자 중심의 정서 표현
2. 대상에 대한 감정, 태도, 내면 고백 중심
3. 비유, 상징, 역설, 반어, 심상 등 시적 표현 핵심
4. 사건·개념 설명보다 정서 전달 중심
5. 행·연 구분이 의미 형성에 직접 관여 (형식적 줄바꿈과 구별)

### 비문학 (내용 기준 — 2개 이상이면 우선)
1. 개념 설명
2. 주장과 근거
3. 원인과 결과 설명
4. 비교, 대조, 분류, 분석 구조
5. 정보 전달 목적
6. 과학·기술·사회·인문·예술 이론 설명
7. 접속어: 그러나, 따라서, 즉, 예를 들어, 반면, 이러한, 또한

### 우선순위
비문학 2개 이상 → 무조건 비문학
비문학 부족 + 현대시 내용 3개 이상 → 현대시
둘 다 애매 → 분류 불확실

### 분류 결과 JSON (classification 필드):
{
  "category": "문학" 또는 "비문학",
  "subCategory": "현대시/.../분류 불확실",
  "confidence": 0~100,
  "reason": "내용 기준 분류 근거",
  "warnings": []
}
`.trim();
