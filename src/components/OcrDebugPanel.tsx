"use client";

import type { OcrDebugInfo } from "@/lib/ocr/ocr-debug";
import { formatOcrDebugBlock } from "@/lib/ocr/ocr-debug";

interface OcrDebugPanelProps {
  rawText: string;
  displayText: string;
  debug?: OcrDebugInfo;
}

export function OcrDebugPanel({ rawText, displayText, debug }: OcrDebugPanelProps) {
  const mismatch = rawText !== displayText;

  return (
    <details open className="rounded-xl border border-dashed border-gray-400 bg-gray-50 p-4 text-xs">
      <summary className="cursor-pointer font-semibold text-gray-800">
        OCR 디버그 (원본 그대로)
      </summary>

      <div className="mt-3 space-y-3">
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 font-mono text-[11px] leading-relaxed text-gray-900">
          {formatOcrDebugBlock(rawText)}
        </pre>

        <div className="grid grid-cols-2 gap-2 text-gray-700">
          <p>rawText 길이: {rawText.length}</p>
          <p>displayText 길이: {displayText.length}</p>
          <p>confidence: {debug?.confidence ?? "—"}%</p>
          <p>선택: {debug?.selectedSource ?? "—"} / PSM {debug?.selectedPsm ?? "—"}</p>
        </div>

        {mismatch && (
          <p className="text-amber-800">
            rawText와 displayText가 다릅니다 (trim만 적용됨).
          </p>
        )}

        {debug?.trace && (
          <ul className="space-y-1 text-gray-600">
            {debug.trace.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        )}

        {debug?.attempts && debug.attempts.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-gray-800">PSM 시도 기록 (상위 5건)</p>
            <div className="max-h-32 overflow-auto rounded-lg bg-white p-2">
              {[...debug.attempts]
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map((a, i) => (
                  <p key={i} className="font-mono text-[10px] text-gray-700">
                    [{a.source} PSM{a.psm}] score={a.score.toFixed(1)} conf=
                    {Math.round(a.confidence)}% len={a.textLength} text=
                    {JSON.stringify(a.rawText.slice(0, 40))}
                    {a.rawText.length > 40 ? "…" : ""}
                  </p>
                ))}
            </div>
          </div>
        )}

        <p className="text-gray-500">
          브라우저 콘솔(F12)에서 <code>[OCR]</code> 로그로 Tesseract 원본 result / result.data.text를
          확인할 수 있습니다.
        </p>
      </div>
    </details>
  );
}
