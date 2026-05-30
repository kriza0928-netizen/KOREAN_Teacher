"use client";

import type { ManualSourceInput } from "@/types";
import { MIN_TEXT_LENGTH } from "@/lib/validation/text";

interface TextEditorProps {
  text: string;
  confidence: number;
  ocrSuccess: boolean;
  manualSource: ManualSourceInput;
  onManualSourceChange: (source: ManualSourceInput) => void;
  onChange: (text: string) => void;
  onAnalyze: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function TextEditor({
  text,
  confidence,
  ocrSuccess,
  manualSource,
  onManualSourceChange,
  onChange,
  onAnalyze,
  onBack,
  isLoading,
}: TextEditorProps) {
  const charCount = text.length;
  const ocrConfidencePercent =
    confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
  const isTextTooShort = charCount < MIN_TEXT_LENGTH;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">추출된 텍스트</h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Tesseract · {ocrSuccess ? "성공" : "실패"} · {ocrConfidencePercent}%
          </span>
        </div>
        <p className="mb-3 text-sm text-muted">
          OCR 결과를 확인·수정한 뒤 분석하세요. (최소 {MIN_TEXT_LENGTH}자)
        </p>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[240px] w-full resize-y rounded-xl border border-border bg-gray-50 p-4 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="추출된 지문 텍스트..."
        />
        <p className={`mt-2 text-right text-xs ${isTextTooShort ? "text-red-600" : "text-muted"}`}>
          {charCount}자 {isTextTooShort && `(최소 ${MIN_TEXT_LENGTH}자 필요)`}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-primary">작품명 후보 직접 입력</h2>
        <p className="mb-3 text-xs text-muted">
          무료 버전은 자동 검색 정확도가 낮습니다. 아는 경우 직접 입력하세요.
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
          disabled={isLoading || !text.trim()}
          className="rounded-xl bg-accent py-3.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
        >
          {isLoading ? "분석 중..." : "분석 시작 →"}
        </button>
      </div>
    </div>
  );
}
