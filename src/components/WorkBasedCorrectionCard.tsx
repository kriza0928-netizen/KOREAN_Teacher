"use client";

import type { CorrectionSuggestion, WorkBasedCorrectionResult } from "@/lib/ocr/work-based-correction";
import type { WorkSearchMatch } from "@/lib/literature/types";

interface WorkBasedCorrectionCardProps {
  correctionResult: WorkBasedCorrectionResult | null;
  appliedIds: Set<string>;
  isLoading: boolean;
  onToggleApply: (id: string) => void;
  onApplyAll: () => void;
  onIgnoreAll: () => void;
}

function ConfidenceBadge({ confidence }: { confidence: CorrectionSuggestion["confidence"] }) {
  const label =
    confidence === "high" ? "신뢰도 높음" : confidence === "medium" ? "신뢰도 보통" : "신뢰도 낮음";
  const cls =
    confidence === "high"
      ? "bg-green-100 text-green-800"
      : confidence === "medium"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";

  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>;
}

function WorkCandidateSummary({ candidates, topWorkMatch }: { candidates: WorkSearchMatch[]; topWorkMatch?: WorkSearchMatch }) {
  if (!topWorkMatch) return null;

  return (
    <p className="text-xs text-primary">
      기준 작품: {topWorkMatch.author} 「{topWorkMatch.title}」 ({topWorkMatch.score}%)
      {candidates.length > 1 && ` · 후보 ${candidates.length}건`}
    </p>
  );
}

export function WorkBasedCorrectionCard({
  correctionResult,
  appliedIds,
  isLoading,
  onToggleApply,
  onApplyAll,
  onIgnoreAll,
}: WorkBasedCorrectionCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-primary">작품 기반 교정 제안</h2>
        <p className="mt-2 text-sm text-muted">작품 후보 검색 및 대표 구절 비교 중...</p>
      </div>
    );
  }

  if (!correctionResult) return null;

  const { suggestions, workCandidates, topWorkMatch, eligible } = correctionResult;
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-primary">작품 기반 교정 제안</h2>
      <p className="mt-2 text-sm text-muted">
        작품 DB 대표 구절과 OCR을 대조한 결과입니다. 자동으로 바꾸지 않으며, [적용] 또는 [무시]를
        선택해 주세요.
      </p>

      {topWorkMatch && eligible && (
        <div className="mt-3">
          <WorkCandidateSummary candidates={workCandidates} topWorkMatch={topWorkMatch} />
        </div>
      )}

      {!eligible && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          작품 후보 신뢰도가 90% 미만이라 교정 후보를 생성하지 않았습니다.
        </div>
      )}

      {eligible && !hasSuggestions && (
        <div className="mt-3 rounded-xl border border-border bg-white p-3 text-sm text-muted">
          대표 구절과 유사한 교정 후보가 없습니다. 원문 그대로 진행할 수 있습니다.
        </div>
      )}

      {hasSuggestions && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-primary">교정 후보 ({suggestions.length}건)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onApplyAll}
                className="rounded-lg border border-primary px-2.5 py-1 text-xs font-medium text-primary"
              >
                전체 적용
              </button>
              <button
                type="button"
                onClick={onIgnoreAll}
                className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-muted"
              >
                전체 무시
              </button>
            </div>
          </div>

          {suggestions.map((suggestion) => {
            const isApplied = appliedIds.has(suggestion.id);
            return (
              <div
                key={suggestion.id}
                className={`rounded-xl border p-4 ${
                  isApplied ? "border-primary bg-white" : "border-border bg-white/80"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <ConfidenceBadge confidence={suggestion.confidence} />
                  <span className="text-[10px] text-muted">{suggestion.reasonLabel}</span>
                </div>
                <p className="text-xs text-muted">대표 구절: {suggestion.matchedPhrase}</p>
                <div className="mt-2 grid gap-2 text-sm">
                  <div>
                    <span className="text-xs text-muted">원문</span>
                    <p className="rounded bg-gray-50 px-2 py-1">{suggestion.originalLine}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">추천</span>
                    <p className="rounded bg-green-50 px-2 py-1 text-green-900">
                      {suggestion.correctedLine}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleApply(suggestion.id)}
                    className={`rounded-lg py-2 text-xs font-medium ${
                      isApplied
                        ? "bg-primary text-white"
                        : "border border-primary text-primary"
                    }`}
                  >
                    {isApplied ? "적용됨 ✓" : "적용"}
                  </button>
                  <button
                    type="button"
                    onClick={() => isApplied && onToggleApply(suggestion.id)}
                    disabled={!isApplied}
                    className="rounded-lg border border-border py-2 text-xs text-muted disabled:opacity-40"
                  >
                    무시
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
