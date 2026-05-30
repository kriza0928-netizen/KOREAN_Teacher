"use client";

import type { ManualSourceInput } from "@/types";
import type { WorkSearchMatch, WorkSearchResult } from "@/lib/literature/types";
import { AUTO_MATCH_THRESHOLD } from "@/lib/literature/types";

interface WorkSearchPanelProps {
  searchResult: WorkSearchResult | null;
  isSearching: boolean;
  manualSource: ManualSourceInput;
  onSelectMatch: (match: WorkSearchMatch) => void;
}

export function WorkSearchPanel({
  searchResult,
  isSearching,
  manualSource,
  onSelectMatch,
}: WorkSearchPanelProps) {
  if (isSearching) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-primary">작품 검색</h2>
        <p className="mt-2 text-sm text-muted">지문 구절과 작품 DB를 비교하는 중...</p>
      </div>
    );
  }

  if (!searchResult) return null;

  const { phrases, matches, autoMatch, notFound } = searchResult;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-primary">작품 검색 (무료 DB)</h2>
      <p className="mb-3 text-xs text-muted">
        OCR 지문에서 추출한 구절과 국어 교과서 작품 DB를 비교합니다.
      </p>

      {phrases.length > 0 && (
        <div className="mb-4 rounded-lg bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-muted">추출 구절 ({phrases.length}개)</p>
          <ul className="space-y-1">
            {phrases.map((phrase, i) => (
              <li key={i} className="text-sm leading-relaxed text-gray-800">
                &ldquo;{phrase}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      {autoMatch && (
        <div className="mb-4 rounded-xl border border-success/40 bg-green-50 p-4">
          <p className="text-xs font-semibold text-success">자동 매칭 ({autoMatch.confidence}% ≥ {AUTO_MATCH_THRESHOLD}%)</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700">작품명:</dt>
              <dd>{autoMatch.title}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700">작가:</dt>
              <dd>{autoMatch.author}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700">신뢰도:</dt>
              <dd>{autoMatch.confidence}%</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">
            매칭 구절: &ldquo;{autoMatch.matchedPhrase}&rdquo; ↔ &ldquo;{autoMatch.matchedKeyword}&rdquo;
          </p>
        </div>
      )}

      {notFound ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          작품을 찾지 못했습니다. 아래에서 직접 입력하거나 DB에 작품을 추가해 주세요.
        </div>
      ) : (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">상위 {matches.length}개 후보</p>
          <div className="space-y-2">
            {matches.map((match) => {
              const selected = manualSource.title === match.title && manualSource.author === match.author;
              return (
                <button
                  key={match.workId}
                  type="button"
                  onClick={() => onSelectMatch(match)}
                  className={`w-full rounded-xl border p-3 text-left transition active:scale-[0.99] ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-white hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-primary">
                        {match.title} · {match.author}
                      </p>
                      {match.genre && (
                        <p className="mt-0.5 text-xs text-muted">{match.genre}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {match.confidence}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    &ldquo;{match.matchedPhrase}&rdquo; ↔ &ldquo;{match.matchedKeyword}&rdquo;
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
