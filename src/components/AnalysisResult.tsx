"use client";

import type { AnalysisResponse, AnalysisResult } from "@/types";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { SelectedWorkBanner } from "./SelectedWorkBanner";
import { DetailedAnalysisReport } from "./DetailedAnalysisReport";

interface AnalysisResultProps {
  result: AnalysisResponse;
  onResultChange: (result: AnalysisResponse) => void;
  onReset: () => void;
  onExport: (format: "pdf" | "hwp") => void;
  isExporting: boolean;
}

function ExtractionStatusBar({ result }: { result: AnalysisResponse }) {
  const { ocr, classification } = result;
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-white p-3 text-center shadow-sm">
      <div>
        <p className="text-xs text-muted">텍스트 추출</p>
        <p className={`mt-0.5 text-sm font-semibold ${ocr.success ? "text-success" : "text-red-600"}`}>
          {ocr.success ? "성공" : "실패"}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted">추출 신뢰도</p>
        <p className="mt-0.5 text-sm font-semibold text-primary">{ocr.confidence}%</p>
      </div>
      <div>
        <p className="text-xs text-muted">분류 신뢰도</p>
        <p className="mt-0.5 text-sm font-semibold text-primary">
          {classification ? `${classification.confidence}%` : "—"}
        </p>
      </div>
    </div>
  );
}

function StatusMessage({ result, onReset }: { result: AnalysisResponse; onReset: () => void }) {
  const titles: Record<string, string> = {
    ocr_invalid: "텍스트 추출 실패",
    text_insufficient: "텍스트 부족",
    classification_deferred: "분류 보류",
    classification_uncertain: "분류 불확실",
    ai_unconfigured: "분석 미설정",
  };

  return (
    <div className="rounded-2xl border border-warning/30 bg-amber-50 p-5">
      <h2 className="text-lg font-bold text-amber-900">{titles[result.status] ?? "분석 중단"}</h2>
      {result.message && (
        <p className="mt-2 whitespace-pre-line text-sm text-amber-900/90">{result.message}</p>
      )}
      <button
        type="button"
        onClick={onReset}
        className="mt-4 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white"
      >
        다시 촬영하기
      </button>
    </div>
  );
}

export function AnalysisResultView({
  result,
  onResultChange,
  onReset,
  onExport,
  isExporting,
}: AnalysisResultProps) {
  const { analysis, classification, disclaimer, extractedText, originalOcrText, correctedOcrText, status, isDraft, selectedWork } = result;
  const isComplete = status === "complete" && analysis && classification;

  const updateAnalysis = (next: AnalysisResult) => {
    onResultChange({ ...result, analysis: next });
  };

  if (!isComplete) {
    return (
      <div className="animate-fade-in space-y-4">
        <ExtractionStatusBar result={result} />
        <StatusMessage result={result} onReset={onReset} />
        <DisclaimerBanner disclaimer={disclaimer} compact />
      </div>
    );
  }

  const isLiterature = analysis.type === "literature";

  return (
    <div className="animate-fade-in space-y-4">
      <ExtractionStatusBar result={result} />

      {selectedWork && <SelectedWorkBanner selection={selectedWork} />}

      {isDraft && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>교사용 심층 분석 초안</strong> — 선택 작품 DB·교과서 해설·OCR 지문을 종합하여 생성되었습니다.
          아래 내용을 교사가 검토·수정한 뒤 수업·내신에 활용하세요.
        </div>
      )}

      <div
        className={`rounded-2xl p-4 text-white shadow-md ${
          isLiterature
            ? "bg-gradient-to-br from-literature to-purple-700"
            : "bg-gradient-to-br from-non-literature to-teal-700"
        }`}
      >
        <h2 className="text-xl font-bold">{isLiterature ? "📖 문학 심층 분석" : "📄 비문학 심층 분석"}</h2>
        <p className="mt-1 text-sm">
          {classification.category} · {classification.subCategory}
        </p>
        <p className="mt-2 text-sm text-white/90">{classification.reason}</p>
      </div>

      {originalOcrText && (
        <details className="rounded-xl border border-border bg-gray-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-muted">OCR 원문</summary>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-sm leading-relaxed">
            {originalOcrText}
          </pre>
        </details>
      )}

      {correctedOcrText && correctedOcrText !== originalOcrText && (
        <details open className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            작품 기반 교정 OCR
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-sm leading-relaxed">
            {correctedOcrText}
          </pre>
        </details>
      )}

      {extractedText && (
        <details className="rounded-xl border border-border bg-gray-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-muted">
            OCR 추출 지문 (일부 · 저작권 보호)
          </summary>
          <textarea
            value={extractedText}
            onChange={(e) => onResultChange({ ...result, extractedText: e.target.value })}
            className="mt-2 max-h-40 min-h-[80px] w-full resize-y rounded-lg border border-border bg-white p-3 text-sm leading-relaxed"
          />
        </details>
      )}

      <DetailedAnalysisReport report={analysis} onChange={updateAnalysis} />

      <DisclaimerBanner disclaimer={disclaimer} />

      <div className="space-y-3 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onExport("pdf")}
            disabled={isExporting}
            className="rounded-xl border-2 border-primary bg-white py-3.5 text-sm font-medium text-primary disabled:opacity-50"
          >
            {isExporting ? "생성 중..." : "📄 PDF 저장"}
          </button>
          <button
            type="button"
            onClick={() => onExport("hwp")}
            disabled={isExporting}
            className="rounded-xl border-2 border-accent bg-white py-3.5 text-sm font-medium text-accent disabled:opacity-50"
          >
            {isExporting ? "생성 중..." : "📝 HWP 구조"}
          </button>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white"
        >
          새 지문 분석하기
        </button>
      </div>
    </div>
  );
}
