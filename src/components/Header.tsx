interface HeaderProps {
  step: number;
  totalSteps: number;
}

const STEP_LABELS = ["촬영", "텍스트", "결과"];

export function Header({ step, totalSteps }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-primary text-white shadow-md">
      <div className="mx-auto max-w-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">국어 지문 분석</h1>
            <p className="text-xs text-white/70">무료 버전 · Tesseract OCR</p>
          </div>
          <div className="flex items-center gap-1.5">
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
        <div className="mt-2 flex gap-2 text-xs">
          {STEP_LABELS.map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-2 py-0.5 ${
                i === step
                  ? "bg-white/20 font-medium"
                  : i < step
                    ? "text-white/60"
                    : "text-white/40"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
