"use client";

import type { WorkBasedCorrectionResult, CorrectionSuggestion } from "@/lib/ocr/work-based-correction";
import type { WorkSearchMatch } from "@/lib/literature/types";

interface WorkBasedCorrectionStepProps {
  ocrOriginalText: string;
  correctionResult: WorkBasedCorrectionResult;
  appliedIds: Set<string>;
  onToggleApply: (id: string) => void;
  onApplyAll: () => void;
  onIgnoreAll: () => void;
  onProceed: () => void;
  onBack: () => void;
  isLoading: boolean;
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

function WorkCandidateList({ candidates }: { candidates: WorkSearchMatch[] }) {
  if (candidates.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-sm font-semibold text-primary">작품 후보 Top {candidates.length}</p>
      <ul className="mt-2 space-y-1.5">
        {candidates.map((match, index) => (
          <li key={match.workId} className="flex items-center justify-between text-sm">
            <span>
              {index + 1}. {match.title} · {match.author}
            </span>
            <span className="text-xs text-muted">{match.score}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WorkBasedCorrectionStep({
  ocrOriginalText,
  correctionResult,
  appliedIds,
  onToggleApply,
  onApplyAll,
  onIgnoreAll,
  onProceed,
  onBack,
  isLoading,
}: WorkBasedCorrectionStepProps) {
  const { suggestions, workCandidates, topWorkMatch, eligible } = correctionResult;
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <h2 className="text-base font-semibold text-primary">작품 기반 교정</h2>
        <p className="mt-2 text-sm text-muted">
          작품 DB 대표 구절과 OCR을 대조하여 교정 후보를 제안합니다. 자동 변경하지 않으며, 반드시
          [적용] 또는 [무시]를 선택해 주세요.
        </p>
        {topWorkMatch && eligible && (
          <p className="mt-2 text-xs text-primary">
            기준 작품: {topWorkMatch.author} 「{topWorkMatch.title}」 ({topWorkMatch.score}%)
          </p>
        )}
      </div>

      <WorkCandidateList candidates={workCandidates} />

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">원문 OCR</p>
        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-relaxed">
          {ocrOriginalText}
        </pre>
      </div>

      {!eligible && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          작품 후보 신뢰도가 90% 미만이라 교정 후보를 생성하지 않았습니다.
        </div>
      )}

      {eligible && !hasSuggestions && (
        <div className="rounded-xl border border-border bg-gray-50 p-4 text-sm text-muted">
          대표 구절과 유사한 교정 후보가 없습니다. 원문 그대로 진행할 수 있습니다.
        </div>
      )}

      {hasSuggestions && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">교정 후보 ({suggestions.length}건)</p>
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
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted"
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
                  isApplied ? "border-primary bg-primary/5" : "border-border bg-white"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <ConfidenceBadge confidence={suggestion.confidence} />
                  <span className="text-[10px] text-muted">
                    {suggestion.workAuthor} 「{suggestion.workTitle}」 · 유사도{" "}
                    {suggestion.similarity}%
                  </span>
                </div>
                <p className="text-xs text-muted">대표 구절: {suggestion.matchedPhrase}</p>
                <div className="mt-2 grid gap-2 text-sm">
                  <div>
                    <span className="text-xs text-muted">원문</span>
                    <p className="rounded bg-gray-50 px-2 py-1">{suggestion.originalLine}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">교정 후보</span>
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

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="rounded-xl border border-border bg-white py-3.5 text-sm font-medium text-muted disabled:opacity-50"
        >
          ← 텍스트 수정
        </button>
        <button
          type="button"
          onClick={onProceed}
          disabled={isLoading}
          className="rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {isLoading ? "처리 중..." : "작품 선택 →"}
        </button>
      </div>
    </div>
  );
}
