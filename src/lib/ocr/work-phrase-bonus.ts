import { loadLiteratureDatabase } from "@/lib/literature/load-database";
import { findBestLineMatch } from "@/lib/literature/line-similarity";
import { buildWorkSearchProfile } from "@/lib/literature/work-profile";

export interface WorkPhraseMatch {
  phrase: string;
  title: string;
  author: string;
  similarity: number;
}

export interface WorkPhraseBonusResult {
  bonus: number;
  matches: WorkPhraseMatch[];
}

const profiles = loadLiteratureDatabase().works.map(buildWorkSearchProfile);
const MAX_BONUS = 25;

function buildOcrLineCandidates(text: string): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 4);

  return [text, ...lines];
}

/** OCR 텍스트와 작품 DB 대표 구절 유사도 → 가산점 (0~25) */
export function computeWorkPhraseBonus(text: string): WorkPhraseBonusResult {
  const trimmed = text.trim();
  if (trimmed.length < 6) {
    return { bonus: 0, matches: [] };
  }

  const candidates = buildOcrLineCandidates(trimmed);
  const matches: WorkPhraseMatch[] = [];
  const seen = new Set<string>();

  for (const profile of profiles) {
    for (const phrase of profile.uniquePhrases.slice(0, 12)) {
      const key = `${profile.work.id}:${phrase}`;
      if (seen.has(key)) continue;

      const best = findBestLineMatch(candidates, [phrase]);
      if (!best || best.similarity < 65) continue;

      seen.add(key);
      matches.push({
        phrase,
        title: profile.work.title,
        author: profile.work.author,
        similarity: best.similarity,
      });
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity);

  let bonus = 0;
  for (const match of matches.slice(0, 4)) {
    bonus += match.similarity >= 90 ? 10 : match.similarity >= 80 ? 7 : 4;
  }

  return { bonus: Math.min(MAX_BONUS, bonus), matches: matches.slice(0, 5) };
}
