"use client";

interface HeaderProps {
  step: number;
  totalSteps: number;
}

const STEP_LABELS = ["촬영", "OCR·교정", "작품 선택", "결과"] as const;

export function Header({ step, totalSteps }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-primary text-white shadow-md">
      <div className="mx-auto max-w-lg px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight">국어 지문 분석</h1>
            <p className="truncate text-xs text-white/70">OCR → 작품 기반 교정 → 분석</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i <= step ? "bg-accent-light" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="-mx-1 mt-2 overflow-x-auto px-1 pb-0.5">
          <div className="flex w-max min-w-full items-center gap-2 text-xs">
            {STEP_LABELS.slice(0, totalSteps).map((label, i) => (
              <span
                key={label}
                className={`shrink-0 rounded-full px-2.5 py-0.5 whitespace-nowrap ${
                  i === step
                    ? "bg-white/20 font-medium"
                    : i < step
                      ? "text-white/60"
                      : "text-white/40"
                }`}
              >
                {i + 1}. {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
