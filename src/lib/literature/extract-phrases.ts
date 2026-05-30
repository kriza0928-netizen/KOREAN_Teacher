import { PHRASE_COUNT_MAX, PHRASE_COUNT_MIN } from "@/lib/literature/types";

const POETRY_ENDINGS = /(?:이여|이여!|구나|구나!|네|세|다|요|죠|까)\s*$/;
const LITERARY_MARKERS =
  /(?:이여|그대|화자|바람|별|하늘|눈물|사랑|그리|꽃|이름|마음|세상|어머니|아버지|님)/;

function splitCandidates(text: string): string[] {
  const chunks: string[] = [];

  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim();
    if (trimmed.length >= 6) chunks.push(trimmed);
  }

  for (const sentence of text.replace(/\n+/g, " ").split(/(?<=[.!?。])\s+|(?<=다)\s+|(?<=요)\s+|(?<=죠)\s+/)) {
    const trimmed = sentence.trim();
    if (trimmed.length >= 8 && trimmed.length <= 80) chunks.push(trimmed);
  }

  return chunks;
}

function scorePhrase(phrase: string): number {
  let score = 0;
  const len = phrase.length;

  if (len >= 10 && len <= 45) score += 3;
  else if (len >= 8 && len <= 55) score += 2;
  else if (len > 55) score -= 1;

  if (/[가-힣]/.test(phrase)) score += 2;
  if (POETRY_ENDINGS.test(phrase)) score += 3;
  if (LITERARY_MARKERS.test(phrase)) score += 2;
  if (/^\d+$/.test(phrase.replace(/\s/g, ""))) score -= 5;
  if (/^[a-zA-Z0-9\s]+$/.test(phrase)) score -= 3;

  return score;
}

function dedupePhrases(phrases: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const phrase of phrases) {
    const key = phrase.replace(/\s+/g, "").slice(0, 20);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(phrase);
  }
  return result;
}

/**
 * OCR 지문에서 작품 검색용 대표 구절 3~5개 추출
 */
export function extractSearchPhrases(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const ranked = dedupePhrases(splitCandidates(trimmed))
    .map((phrase) => ({ phrase, score: scorePhrase(phrase) }))
    .filter(({ phrase, score }) => score > 0 && phrase.length >= 8)
    .sort((a, b) => b.score - a.score || b.phrase.length - a.phrase.length);

  const selected = ranked.slice(0, PHRASE_COUNT_MAX).map((r) => r.phrase);

  if (selected.length >= PHRASE_COUNT_MIN) return selected;

  const fallback = dedupePhrases(splitCandidates(trimmed))
    .filter((p) => p.length >= 8)
    .slice(0, PHRASE_COUNT_MAX);

  return fallback.length > 0 ? fallback : selected;
}
