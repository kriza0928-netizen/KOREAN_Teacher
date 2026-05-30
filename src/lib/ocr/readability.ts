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
}

const SENTENCE_ENDINGS = /(?:다|요|죠|네|구나|이여|하오|세|까|람|오|라)[.!?\s"'」』)]*$/;
const PARTICLE_PATTERN = /(?:은|는|이|가|을|를|의|에|에서|으로|와|과|도|만|에게|께|한테|처럼|보다)/g;
const MEANINGLESS_CHAR_PATTERN = /[^\uAC00-\uD7A3a-zA-Z0-9\s.,!?…\-'"「」『』()\[\]]/g;

export function computeKoreanRatio(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return (trimmed.match(/[가-힣]/g)?.length ?? 0) / trimmed.length;
}

export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const byPunctuation = trimmed
    .split(/[.!?。]\s*|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

  return Math.max(byPunctuation.length, 1);
}

export function computeAvgWordLength(text: string): number {
  const tokens = text
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g, ""))
    .filter((w) => w.length > 0);

  if (tokens.length === 0) return 0;
  return tokens.reduce((sum, w) => sum + w.length, 0) / tokens.length;
}

export function hasSentenceEndings(text: string): boolean {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  const endingCount = lines.filter((line) => SENTENCE_ENDINGS.test(line)).length;
  return endingCount >= Math.max(1, Math.floor(lines.length * 0.3));
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
  return meaningless / trimmed.length;
}

export function isLiteratureLike(text: string): boolean {
  const koreanRatio = computeKoreanRatio(text);
  if (koreanRatio < 0.45) return false;
  return (
    /(?:이여|구나|하오|네|세|다|요)|(?:화자|그대|바람|별|꽃|이름)/.test(text) ||
    hasSentenceEndings(text)
  );
}

/**
 * 가독성 점수 (0~100) — confidence보다 우선
 * - 한글 비율 높음
 * - 문장 종결어미
 * - 조사 존재
 * - 의미 없는 특수문자 적음
 * - confidence 낮아도 한글 비율 높으면 가산
 */
export function computeReadabilityScore(
  text: string,
  confidence: number,
  options?: { psm?: number; sourceKey?: string }
): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const koreanRatio = computeKoreanRatio(trimmed);
  const sentenceCount = countSentences(trimmed);
  const avgWordLength = computeAvgWordLength(trimmed);
  const endings = hasSentenceEndings(trimmed);
  const particleDensity = computeParticleDensity(trimmed);
  const specialCharRatio = computeSpecialCharRatio(trimmed);

  let score = 0;

  // 한글 비율 (최대 35) — confidence보다 우선
  score += koreanRatio * 35;

  // confidence는 보조 (최대 12)
  const confNorm = confidence <= 1 ? confidence * 100 : confidence;
  score += Math.min(12, confNorm * 0.12);

  // 문장 종결 (최대 15)
  if (endings) score += 15;
  else if (sentenceCount >= 2) score += 8;

  // 조사 (최대 12)
  score += particleDensity * 12;

  // 문장 수 (최대 10)
  score += Math.min(10, sentenceCount * 2);

  // 평균 단어 길이 — 한글 2~8자 적정 (최대 8)
  if (avgWordLength >= 2 && avgWordLength <= 8) score += 8;
  else if (avgWordLength >= 1.5 && avgWordLength <= 12) score += 4;

  // 특수문자 페널티
  score -= specialCharRatio * 25;

  // 1~2자 오인식 페널티
  if (trimmed.length <= 2) score -= 40;
  else if (trimmed.length <= 5) score -= 15;

  // 한글 비율 높으면 confidence 낮아도 가산
  if (koreanRatio >= 0.7) score += 12;
  else if (koreanRatio >= 0.5) score += 6;

  // 원본 이미지 가산
  if (options?.sourceKey === "original") score += 6;

  // 한글 문학 — PSM 6 우선
  if (options?.psm === 6 && isLiteratureLike(trimmed)) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeTextQualityMetrics(
  text: string,
  confidence: number,
  options?: { psm?: number; sourceKey?: string }
): TextQualityMetrics {
  const trimmed = text.trim();
  return {
    confidence: confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence),
    koreanRatio: Math.round(computeKoreanRatio(trimmed) * 100) / 100,
    sentenceCount: countSentences(trimmed),
    avgWordLength: Math.round(computeAvgWordLength(trimmed) * 10) / 10,
    readabilityScore: computeReadabilityScore(trimmed, confidence, options),
    hasSentenceEndings: hasSentenceEndings(trimmed),
    hasParticles: computeParticleDensity(trimmed) > 0.05,
    specialCharRatio: Math.round(computeSpecialCharRatio(trimmed) * 100) / 100,
  };
}
