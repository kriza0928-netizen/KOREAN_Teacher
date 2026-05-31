import { loadLiteratureDatabase } from "@/lib/literature/load-database";
import type { LiteratureWork, WorkSearchMatch, WorkSelection } from "@/lib/literature/types";

let worksById: Map<string, LiteratureWork> | null = null;

function ensureWorksById(): Map<string, LiteratureWork> {
  if (!worksById) {
    worksById = new Map(loadLiteratureDatabase().works.map((work) => [work.id, work]));
  }
  return worksById;
}

export function getWorkById(workId: string): LiteratureWork | undefined {
  return ensureWorksById().get(workId);
}

/** 클라이언트·서버 공용 — search.ts 전체를 불러오지 않음 */
export function enrichWorkSelection(match: WorkSearchMatch): WorkSelection {
  const work = getWorkById(match.workId);
  const theme =
    work?.themes?.join(", ") ??
    work?.theme ??
    match.matchReasons.find((r) => r.label === "핵심어")?.matchedTerm;

  return {
    mode: "db",
    workId: match.workId,
    title: match.title,
    author: match.author,
    source: match.source ?? work?.source,
    genre: work?.genre ?? match.genre,
    era: work?.era,
    theme,
    textbookGuide: work?.textbookGuide,
    matchScore: match.score,
    matchReasons: match.matchReasons,
  };
}
