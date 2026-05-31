"use client";

import type { OcrDebugInfo } from "@/lib/ocr/ocr-debug";
import { postProcessOcrText } from "@/lib/ocr/post-process";
import type { WorkBasedCorrectionResult } from "@/lib/ocr/work-based-correction";
import type { OcrTiming } from "@/lib/ocr/ocr-timing";
import { OcrDebugPanel } from "@/components/OcrDebugPanel";
import { OcrTimingBanner } from "@/components/OcrTimingBanner";
import { WorkBasedCorrectionCard } from "@/components/WorkBasedCorrectionCard";
import {
  LOW_OCR_CONFIDENCE_MESSAGE,
  MIN_OCR_CONFIDENCE_PERCENT,
  MIN_TEXT_LENGTH,
} from "@/lib/validation/text";

interface TextEditorProps {
  text: string;
  rawText: string;
  cleanedText?: string;
  ocrDebug?: OcrDebugInfo;
  initialText: string;
  confidence: number;
  ocrSuccess: boolean;
  ocrLowConfidence: boolean;
  correctionResult: WorkBasedCorrectionResult | null;
  correctionLoading: boolean;
  appliedCorrectionIds: Set<string>;
  ocrTiming?: OcrTiming | null;
  workSearchMs?: number | null;
  onChange: (text: string) => void;
  onToggleCorrection: (id: string) => void;
  onApplyAllCorrections: () => void;
  onIgnoreAllCorrections: () => void;
  onProceed: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function TextEditor({
  text,
  rawText,
  cleanedText,
  ocrDebug,
  initialText,
  confidence,
  ocrSuccess,
  ocrLowConfidence,
  correctionResult,
  correctionLoading,
  appliedCorrectionIds,
  ocrTiming,
  workSearchMs,
  onChange,
  onToggleCorrection,
  onApplyAllCorrections,
  onIgnoreAllCorrections,
  onProceed,
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
  const canProceed =
    !isLoading && text.trim().length > 0 && !isTextTooShort && !blockedByLowConfidence;
  const previewCleaned = postProcessOcrText(text);

  return (
    <div className="animate-fade-in space-y-4">
      <OcrTimingBanner
        ocrTiming={ocrTiming}
        workSearchMs={workSearchMs}
        workSearchLoading={correctionLoading}
      />

      <OcrDebugPanel rawText={rawText} displayText={text} debug={ocrDebug} />

      {ocrLowConfidence && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">
            OCR 정확도 {ocrConfidencePercent}% (기준 {MIN_OCR_CONFIDENCE_PERCENT}% 미만)
          </p>
          <p className="mt-2">{LOW_OCR_CONFIDENCE_MESSAGE}</p>
          <p className="mt-2 text-xs text-red-700">
            아래 원문을 직접 수정·붙여넣기하면 다음 단계로 진행할 수 있습니다.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">OCR 원문 (수정 가능)</h2>
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
          원문 보존을 최우선으로 합니다. 한글 단어는 자동 교정하지 않으며, 아래에서 직접
          수정하거나 작품 기반 교정 제안을 적용할 수 있습니다. (최소 {MIN_TEXT_LENGTH}자)
        </p>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[240px] w-full resize-y rounded-xl border border-border bg-gray-50 p-4 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="OCR 원문을 확인하거나 직접 붙여넣으세요..."
        />
        <p className={`mt-2 text-right text-xs ${isTextTooShort ? "text-red-600" : "text-muted"}`}>
          {charCount}자 {isTextTooShort && `(최소 ${MIN_TEXT_LENGTH}자 필요)`}
        </p>
      </div>

      <WorkBasedCorrectionCard
        correctionResult={correctionResult}
        appliedIds={appliedCorrectionIds}
        isLoading={correctionLoading}
        onToggleApply={onToggleCorrection}
        onApplyAll={onApplyAllCorrections}
        onIgnoreAll={onIgnoreAllCorrections}
      />

      <details className="rounded-xl border border-border bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium text-muted">
          정제 OCR 미리보기 (검색 보조용 · 한글 교정 없음)
        </summary>
        <p className="mt-2 text-xs text-muted">
          특수문자·OCR 노이즈만 제거한 버전입니다. 작품 검색 시 원문과 함께 사용됩니다.
        </p>
        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-800">
          {previewCleaned || "(정제 결과 없음)"}
        </pre>
        {cleanedText && cleanedText !== previewCleaned && (
          <p className="mt-2 text-xs text-amber-700">
            편집 내용에 따라 정제 OCR이 갱신됩니다.
          </p>
        )}
      </details>

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
          onClick={onProceed}
          disabled={!canProceed}
          className="rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
        >
          {isLoading ? "처리 중..." : "작품 선택 →"}
        </button>
      </div>
    </div>
  );
}
