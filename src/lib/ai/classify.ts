import type { TextClassification, TextType } from "@/types";

const CONNECTOR_PATTERN =
  /따라서|그러나|그런데|예를 들어|반면|즉,|이러한|또한|뿐만 아니라|결론적으로|첫째|둘째|셋째/g;

const POETRY_LYRICAL_PATTERN =
  /화자|정서|심상|상징|비유|은유|직유|운율|감각|이미지|여운|애상|그리움|슬픔|기쁨|외로|그리워|사랑|눈물|하늘|바람|꽃|달|별/g;

const POETRY_IMAGERY_PATTERN =
  /처럼|같이|마치|~듯|~인 듯|피어나|흘러|스며|번져|물들|흔들/g;

const NONLIT_CONCEPT_PATTERN =
  /란\s|이란|란\?|개념|정의|원리|메커니즘|특징|성질|현상|법칙|이론|체계|과정|원인|결과/g;

const NONLIT_CLAIM_PATTERN =
  /주장|근거|논거|반박|입장|견해|해야\s|해야만|필요|중요|문제|해결|대책|방안|목적/g;

const NONLIT_STRUCTURE_PATTERN =
  /원인|결과|비교|대조|문제|해결|전후|차이|공통점|상반|양면|측면|관점/g;

const NONLIT_FIELD_PATTERN =
  /과학|기술|인공지능|AI|경제|사회|정치|법|윤리|철학|역사|교육|환경|의학|심리|문화|예술|문학\s*사|통계|데이터|연구|실험/g;

const LITERATURE_GENRE_PATTERN = {
  modernPoetry: /시\b|詩|연\s*\d|화자|운율|시조|자유시|서정/g,
  modernNovel: /소설|등장인물|인물|서술|대화|「|」|작가\s*소설/g,
  classicPoetry: /시조|가사|향가|시\s*경|한시|고전\s*시|조선\s*시/g,
  classicNovel: /고전\s*소설|전기|이야기|옛\s*이야기|판소리|허균|김\s*시습/g,
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

interface CriteriaScore {
  poetry: {
    shortLinesAndBreaks: boolean;
    lyricalExpression: boolean;
    stanzaDivision: boolean;
    imagerySymbolism: boolean;
    emotionOverArgument: boolean;
  };
  nonLiterature: {
    conceptExplanation: boolean;
    claimEvidence: boolean;
    logicalStructure: boolean;
    knowledgeTransfer: boolean;
    longSentencesParagraphs: boolean;
    connectorWords: boolean;
  };
}

function getLines(text: string): string[] {
  return text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
}

function getSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/[.!?。]\s*|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
}

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function evaluateCriteria(text: string): CriteriaScore {
  const lines = getLines(text);
  const sentences = getSentences(text);
  const avgLineLength =
    lines.length > 0 ? lines.reduce((sum, l) => sum + l.length, 0) / lines.length : 0;
  const avgSentenceLength =
    sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
      : text.length;

  const shortLines = lines.filter((l) => l.length <= 35).length;
  const shortLineRatio = lines.length > 0 ? shortLines / lines.length : 0;

  const emptyLineGroups = (text.match(/\n\s*\n/g) ?? []).length;
  const hasStanzaPattern =
    emptyLineGroups >= 1 ||
    (lines.length >= 6 && shortLineRatio >= 0.6 && lines.every((l) => l.length <= 50));

  const lyricalCount = countMatches(text, POETRY_LYRICAL_PATTERN);
  const imageryCount = countMatches(text, POETRY_IMAGERY_PATTERN);
  const connectorCount = countMatches(text, CONNECTOR_PATTERN);
  const conceptCount = countMatches(text, NONLIT_CONCEPT_PATTERN);
  const claimCount = countMatches(text, NONLIT_CLAIM_PATTERN);
  const structureCount = countMatches(text, NONLIT_STRUCTURE_PATTERN);
  const fieldCount = countMatches(text, NONLIT_FIELD_PATTERN);

  const emotionalWords = countMatches(
    text,
    /그리움|슬픔|기쁨|외로|사랑|눈물|아련|쓸쓸|그리워|미워|행복|고통|설렘/g
  );
  const logicalWords = connectorCount + claimCount + conceptCount;

  const paragraphs = text.split(/\n\s*\n+/).filter((p) => p.trim().length > 30);
  const longSentenceCount = sentences.filter((s) => s.length >= 45).length;

  return {
    poetry: {
      shortLinesAndBreaks:
        lines.length >= 4 && avgLineLength <= 38 && shortLineRatio >= 0.55,
      lyricalExpression: lyricalCount >= 2,
      stanzaDivision: hasStanzaPattern,
      imagerySymbolism: imageryCount >= 2 || lyricalCount >= 3,
      emotionOverArgument: emotionalWords >= 2 && emotionalWords >= logicalWords * 0.4,
    },
    nonLiterature: {
      conceptExplanation: conceptCount >= 2,
      claimEvidence: claimCount >= 2,
      logicalStructure: structureCount >= 2,
      knowledgeTransfer: fieldCount >= 2,
      longSentencesParagraphs:
        avgSentenceLength >= 35 ||
        longSentenceCount >= 2 ||
        paragraphs.length >= 2,
      connectorWords: connectorCount >= 2,
    },
  };
}

