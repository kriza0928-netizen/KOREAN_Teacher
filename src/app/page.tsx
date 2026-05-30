"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnalysisResponse, ManualSourceInput } from "@/types";
import type { WorkSearchMatch, WorkSearchResult } from "@/lib/literature/types";
import { Header } from "@/components/Header";
import { ImageCapture } from "@/components/ImageCapture";
import { TextEditor } from "@/components/TextEditor";
import { AnalysisResultView } from "@/components/AnalysisResult";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { DEFAULT_DISCLAIMER } from "@/lib/rag";
import { runTesseractOcr } from "@/lib/ocr/tesseract-browser";
import type { OcrDebugInfo } from "@/lib/ocr/ocr-debug";
import {
  LOW_OCR_CONFIDENCE_MESSAGE,
  MIN_OCR_CONFIDENCE_PERCENT,
} from "@/lib/validation/text";

type Step = "capture" | "edit" | "result";

const STEP_INDEX: Record<Step, number> = {
  capture: 0,
  edit: 1,
  result: 2,
};

export default function HomePage() {
  const [step, setStep] = useState<Step>("capture");
  const [ocrText, setOcrText] = useState("");
  const [ocrRawText, setOcrRawText] = useState("");
  const [ocrDebug, setOcrDebug] = useState<OcrDebugInfo | undefined>();
  const [initialOcrText, setInitialOcrText] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const [ocrProvider, setOcrProvider] = useState("tesseract.js");
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrLowConfidence, setOcrLowConfidence] = useState(false);
  const [manualSource, setManualSource] = useState<ManualSourceInput>({});
  const [manualSourceTouched, setManualSourceTouched] = useState(false);
  const [workSearchResult, setWorkSearchResult] = useState<WorkSearchResult | null>(null);
  const [isSearchingWork, setIsSearchingWork] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const applyAutoMatch = useCallback((autoMatch: WorkSearchMatch) => {
    setManualSource({
      title: autoMatch.title,
      author: autoMatch.author,
      source: autoMatch.source ?? "작품 DB 검색",
      searchConfidence: autoMatch.confidence,
    });
  }, []);

  const searchWorks = useCallback(
    async (text: string, allowAutoFill: boolean) => {
      if (text.trim().length < 20) {
        setWorkSearchResult(null);
        return;
      }

      setIsSearchingWork(true);
      try {
        const res = await fetch("/api/search-works", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = (await res.json()) as WorkSearchResult & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "작품 검색 실패");

        setWorkSearchResult(data);

        if (allowAutoFill && data.autoMatch) {
          applyAutoMatch(data.autoMatch);
        }
      } catch {
        setWorkSearchResult({ phrases: [], matches: [], notFound: true });
      } finally {
        setIsSearchingWork(false);
      }
    },
    [applyAutoMatch]
  );

  useEffect(() => {
    if (step !== "edit") return;
    const timer = setTimeout(() => {
      searchWorks(ocrText, !manualSourceTouched);
    }, 500);
    return () => clearTimeout(timer);
  }, [ocrText, step, searchWorks, manualSourceTouched]);

  const handleCapture = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    setLoadingMessage("이미지 전처리 및 OCR 준비 중...");

    try {
      const result = await runTesseractOcr(file, {
        onProgress: (progress, message) => {
          setLoadingMessage(message ?? `OCR 진행 중... ${progress}%`);
        },
      });

      setOcrRawText(result.rawText ?? result.text);
      setOcrDebug(result.debug);
      setOcrText(result.text);
      setInitialOcrText(result.text);
      setOcrConfidence(result.confidence);
      setOcrProvider(result.provider);
      setOcrSuccess(result.success);
      setOcrLowConfidence(
        result.lowConfidence ?? result.confidence < MIN_OCR_CONFIDENCE_PERCENT
      );
      setManualSource({});
      setManualSourceTouched(false);
      setWorkSearchResult(null);

      if (result.lowConfidence ?? result.confidence < MIN_OCR_CONFIDENCE_PERCENT) {
        setError(LOW_OCR_CONFIDENCE_MESSAGE);
      }

      setStep("edit");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR 처리 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  const textManuallyVerified =
    ocrText.trim() !== initialOcrText.trim() && ocrText.trim().length > 0;

  const handleManualSourceChange = useCallback((source: ManualSourceInput) => {
    setManualSourceTouched(true);
    setManualSource(source);
  }, []);

  const handleSelectWorkMatch = useCallback((match: WorkSearchMatch) => {
    setManualSourceTouched(true);
    setManualSource({
      title: match.title,
      author: match.author,
      source: match.source ?? "작품 DB 검색",
      searchConfidence: match.confidence,
    });
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (ocrLowConfidence && !textManuallyVerified) {
      setError(LOW_OCR_CONFIDENCE_MESSAGE);
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingMessage("규칙 기반 자동 분석 초안 생성 중...");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ocrText,
          ocr: {
            success: ocrSuccess || textManuallyVerified,
            confidence: ocrConfidence,
            provider: ocrProvider,
          },
          manualSource,
          textManuallyVerified,
          workSearchMatches: workSearchResult?.matches ?? [],
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "분석 실패");

      if (data.status !== "complete") {
        setError(data.message ?? "분석을 진행할 수 없습니다.");
        setAnalysis(data);
        setStep("result");
        return;
      }

      setAnalysis(data);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 오류");
    } finally {
      setLoading(false);
    }
  }, [
    ocrText,
    ocrConfidence,
    ocrProvider,
    ocrSuccess,
    manualSource,
    ocrLowConfidence,
    textManuallyVerified,
    workSearchResult,
  ]);

  const handleExport = useCallback(
    async (format: "pdf" | "hwp") => {
      if (!analysis || analysis.status !== "complete") return;
      setIsExporting(true);
      setError(null);

      try {
        const res = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysis, format }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "내보내기 실패");
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = format === "pdf" ? "gukoe-analysis.pdf" : "gukoe-analysis-hwp.json";
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "내보내기 오류");
      } finally {
        setIsExporting(false);
      }
    },
    [analysis]
  );

  const handleReset = () => {
    setStep("capture");
    setOcrText("");
    setOcrRawText("");
    setOcrDebug(undefined);
    setInitialOcrText("");
    setOcrConfidence(0);
    setOcrProvider("tesseract.js");
    setOcrSuccess(false);
    setOcrLowConfidence(false);
    setManualSource({});
    setManualSourceTouched(false);
    setWorkSearchResult(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="min-h-dvh bg-background">
      <Header step={STEP_INDEX[step]} totalSteps={3} />

      <main className="mx-auto max-w-lg px-4 py-4 safe-bottom">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === "capture" && (
          <>
            <ImageCapture onCapture={handleCapture} isLoading={loading} />
            <div className="mt-4">
              <DisclaimerBanner disclaimer={DEFAULT_DISCLAIMER} compact />
            </div>
          </>
        )}

        {step === "edit" && (
          <TextEditor
            text={ocrText}
            rawText={ocrRawText}
            ocrDebug={ocrDebug}
            initialText={initialOcrText}
            confidence={ocrConfidence}
            ocrSuccess={ocrSuccess}
            ocrLowConfidence={ocrLowConfidence}
            manualSource={manualSource}
            onManualSourceChange={handleManualSourceChange}
            workSearchResult={workSearchResult}
            isSearchingWork={isSearchingWork}
            onSelectWorkMatch={handleSelectWorkMatch}
            onChange={setOcrText}
            onAnalyze={handleAnalyze}
            onBack={handleReset}
            isLoading={loading}
          />
        )}

        {step === "result" && analysis && (
          <AnalysisResultView
            result={analysis}
            onResultChange={setAnalysis}
            onReset={handleReset}
            onExport={handleExport}
            isExporting={isExporting}
          />
        )}
      </main>

      {loading && <LoadingOverlay message={loadingMessage} />}
    </div>
  );
}
