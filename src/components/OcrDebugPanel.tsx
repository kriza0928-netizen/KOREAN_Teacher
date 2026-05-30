"use client";

import type { OcrDebugInfo } from "@/lib/ocr/ocr-debug";
import { formatOcrDebugBlock } from "@/lib/ocr/ocr-debug";

interface OcrDebugPanelProps {
  rawText: string;
  displayText: string;
  debug?: OcrDebugInfo;
}

export function OcrDebugPanel({ rawText, displayText, debug }: OcrDebugPanelProps) {
  const variantSummaries = debug?.variantSummaries ?? [];
  const selectedKey = debug?.selectedSourceKey;

  return (
    <details open className="rounded-xl border border-dashed border-gray-400 bg-gray-50 p-4 text-xs">
      <summary className="cursor-pointer font-semibold text-gray-800">
        OCR 디버그 — 변형별 결과
      </summary>

      <div className="mt-3 space-y-4">
        <div className="rounded-lg bg-white p-3 text-gray-700">
          <p className="font-semibold text-primary">최종 선택</p>
          <p>
            {debug?.selectedSource ?? "—"} / PSM {debug?.selectedPsm ?? "—"} · 가독성{" "}
            {debug?.readabilityScore ?? "—"} · confidence {debug?.confidence ?? "—"}%
          </p>
          <p className="mt-1 text-muted">
            한글 {Math.round((debug?.koreanRatio ?? 0) * 100)}% · 문장 {debug?.sentenceCount ?? 0} ·
            평균 단어 {debug?.avgWordLength ?? 0}자
          </p>
        </div>

        {variantSummaries.map((variant) => {
          const isSelected = variant.sourceKey === selectedKey;
          return (
            <div
              key={variant.sourceKey}
              className={`rounded-lg border p-3 ${
                isSelected ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-gray-900">
                  {variant.label} OCR {isSelected && "✓ 선택됨"}
                </p>
                <span className="text-[10px] text-muted">
                  PSM {variant.bestPsm} · 가독성 {variant.readabilityScore}
                </span>
              </div>
              <pre className="max-h-36 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-800">
                {formatOcrDebugBlock(`${variant.label} OCR`, variant.bestText)}
              </pre>
              <p className="mt-2 text-[10px] text-muted">
                conf {variant.confidence}% · 한글 {Math.round(variant.koreanRatio * 100)}% · 문장{" "}
                {variant.sentenceCount} · 평균단어 {variant.avgWordLength}자
              </p>
            </div>
          );
        })}

        <div>
          <p className="mb-1 font-medium text-gray-800">최종 출력 텍스트</p>
          <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 font-mono text-[11px] leading-relaxed text-gray-900">
            {formatOcrDebugBlock("최종 선택", displayText || rawText)}
          </pre>
        </div>

        {debug?.trace && (
          <ul className="space-y-1 text-gray-600">
            {debug.trace.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        )}

        {debug?.attempts && debug.attempts.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-gray-800">전체 시도 (가독성 상위 5)</p>
            <div className="max-h-32 overflow-auto rounded-lg bg-white p-2">
              {[...debug.attempts]
                .sort(
                  (a, b) =>
                    b.readabilityScore - a.readabilityScore ||
                    b.koreanRatio - a.koreanRatio
                )
                .slice(0, 5)
                .map((a, i) => (
                  <p key={i} className="font-mono text-[10px] text-gray-700">
                    [{a.source} PSM{a.psm}] 가독성={a.readabilityScore} conf={a.confidence}% 한글=
                    {Math.round(a.koreanRatio * 100)}% len={a.textLength}
                  </p>
                ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