function countTrue(criteria: Record<string, boolean>): number {
  return Object.values(criteria).filter(Boolean).length;
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

function detectLiteratureSubCategory(text: string, poetryScore: number): string {
  if (poetryScore >= 2 && LITERATURE_GENRE_PATTERN.modernPoetry.test(text)) return "현대시";
  if (LITERATURE_GENRE_PATTERN.classicPoetry.test(text)) return "고전시가";
  if (LITERATURE_GENRE_PATTERN.classicNovel.test(text)) return "고전소설";
  if (LITERATURE_GENRE_PATTERN.modernNovel.test(text)) return "현대소설";
  if (LITERATURE_GENRE_PATTERN.essay.test(text)) return "수필";
  if (poetryScore >= 2) return "현대시";
  return "현대소설";
}

function buildReason(
  poetryCount: number,
  nonLitCount: number,
  criteria: CriteriaScore,
  forcedNonLit: boolean
): string {
  const poetryHits = Object.entries(criteria.poetry)
    .filter(([, v]) => v)
    .map(([k]) => {
      const labels: Record<string, string> = {
        shortLinesAndBreaks: "행갈이·짧은 문장",
        lyricalExpression: "화자·정서·심상 중심",
        stanzaDivision: "연/시 구분",
        imagerySymbolism: "상징·비유 표현",
        emotionOverArgument: "감정 표현 중심",
      };
      return labels[k];
    });

  const nonLitHits = Object.entries(criteria.nonLiterature)
    .filter(([, v]) => v)
    .map(([k]) => {
      const labels: Record<string, string> = {
        conceptExplanation: "개념 설명",
        claimEvidence: "주장·근거",
        logicalStructure: "원인·결과·비교·대조·문제·해결",
        knowledgeTransfer: "지식 전달 목적",
        longSentencesParagraphs: "긴 문장·문단 구조",
        connectorWords: "논설 연결어",
      };
      return labels[k];
    });

  if (forcedNonLit) {
    return `설명문/논설문 특성(${nonLitHits.join(", ")})이 우선 적용됨. 시 형식(행갈이 ${poetryCount}개 조건)보다 비문학 신호(${nonLitCount}개)가 강함.`;
  }

  if (nonLitCount > poetryCount) {
    return `비문학 조건 ${nonLitCount}개 충족(${nonLitHits.join(", ")}). 문학 조건 ${poetryCount}개(${poetryHits.join(", ") || "없음"}).`;
  }

  return `문학 조건 ${poetryCount}개 충족(${poetryHits.join(", ")}). 비문학 조건 ${nonLitCount}개(${nonLitHits.join(", ") || "없음"}).`;
}

function buildWarnings(
  text: string,
  criteria: CriteriaScore,
  poetryCount: number,
  nonLitCount: number,
  confidence: number
): string[] {
  const warnings: string[] = [];

  if (criteria.poetry.shortLinesAndBreaks && nonLitCount >= 2) {
    warnings.push("OCR 줄바꿈으로 인한 오분류 가능성: 행갈이가 많아 시처럼 보일 수 있음.");
  }

  if (confidence < 75) {
    warnings.push("분류 신뢰도 75% 미만 — 현대시로 확정하지 않음. 교사 검토 필요.");
  }

  if (poetryCount >= 1 && poetryCount < 2 && criteria.poetry.shortLinesAndBreaks) {
    warnings.push("현대시 판단 조건(2개 이상) 미충족 — 시 형식만으로는 분류하지 않음.");
  }

  const lines = getLines(text);
  if (lines.length > 8 && criteria.nonLiterature.connectorWords) {
    warnings.push("연결어가 많아 논설/설명문일 가능성이 높음.");
  }

  return warnings;
}

/**
 * 지문 분류 — 현대시 오분류 방지 규칙 적용
 */
export function classifyText(text: string): TextClassification {
  const trimmed = text.trim();
  const criteria = evaluateCriteria(trimmed);
  const poetryCount = countTrue(criteria.poetry);
  const nonLitCount = countTrue(criteria.nonLiterature);

  const isExpositoryOverride =
    nonLitCount >= 3 ||
    (nonLitCount >= 2 &&
      (criteria.nonLiterature.claimEvidence ||
        criteria.nonLiterature.conceptExplanation) &&
      criteria.nonLiterature.connectorWords);

  const wouldBeModernPoetry = poetryCount >= 2 && !isExpositoryOverride;

  let category: "문학" | "비문학";
  let subCategory: string;
  let confidence: number;

  if (isExpositoryOverride || nonLitCount > poetryCount) {
    category = "비문학";
    subCategory = detectNonLitSubCategory(trimmed);
    confidence = Math.min(
      95,
      55 + nonLitCount * 8 + (isExpositoryOverride ? 12 : 0)
    );
  } else if (wouldBeModernPoetry) {
    category = "문학";
    subCategory = detectLiteratureSubCategory(trimmed, poetryCount);
    confidence = Math.min(92, 50 + poetryCount * 10 + (nonLitCount === 0 ? 10 : 0));
  } else if (poetryCount >= 1 && nonLitCount <= 1) {
    category = "문학";
    subCategory = detectLiteratureSubCategory(trimmed, poetryCount);
    confidence = Math.min(70, 40 + poetryCount * 8);
  } else if (nonLitCount >= 1) {
    category = "비문학";
    subCategory = detectNonLitSubCategory(trimmed);
    confidence = Math.min(88, 50 + nonLitCount * 7);
  } else {
    category = "비문학";
    subCategory = detectNonLitSubCategory(trimmed);
    confidence = 45;
  }

  const forcedNonLit = isExpositoryOverride;
  const reason = buildReason(poetryCount, nonLitCount, criteria, forcedNonLit);

  let isUncertain = false;

  if (confidence < 75) {
    isUncertain = true;
    if (wouldBeModernPoetry || subCategory === "현대시") {
      subCategory = "분류 불확실";
      if (nonLitCount >= 2) {
        category = "비문학";
        subCategory = detectNonLitSubCategory(trimmed);
      }
    }
  }

  if (wouldBeModernPoetry && poetryCount < 2) {
    isUncertain = true;
    subCategory = "분류 불확실";
    category = nonLitCount >= poetryCount ? "비문학" : category;
    confidence = Math.min(confidence, 60);
  }

  const warnings = buildWarnings(trimmed, criteria, poetryCount, nonLitCount, confidence);

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

### 현대시로 분류하려면 아래 조건 **2개 이상** 충족 필요:
1. 행갈이가 많고 문장이 짧다
2. 화자, 정서, 심상, 상징, 비유 표현이 중심이다
3. 연 구분이 있다
4. 서정적 표현이 많다
5. 설명/논증보다 감정 표현이 중심이다

### 비문학 우선 적용 조건:
1. 개념 설명이 많다
2. 주장과 근거가 있다
3. 원인·결과, 비교·대조, 문제·해결 구조가 있다
4. 과학·기술·사회·인문·예술 분야 지식 전달 목적
5. 문장이 길고 문단 구조가 뚜렷하다
6. '따라서', '그러나', '예를 들어', '반면', '즉', '이러한' 등 연결어가 많다

### OCR 줄바꿈 주의:
OCR 결과가 줄바꿈 때문에 시처럼 보여도, 내용이 설명문/논설문이면 **반드시 비문학**으로 분류.

### 신뢰도 규칙:
- confidence 75 미만이면 현대시로 확정하지 말 것
- subCategory를 "분류 불확실"로 표시 가능

### 분류 결과 JSON (classification 필드):
{
  "category": "문학" 또는 "비문학",
  "subCategory": "현대시/현대소설/고전시가/고전소설/수필/인문/사회/과학/기술/예술/융합/분류 불확실",
  "confidence": 0~100,
  "reason": "분류 근거",
  "warnings": ["OCR 줄바꿈으로 인한 오분류 가능성 등"]
}
`.trim();
