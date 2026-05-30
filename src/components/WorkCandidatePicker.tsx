"use client";

import type { WorkSearchMatch, WorkSelection } from "@/lib/literature/types";
import type { TextClassification } from "@/types";

interface WorkCandidatePickerProps {
  classification: TextClassification | null;
  searchResult: {
    matches: WorkSearchMatch[];
    notFound: boolean;
  } | null;
  isSearching: boolean;
  selection: WorkSelection | null;
  onSelectCandidate: (match: WorkSearchMatch) => void;
  onSelectManual: () => void;
  manualOpen: boolean;
  manualTitle: string;
  manualAuthor: string;
  manualSource: string;
  onManualTitleChange: (v: string) => void;
  onManualAuthorChange: (v: string) => void;
  onManualSourceChange: (v: string) => void;
  onConfirmManual: () => void;
}

function formatReasonLabel(reason: WorkSearchMatch["matchReasons"][0]): string {
  return reason.matchedTerm || reason.label.replace(/ 일치| 구절 일치| 키워드 일치/g, "");
}

export function WorkCandidatePicker({
  classification,
  searchResult,
  isSearching,
  selection,
  onSelectCandidate,
  onSelectManual,
  manualOpen,
  manualTitle,
  manualAuthor,
  manualSource,
  onManualTitleChange,
  onManualAuthorChange,
  onManualSourceChange,
  onConfirmManual,
}: WorkCandidatePickerProps) {
  const matches = searchResult?.matches ?? [];

  return (
    <div className="space-y-4">
      {classification && (
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted">지문 분류</p>
          <p className="mt-1 text-base font-semibold text-primary">
            {classification.category} · {classification.subCategory}
          </p>
          <p className="mt-1 text-xs text-muted">{classification.reason}</p>
        </div>
      )}

      <div>
        <h2 className="mb-1 text-base font-semibold text-primary">작품 후보 선택</h2>
        <p className="mb-3 text-xs text-muted">
          유사도 순 상위 후보 중 하나를 선택한 뒤 분석하세요.
        </p>

        {isSearching && (
          <p className="rounded-lg bg-gray-50 p-4 text-sm text-muted">작품 DB 검색 중...</p>
        )}

        {!isSearching && matches.length > 0 && (
          <div className="space-y-3">
            {matches.map((match, index) => {
              const selected =
                selection?.mode === "db" && selection.workId === match.workId;

              return (
                <div
                  key={match.workId}
                  className={`rounded-2xl border-2 p-4 transition ${
                    selected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-white shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-muted">후보 {index + 1}</p>
                      <p className="text-lg font-bold text-primary">{match.title}</p>
                      <p className="text-sm text-gray-700">{match.author}</p>
                      {match.genre && (
                        <p className="mt-0.5 text-xs text-muted">{match.genre}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-accent/15 px-3 py-1 text-sm font-bold text-accent">
                      유사도 {match.score}%
                    </span>
                  </div>

                  {match.matchReasons.length > 0 && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3">
                      <p className="mb-2 text-xs font-semibold text-muted">매칭 근거</p>
                      <ul className="flex flex-wrap gap-2">
                        {match.matchReasons
                          .sort((a, b) => b.points - a.points)
                          .slice(0, 6)
                          .map((reason, i) => (
                            <li
                              key={i}
                              className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-800"
                            >
                              ✓ {formatReasonLabel(reason)}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectCandidate(match)}
                    className={`mt-3 w-full rounded-xl py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                      selected
                        ? "bg-primary text-white"
                        : "border-2 border-primary bg-white text-primary hover:bg-primary/5"
                    }`}
                  >
                    {selected ? "✓ 선택됨" : "선택"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!isSearching && matches.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            작품을 찾지 못했습니다. 아래 [직접 입력]을 이용해 주세요.
          </div>
        )}

        <button
          type="button"
          onClick={onSelectManual}
          className={`mt-4 w-full rounded-xl border-2 py-3 text-sm font-semibold transition active:scale-[0.98] ${
            selection?.mode === "manual" || manualOpen
              ? "border-accent bg-accent/10 text-accent"
              : "border-dashed border-border bg-white text-muted hover:border-accent/50"
          }`}
        >
          ✏️ 직접 입력
        </button>

        {manualOpen && (
          <div className="mt-3 space-y-2 rounded-xl border border-border bg-gray-50 p-4">
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => onManualTitleChange(e.target.value)}
              placeholder="작품명 *"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              value={manualAuthor}
              onChange={(e) => onManualAuthorChange(e.target.value)}
              placeholder="작가"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              value={manualSource}
              onChange={(e) => onManualSourceChange(e.target.value)}
              placeholder="출처 (예: 국어 교과서)"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={onConfirmManual}
              disabled={!manualTitle.trim()}
              className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              직접 입력 확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
