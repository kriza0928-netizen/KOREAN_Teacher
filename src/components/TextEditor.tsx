"use client";

import { MIN_TEXT_LENGTH } from "@/lib/ocr/validate";

interface TextEditorProps {
  text: string;
  confidence: number;
  ocrSuccess: boolean;
  onChange: (text: string) => void;
  onAnalyze: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function TextEditor({
  text,
  confidence,
  ocrSuccess,
  onChange,
  onAnalyze,
  onBack,
  isLoading,
}: TextEditorProps) {
  const charCount = text.length;
  const ocrConfidencePercent = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
  const isTextTooShort = charCount < MIN_TEXT_LENGTH;
  const isOcrLowConfidence = ocrConfidencePercent < 80;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">추출된 텍스트</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              ocrSuccess && ocrConfidencePercent >= 80
                ? "bg-primary/10 text-primary"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            OCR {ocrSuccess ? "성공" : "실패"} · {ocrConfidencePercent}%
          </span>
        </div>
        <p className="mb-3 text-sm text-muted">
          OCR 결과를 확인하고 오타·누락을 수정한 뒤 분석을 시작하세요. (최소 {MIN_TEXT_LENGTH}자)
        </p>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[280px] w-full resize-y rounded-xl border border-border bg-gray-50 p-4 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="추출된 지문 텍스트..."
        />
        <p className={`mt-2 text-right text-xs ${isTextTooShort ? "text-red-600" : "text-muted"}`}>
          {charCount}자 {isTextTooShort && `(최소 ${MIN_TEXT_LENGTH}자 필요)`}
        </p>
      </div>

      {(isTextTooShort || isOcrLowConfidence) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {isTextTooShort && (
            <p>분석할 텍스트가 충분하지 않습니다. OCR 인식이 실패했거나 지문이 일부만 촬영되었을 수 있습니다.</p>
          )}
          {isOcrLowConfidence && (
            <p className={isTextTooShort ? "mt-1" : ""}>
              OCR 신뢰도가 80% 미만이면 분류 보류 상태가 됩니다. 선명하게 다시 촬영해 주세요.
            </p>
          )}
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
          {isLoading ? "검증 중..." : "분석 시작 →"}
        </button>
      </div>
    </div>
  );
}
