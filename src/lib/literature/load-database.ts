import worksDatabase from "@/data/literature-works.json";
import { applyTextbookEnrichment } from "@/data/textbook-enrichment";
import type { LiteratureWorksDatabase } from "@/lib/literature/types";

/** enrichment 병합된 교과서 작품 DB */
export const enrichedLiteratureDatabase: LiteratureWorksDatabase =
  applyTextbookEnrichment(worksDatabase as LiteratureWorksDatabase);

export function loadLiteratureDatabase(): LiteratureWorksDatabase {
  return enrichedLiteratureDatabase;
}
