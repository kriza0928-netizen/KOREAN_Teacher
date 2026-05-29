"use client";

interface TextEditorProps {
  text: string;
  confidence: number;
  onChange: (text: string) => void;
  onAnalyze: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function TextEditor({
  text,
  confidence,
  onChange,
  onAnalyze,
  onBack,
  isLoading,
}: TextEditorProps) {
  const charCount = text.length;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">추출된 텍스트</h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            OCR 신뢰도 {Math.round(confidence * 100)}%
          </span>
        </div>
        <p className="mb-3 text-sm text-muted">
          OCR 결과를 확인하고 오타·누락을 수정한 뒤 분석을 시작하세요.
        </p>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[280px] w-full resize-y rounded-xl border border-border bg-gray-50 p-4 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="추출된 지문 텍스트..."
        />
        <p className="mt-2 text-right text-xs text-muted">{charCount}자</p>
      </div>

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
