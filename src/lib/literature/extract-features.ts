import {
  extractKoreanOnly,
  fuzzyMatchInOcr,
  normalizeOcrText,
  normalizeTerm,
} from "@/lib/literature/normalize";

/** OCR 지문에서 추출한 작품 검색 특징 */
export interface OcrSearchFeatures {
  normalizedText: string;
  /** 인물명·작가명 후보 */
  properNouns: string[];
  /** 지명 */
  placeNames: string[];
  /** 고유명사·핵심 명사 */
  uniqueTerms: string[];
  /** 반복 등장 시어 */
  repeatedTerms: string[];
  /** 상징어·핵심 소재 후보 */
  symbolCandidates: string[];
  /** 정서 키워드 */
  emotions: string[];
  /** 화자/서술 태도 */
  attitudes: string[];
  /** 원문에서 추출한 핵심 토큰 (매칭용) */
  allTokens: string[];
}

const EMOTION_LEXICON = [
  "그리움", "슬픔", "사랑", "기쁨", "외로움", "고독", "불안", "상실", "허무", "애상",
  "그리", "눈물", "정서", "애정", "슬픔", "분노", "그리워", "쓸쓸", "외로", "두려",
  "질투", "성찰", "그리워", "죽음", "이별", "그리운",
];

const ATTITUDE_LEXICON = [
  "나는", "내가", "나의", "그대", "너를", "부르", "외치", "노래", "기다", "그리워",
  "슬퍼", "사랑해", "원망", "탄식", "고백",
];

const PLACE_LEXICON = [
  "경성", "영변", "강변", "고향", "광야", "바다", "산", "들", "마을", "집", "거리",
  "하늘", "땅", "허공", "강", "섬",
];

const SYMBOL_LEXICON = [
  "설렁탕", "인력거", "진달래", "메밀꽃", "동백꽃", "책갈피", "종이", "별", "꽃",
  "이름", "바람", "눈", "해", "달", "나무", "새", "강", "불", "촛불",
];

const STOPWORDS = new Set([
  "그리고", "하지만", "그러나", "따라서", "그래서", "이것", "저것", "것이", "하는",
  "있는", "없는", "된다", "한다", "이다", "에서", "으로", "에게", "처럼", "위해",
  "오늘", "내일", "어제", "때문", "정도", "모든", "어떤", "우리", "그들", "저희",
  "놓았", "놓", "사다", "먹지", "못하", "왜",
]);

function extractTokens(text: string): string[] {
  const raw = text.match(/[가-힣]{2,8}/g) ?? [];
  return raw.filter((w) => !STOPWORDS.has(w));
}

function countFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return freq;
}

function matchLexicon(normalized: string, lexicon: string[]): string[] {
  const found: string[] = [];
  for (const term of lexicon) {
    if (fuzzyMatchInOcr(normalized, term).matched) {
      found.push(term);
    }
  }
  return [...new Set(found)];
}

function detectProperNounCandidates(tokens: string[], normalized: string): string[] {
  const candidates: string[] = [];
  for (const token of tokens) {
    if (token.length >= 2 && token.length <= 4) {
      if (/[가-힣]{2,4}(?:지|씨|님|군|양)$/.test(token)) candidates.push(token);
    }
  }
  const knownNames = [
    "김첨지", "김소월", "윤동주", "이육사", "기형도", "정지용", "김영랑", "박목월",
    "한용운", "현진건", "이효석", "이상", "최인훈", "박경리", "황순원",
  ];
  for (const name of knownNames) {
    if (fuzzyMatchInOcr(normalized, name).matched) candidates.push(name);
  }
  return [...new Set(candidates)];
}

/**
 * 1단계: OCR 텍스트에서 작품 특징 추출
 */
export function extractOcrSearchFeatures(text: string): OcrSearchFeatures {
  const normalizedText = normalizeOcrText(text);
  const tokens = extractTokens(text);
  const freq = countFrequency(tokens);

  const repeatedTerms = [...freq.entries()]
    .filter(([word, count]) => count >= 2 && word.length >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);

  const uniqueTerms = [...new Set(tokens)].slice(0, 30);
  const emotions = matchLexicon(normalizedText, EMOTION_LEXICON);
  const attitudes = matchLexicon(normalizedText, ATTITUDE_LEXICON);
  const placeNames = matchLexicon(normalizedText, PLACE_LEXICON);
  const symbolFromLex = matchLexicon(normalizedText, SYMBOL_LEXICON);

  const symbolCandidates = [
    ...symbolFromLex,
    ...uniqueTerms.filter((t) => t.length >= 2 && t.length <= 5),
  ].slice(0, 12);

  const properNouns = detectProperNounCandidates(tokens, normalizedText);

  return {
    normalizedText,
    properNouns,
    placeNames,
    uniqueTerms,
    repeatedTerms,
    symbolCandidates,
    emotions,
    attitudes,
    allTokens: [...new Set([...uniqueTerms, ...repeatedTerms, ...emotions, ...properNouns])],
  };
}

/** 특징 요약 (UI·디버그용) */
export function summarizeFeatures(features: OcrSearchFeatures): string[] {
  return [
    ...features.properNouns.slice(0, 4),
    ...features.symbolCandidates.slice(0, 4),
    ...features.emotions.slice(0, 3),
    ...features.repeatedTerms.slice(0, 2),
  ].filter(Boolean);
}

export function tokenAppearsInFeatures(features: OcrSearchFeatures, term: string): boolean {
  const norm = normalizeTerm(term);
  if (!norm) return false;
  if (fuzzyMatchInOcr(features.normalizedText, norm).matched) return true;
  return features.allTokens.some((t) => fuzzyMatchInOcr(normalizeTerm(t), norm).matched);
}

export function extractKoreanTokensForDisplay(text: string): string {
  return extractKoreanOnly(text).slice(0, 80);
}
