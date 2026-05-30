import type { AnalysisResponse, Disclaimer, TextType } from "@/types";

export interface RagDocument {
  id: string;
  title: string;
  author: string;
  genre: string;
  excerpt: string;
  metadata: Record<string, string>;
}

export interface RagSearchResult {
  documents: RagDocument[];
  query: string;
}

export interface VectorStore {
  search(query: string, limit?: number): Promise<RagSearchResult>;
  isAvailable(): boolean;
}

/** 추후 Pinecone, Qdrant, Supabase pgvector 등으로 교체 */
export class MockVectorStore implements VectorStore {
  isAvailable(): boolean {
    return process.env.RAG_ENABLED === "true";
  }

  async search(query: string, limit = 3): Promise<RagSearchResult> {
    if (!this.isAvailable()) {
      return { documents: [], query };
    }

    return {
      query,
      documents: [
        {
          id: "demo-1",
          title: "데모 작품",
          author: "데모 작가",
          genre: "시",
          excerpt: "벡터 DB 연동 후 실제 교과서/문학작품 DB에서 검색됩니다.",
          metadata: { era: "현대", source: "교과서 DB (데모)" },
        },
      ].slice(0, limit),
    };
  }
}

export function createVectorStore(): VectorStore {
  return new MockVectorStore();
}

export async function enrichWithRag(
  text: string,
  textType: TextType
): Promise<{ context: string; sources: string[]; used: boolean }> {
  const store = createVectorStore();

  if (!store.isAvailable()) {
    return { context: "", sources: [], used: false };
  }

  const snippet = text.slice(0, 200);
  const result = await store.search(`${textType} ${snippet}`);

  if (result.documents.length === 0) {
    return { context: "", sources: [], used: false };
  }

  const context = result.documents
    .map(
      (d) =>
        `[${d.title} / ${d.author}] ${d.genre}: ${d.excerpt} (출처: ${d.metadata.source ?? "미상"})`
    )
    .join("\n");

  const sources = result.documents.map((d) => `${d.title} - ${d.author}`);

  return { context, sources, used: true };
}

export const DEFAULT_DISCLAIMER = {
  sourceAccuracy:
    "원문 후보 정확도: AI 추론 기반이며 100% 정확하지 않을 수 있습니다. 반드시 교과서·원작과 대조하세요.",
  copyrightNotice:
    "저작권 주의: 원문 전체를 제공하지 않습니다. 짧은 인용만 포함되며, 수업 자료 배포 시 저작권법을 준수하세요.",
  teacherReviewRequired:
    "교사용 검토 필요: 본 분석은 수업 준비 보조 자료입니다. 최종 수업 내용은 교사가 검토·수정해야 합니다.",
};

export function buildAnalysisResponse(
  partial: Omit<AnalysisResponse, "disclaimer"> & {
    disclaimer?: Disclaimer;
    isDraft?: boolean;
    analysisProvider?: string;
  }
): AnalysisResponse {
  return {
    ...partial,
    disclaimer: partial.disclaimer ?? DEFAULT_DISCLAIMER,
    ragContextUsed: partial.ragContextUsed ?? false,
    ragSources: partial.ragSources ?? [],
    isDraft: partial.isDraft ?? false,
    analysisProvider: partial.analysisProvider ?? "rule-based",
  };
}
