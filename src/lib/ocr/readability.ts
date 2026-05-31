"use client";

export interface TextQualityMetrics {
  confidence: number;
  koreanRatio: number;
  sentenceCount: number;
  avgWordLength: number;
  readabilityScore: number;
  hasSentenceEndings: boolean;
  hasParticles: boolean;
  specialCharRatio: number;
  lineCount: number;
  avgLineLength: number;
}

export interface ReadabilityOptions {
  psm?: number;
  sourceKey?: string;
  poetryMode?: boolean;
  lang?: "kor" | "kor+eng";
}

const SENTENCE_ENDINGS =
  /(?:다|요|죠|네|구나|이여|하오|세|까|람|오|라|며|고|지|네요|습니다|ㅂ니다)[.!?\s"'」』)]*$/;
const POETRY_ENDINGS = /(?:다|요|네|며|고|지|오|라|세|죠|구나|이여|하오|ㅂ니다|습니다)[.!?\s"'」』)]*$/;
const PARTICLE_PATTERN =
  /(?:은|는|이|가|을|를|의|에|에서|으로|와|과|도|만|에게|께|한테|처럼|보다)/g;
const MEANINGLESS_CHAR_PATTERN = /[※@#$%^&*+=|\\<>~`|^]/g;

export function computeKoreanRatio(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const korean = trimmed.match(/[가-힣]/g)?.length ?? 0;
  const meaningful = trimmed.replace(/\s/g, "").length;
  if (meaningful === 0) return 0;
  return korean / meaningful;
}

export function countSentences(text: string): number {
  const lines = text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

  return Math.max(lines.length, 1);
}

export function computeAvgWordLength(text: string): number {
  const tokens = text
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g, ""))
    .filter((w) => w.length > 0);

  if (tokens.length === 0) {
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return 0;
    return lines.reduce((sum, l) => sum + l.replace(/\s/g, "").length, 0) / lines.length;
  }

  return tokens.reduce((sum, w) => sum + w.length, 0) / tokens.length;
}

export function hasSentenceEndings(text: string, poetryMode = false): boolean {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;

  const pattern = poetryMode ? POETRY_ENDINGS : SENTENCE_ENDINGS;
  const endingCount = lines.filter((line) => pattern.test(line)).length;
  const threshold = poetryMode ? 0.2 : 0.3;
  return endingCount >= Math.max(1, Math.floor(lines.length * threshold));
}

export function computeParticleDensity(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const matches = trimmed.match(PARTICLE_PATTERN)?.length ?? 0;
  return Math.min(1, matches / Math.max(trimmed.length / 8, 1));
}

export function computeSpecialCharRatio(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 1;
  const meaningless = trimmed.match(MEANINGLESS_CHAR_PATTERN)?.length ?? 0;
  const latinNoise = trimmed.match(/\b(?:HJ|HY|He|Hedy|Sd)\b/gi)?.length ?? 0;
  return (meaningless + latinNoise * 2) / trimmed.length;
}

export function computeLineMetrics(text: string): { lineCount: number; avgLineLength: number } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const lineCount = lines.length;
  const avgLineLength =
    lineCount > 0 ? lines.reduce((sum, l) => sum + l.length, 0) / lineCount : 0;
  return { lineCount, avgLineLength };
}

/**
 * 가독성 점수 (0~100) — confidence보다 우선
 */
export function computeReadabilityScore(
  text: string,
  confidence: number,
  options?: ReadabilityOptions
): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const poetryMode = options?.poetryMode ?? false;
  const koreanRatio = computeKoreanRatio(trimmed);
  const sentenceCount = countSentences(trimmed);
  const avgWordLength = computeAvgWordLength(trimmed);
  const endings = hasSentenceEndings(trimmed, poetryMode);
  const particleDensity = computeParticleDensity(trimmed);
  const specialCharRatio = computeSpecialCharRatio(trimmed);
  const { lineCount, avgLineLength } = computeLineMetrics(trimmed);

  let score = 0;

  // 한글 비율 (최대 40)
  score += koreanRatio * 40;

  // confidence는 보조 (최대 5)
  const confNorm = confidence <= 1 ? confidence * 100 : confidence;
  score += Math.min(5, confNorm * 0.05);

  // 어미 (최대 15)
  if (endings) score += 15;
  else if (sentenceCount >= 2) score += 6;

  // 조사 (최대 12)
  score += particleDensity * 12;

  // 행·문장 수 (최대 10)
  score += Math.min(10, sentenceCount * (poetryMode ? 1.5 : 2));

  // 길이 적정 (최대 8)
  if (poetryMode) {
    if (avgLineLength >= 4 && avgLineLength <= 22) score += 8;
    else if (avgLineLength <= 28) score += 4;
    if (lineCount >= 4) score += 4;
  } else if (avgWordLength >= 2 && avgWordLength <= 8) {
    score += 8;
  } else if (avgWordLength <= 12) {
    score += 4;
  }

  // 특수문자·영문 노이즈 페널티
  score -= specialCharRatio * 35;

  if (trimmed.length <= 2) score -= 40;
  else if (trimmed.length <= 5) score -= 15;

  if (koreanRatio >= 0.85) score += 10;
  else if (koreanRatio >= 0.7) score += 6;
  else if (koreanRatio < 0.45) score -= 20;

  if (options?.sourceKey === "original") score += 4;
  if (options?.lang === "kor") score += 6;

  if (poetryMode && (options?.psm === 6 || options?.psm === 11)) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeTextQualityMetrics(
  text: string,
  confidence: number,
  options?: ReadabilityOptions
): TextQualityMetrics {
  const trimmed = text.trim();
  const { lineCount, avgLineLength } = computeLineMetrics(trimmed);

  return {
    confidence: confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence),
    koreanRatio: Math.round(computeKoreanRatio(trimmed) * 100) / 100,
    sentenceCount: countSentences(trimmed),
    avgWordLength: Math.round(computeAvgWordLength(trimmed) * 10) / 10,
    readabilityScore: computeReadabilityScore(trimmed, confidence, options),
    hasSentenceEndings: hasSentenceEndings(trimmed, options?.poetryMode),
    hasParticles: computeParticleDensity(trimmed) > 0.05,
    specialCharRatio: Math.round(computeSpecialCharRatio(trimmed) * 100) / 100,
    lineCount,
    avgLineLength: Math.round(avgLineLength * 10) / 10,
  };
}

export function computeCombinedOcrScore(
  readabilityScore: number,
  workPhraseBonus: number,
  koreanRatio: number
): number {
  const koreanBoost = koreanRatio >= 0.85 ? 5 : koreanRatio >= 0.7 ? 2 : 0;
  return Math.min(100, Math.round(readabilityScore + workPhraseBonus + koreanBoost));
}
