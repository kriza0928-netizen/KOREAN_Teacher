"use client";

import { useCallback, useState } from "react";
import type { AnalysisResponse, ManualSourceInput } from "@/types";
import { Header } from "@/components/Header";
import { ImageCapture } from "@/components/ImageCapture";
import { TextEditor } from "@/components/TextEditor";
import { AnalysisResultView } from "@/components/AnalysisResult";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { DEFAULT_DISCLAIMER } from "@/lib/rag";
import { runTesseractOcr } from "@/lib/ocr/tesseract-browser";

type Step = "capture" | "edit" | "result";

const STEP_INDEX: Record<Step, number> = {
  capture: 0,
  edit: 1,
  result: 2,
};

export default function HomePage() {
  const [step, setStep] = useState<Step>("capture");
  const [ocrText, setOcrText] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const [ocrProvider, setOcrProvider] = useState("tesseract.js");
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [manualSource, setManualSource] = useState<ManualSourceInput>({});
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleCapture = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    setLoadingMessage("Tesseract.js로 한글 OCR 중... (1~2분)");

    try {
      const result = await runTesseractOcr(file, (p) => {
        setLoadingMessage(`한글 OCR 진행 중... ${p}%`);
      });

      setOcrText(result.text);
      setOcrConfidence(result.confidence);
      setOcrProvider(result.provider);
      setOcrSuccess(result.success);
      setManualSource({});
      setStep("edit");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR 처리 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
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
            success: ocrSuccess,
            confidence: ocrConfidence,
            provider: ocrProvider,
          },
          manualSource,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "분석 실패");

      setAnalysis(data);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 오류");
    } finally {
      setLoading(false);
    }
  }, [ocrText, ocrConfidence, ocrProvider, ocrSuccess, manualSource]);

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
    setOcrConfidence(0);
    setOcrProvider("tesseract.js");
    setOcrSuccess(false);
    setManualSource({});
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
            confidence={ocrConfidence}
            ocrSuccess={ocrSuccess}
            manualSource={manualSource}
            onManualSourceChange={setManualSource}
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
