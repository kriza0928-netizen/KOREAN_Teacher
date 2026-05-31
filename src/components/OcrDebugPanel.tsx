"use client";

import type { OcrDebugInfo } from "@/lib/ocr/ocr-debug";
import { formatOcrDebugBlock, isOcrDebugEnabled } from "@/lib/ocr/ocr-debug";

interface OcrDebugPanelProps {
  rawText: string;
  displayText: string;
  debug?: OcrDebugInfo;
}

export function OcrDebugPanel({ rawText, displayText, debug }: OcrDebugPanelProps) {
  if (!isOcrDebugEnabled()) return null;

  const variantSummaries = debug?.variantSummaries ?? [];
  const selectedKey = debug?.selectedSourceKey;
  const topCandidates = debug?.topCandidates ?? [];

  return (
    <details className="rounded-xl border border-dashed border-gray-400 bg-gray-50 p-4 text-xs">
      <summary className="cursor-pointer font-semibold text-gray-800">
        OCR 디버그 — 후보·변형별 결과
      </summary>

      <div className="mt-3 space-y-4">
        <div className="rounded-lg bg-white p-3 text-gray-700">
          <p className="font-semibold text-primary">최종 선택</p>
          <p>
            {debug?.poetryMode ? "시 모드 · " : ""}
            {debug?.selectedLang ?? "—"} / {debug?.selectedSource ?? "—"} / PSM{" "}
            {debug?.selectedPsm ?? "—"}
          </p>
          <p className="mt-1">
            종합 {debug?.combinedScore ?? "—"} (가독성 {debug?.readabilityScore ?? "—"} + 작품DB{" "}
            {debug?.workPhraseBonus ?? 0}) · conf {debug?.confidence ?? "—"}%
          </p>
          <p className="mt-1 text-muted">
            한글 {Math.round((debug?.koreanRatio ?? 0) * 100)}% · 특수문자{" "}
            {Math.round((debug?.specialCharRatio ?? 0) * 100)}% · 문장 {debug?.sentenceCount ?? 0}
          </p>
        </div>

        {topCandidates.length > 0 && (
          <div>
            <p className="mb-2 font-medium text-gray-800">OCR 후보 Top 2</p>
            <div className="space-y-2">
              {topCandidates.map((candidate) => (
                <div
                  key={candidate.rank}
                  className={`rounded-lg border p-3 ${
                    candidate.rank === 1
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <p className="font-semibold text-gray-900">
                    후보 {candidate.rank}
                    {candidate.rank === 1 && " ✓ 선택"}
                  </p>
                  <p className="text-[10px] text-muted">
                    {candidate.lang} · {candidate.source} · PSM {candidate.psm} · 종합{" "}
                    {candidate.combinedScore} (가독성 {candidate.readabilityScore} + DB{" "}
                    {candidate.workPhraseBonus})
                  </p>
                  <p className="text-[10px] text-muted">
                    한글 {Math.round(candidate.koreanRatio * 100)}% · 특수문자{" "}
                    {Math.round(candidate.specialCharRatio * 100)}%
                    {candidate.matchedWork && ` · ${candidate.matchedWork}`}
                  </p>
                  <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-gray-800">
                    {candidate.rawText.slice(0, 200)}
                    {candidate.rawText.length > 200 ? "…" : ""}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

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
      </div>
    </details>
  );
}
