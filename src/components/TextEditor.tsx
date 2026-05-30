"use client";

import type { ManualSourceInput } from "@/types";
import type { OcrDebugInfo } from "@/lib/ocr/ocr-debug";
import type { WorkSearchMatch, WorkSearchResult } from "@/lib/literature/types";
import { OcrDebugPanel } from "@/components/OcrDebugPanel";
import { WorkSearchPanel } from "@/components/WorkSearchPanel";
import {
  LOW_OCR_CONFIDENCE_MESSAGE,
  MIN_OCR_CONFIDENCE_PERCENT,
  MIN_TEXT_LENGTH,
} from "@/lib/validation/text";

interface TextEditorProps {
  text: string;
  rawText: string;
  ocrDebug?: OcrDebugInfo;
  initialText: string;
  confidence: number;
  ocrSuccess: boolean;
  ocrLowConfidence: boolean;
  manualSource: ManualSourceInput;
  onManualSourceChange: (source: ManualSourceInput) => void;
  workSearchResult: WorkSearchResult | null;
  isSearchingWork: boolean;
  onSelectWorkMatch: (match: WorkSearchMatch) => void;
  onChange: (text: string) => void;
  onAnalyze: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function TextEditor({
  text,
  rawText,
  ocrDebug,
  initialText,
  confidence,
  ocrSuccess,
  ocrLowConfidence,
  manualSource,
  onManualSourceChange,
  workSearchResult,
  isSearchingWork,
  onSelectWorkMatch,
  onChange,
  onAnalyze,
  onBack,
  isLoading,
}: TextEditorProps) {
  const charCount = text.length;
  const ocrConfidencePercent =
    confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
  const isTextTooShort = charCount < MIN_TEXT_LENGTH;
  const textManuallyVerified =
    text.trim() !== initialText.trim() && text.trim().length > 0;
  const blockedByLowConfidence = ocrLowConfidence && !textManuallyVerified;
  const canAnalyze =
    !isLoading && text.trim().length > 0 && !isTextTooShort && !blockedByLowConfidence;

  return (
    <div className="animate-fade-in space-y-4">
      <OcrDebugPanel rawText={rawText} displayText={text} debug={ocrDebug} />

      {ocrLowConfidence && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">OCR 정확도 {ocrConfidencePercent}% (기준 {MIN_OCR_CONFIDENCE_PERCENT}% 미만)</p>
          <p className="mt-2">{LOW_OCR_CONFIDENCE_MESSAGE}</p>
          <p className="mt-2 text-xs text-red-700">
            아래 텍스트를 직접 수정·붙여넣기하면 분석을 진행할 수 있습니다.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">추출된 텍스트</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              ocrConfidencePercent >= MIN_OCR_CONFIDENCE_PERCENT
                ? "bg-primary/10 text-primary"
                : "bg-red-100 text-red-700"
            }`}
          >
            Tesseract · {ocrSuccess ? "성공" : "낮음"} · {ocrConfidencePercent}%
          </span>
        </div>
        <p className="mb-3 text-sm text-muted">
          OCR 결과를 확인·수정한 뒤 분석하세요. (최소 {MIN_TEXT_LENGTH}자)
        </p>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[240px] w-full resize-y rounded-xl border border-border bg-gray-50 p-4 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="추출된 지문 텍스트를 확인하거나 직접 붙여넣으세요..."
        />
        <p className={`mt-2 text-right text-xs ${isTextTooShort ? "text-red-600" : "text-muted"}`}>
          {charCount}자 {isTextTooShort && `(최소 ${MIN_TEXT_LENGTH}자 필요)`}
        </p>
        {textManuallyVerified && ocrLowConfidence && (
          <p className="mt-2 text-xs text-success">텍스트가 수정되었습니다. 분석을 진행할 수 있습니다.</p>
        )}
      </div>

      <WorkSearchPanel
        searchResult={workSearchResult}
        isSearching={isSearchingWork}
        manualSource={manualSource}
        onSelectMatch={onSelectWorkMatch}
      />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-primary">작품명 직접 입력</h2>
        <p className="mb-3 text-xs text-muted">
          자동 검색 결과를 선택하거나, 아는 경우 직접 입력하세요.
        </p>
        <div className="space-y-2">
          <input
            type="text"
            value={manualSource.title ?? ""}
            onChange={(e) => onManualSourceChange({ ...manualSource, title: e.target.value })}
            placeholder="작품명 (예: 무정)"
            className="w-full rounded-lg border border-border bg-gray-50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            value={manualSource.author ?? ""}
            onChange={(e) => onManualSourceChange({ ...manualSource, author: e.target.value })}
            placeholder="작가 (예: 이광수)"
            className="w-full rounded-lg border border-border bg-gray-50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            value={manualSource.source ?? ""}
            onChange={(e) => onManualSourceChange({ ...manualSource, source: e.target.value })}
            placeholder="출처 (예: 문학 교과서, 수능 기출)"
            className="w-full rounded-lg border border-border bg-gray-50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {isTextTooShort && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          분석할 텍스트가 충분하지 않습니다. OCR 결과를 보완하거나 다시 촬영해 주세요.
        </div>
      )}

      {blockedByLowConfidence && !isTextTooShort && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          OCR 신뢰도가 낮아 자동 분석을 진행할 수 없습니다. 텍스트를 직접 수정·붙여넣기해 주세요.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="rounded-xl border border-border bg-white py-3.5 text-sm font-medium text-muted transition active:scale-[0.98] disabled:opacity-50"
        >
          ← 다시 촬영
        </button>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className="rounded-xl bg-accent py-3.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
        >
          {isLoading ? "분석 중..." : "분석 시작 →"}
        </button>
      </div>
    </div>
  );
}
