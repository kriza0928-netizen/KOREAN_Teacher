"use client";

import type { OcrTiming } from "@/lib/ocr/ocr-timing";
import { formatStageSeconds } from "@/lib/ocr/ocr-timing";

interface OcrTimingBannerProps {
  ocrTiming?: OcrTiming | null;
  workSearchMs?: number | null;
  workSearchLoading?: boolean;
}

export function OcrTimingBanner({
  ocrTiming,
  workSearchMs,
  workSearchLoading,
}: OcrTimingBannerProps) {
  if (!ocrTiming && workSearchMs == null && !workSearchLoading) return null;

  const totalMs =
    (ocrTiming?.totalMs ?? 0) + (workSearchMs ?? 0) + (workSearchLoading ? 0 : 0);

  return (
    <div className="rounded-xl border border-border bg-white p-4 text-sm">
      <p className="font-semibold text-primary">처리 시간</p>
      <ul className="mt-2 space-y-1 text-muted">
        {ocrTiming && (
          <>
            <li>이미지 로드 {formatStageSeconds(ocrTiming.imageLoadMs)}</li>
            <li>
              OCR {formatStageSeconds(ocrTiming.ocrMs)} ({ocrTiming.attempts}회 시도)
            </li>
          </>
        )}
        {workSearchLoading && <li>작품 검색 진행 중...</li>}
        {!workSearchLoading && workSearchMs != null && (
          <li>작품 검색 {formatStageSeconds(workSearchMs)}</li>
        )}
        {ocrTiming && workSearchMs != null && !workSearchLoading && (
          <li className="pt-1 font-medium text-primary">
            전체 {formatStageSeconds(totalMs)}
          </li>
        )}
      </ul>
    </div>
  );
}
