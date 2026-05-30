"use client";

import { useCallback, useState } from "react";
import type { AnalysisResponse } from "@/types";
import { Header } from "@/components/Header";
import { ImageCapture } from "@/components/ImageCapture";
import { AnalysisResultView } from "@/components/AnalysisResult";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { DEFAULT_DISCLAIMER } from "@/lib/rag";

type Step = "capture" | "result";

const STEP_INDEX: Record<Step, number> = {
  capture: 0,
  result: 1,
};

export default function HomePage() {
  const [step, setStep] = useState<Step>("capture");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleCapture = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    setLoadingMessage("GPT-4o Vision으로 추출·분류·분석 중... (30~60초)");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "분석 실패");

      setAnalysis(data);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 오류");
    } finally {
      setLoading(false);
    }
  }, []);

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
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="min-h-dvh bg-background">
      <Header step={STEP_INDEX[step]} totalSteps={2} />

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

        {step === "result" && analysis && (
          <AnalysisResultView
            result={analysis}
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
