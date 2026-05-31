"use client";

import type { TextClassification } from "@/types";
import type { WorkSearchMatch, WorkSearchResult, WorkSelection } from "@/lib/literature/types";
import { WorkCandidatePicker } from "@/components/WorkCandidatePicker";
import { SelectedWorkBanner } from "@/components/SelectedWorkBanner";

interface WorkSelectStepProps {
  classification: TextClassification | null;
  workSearchResult: WorkSearchResult | null;
  isSearching: boolean;
  selection: WorkSelection | null;
  manualOpen: boolean;
  manualTitle: string;
  manualAuthor: string;
  manualSource: string;
  onSelectCandidate: (match: WorkSearchMatch) => void;
  onSelectManual: () => void;
  onManualTitleChange: (v: string) => void;
  onManualAuthorChange: (v: string) => void;
  onManualSourceChange: (v: string) => void;
  onConfirmManual: () => void;
  onAnalyze: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function WorkSelectStep({
  classification,
  workSearchResult,
  isSearching,
  selection,
  manualOpen,
  manualTitle,
  manualAuthor,
  manualSource,
  onSelectCandidate,
  onSelectManual,
  onManualTitleChange,
  onManualAuthorChange,
  onManualSourceChange,
  onConfirmManual,
  onAnalyze,
  onBack,
  isLoading,
}: WorkSelectStepProps) {
  const canAnalyze = Boolean(selection?.title?.trim()) && !isLoading;

  return (
    <div className="animate-fade-in space-y-4">
      <WorkCandidatePicker
        classification={classification}
        searchResult={
          workSearchResult
            ? {
                matches: workSearchResult.matches,
                notFound: workSearchResult.notFound,
                extractedFeatures: workSearchResult.extractedFeatures,
              }
            : null
        }
        isSearching={isSearching}
        selection={selection}
        onSelectCandidate={onSelectCandidate}
        onSelectManual={onSelectManual}
        manualOpen={manualOpen}
        manualTitle={manualTitle}
        manualAuthor={manualAuthor}
        manualSource={manualSource}
        onManualTitleChange={onManualTitleChange}
        onManualAuthorChange={onManualAuthorChange}
        onManualSourceChange={onManualSourceChange}
        onConfirmManual={onConfirmManual}
      />

      {selection && <SelectedWorkBanner selection={selection} />}

      {!selection && (
        <p className="text-center text-sm text-amber-800">
          작품 후보를 선택하거나 [직접 입력] 후 분석을 시작하세요.
        </p>
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
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className="rounded-xl bg-accent py-3.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {isLoading ? "분석 중..." : "분석 시작 →"}
        </button>
      </div>
    </div>
  );
}
