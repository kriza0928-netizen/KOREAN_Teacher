"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnalysisResponse, TextClassification } from "@/types";
import type { WorkSearchMatch, WorkSearchResult, WorkSelection } from "@/lib/literature/types";
import { enrichWorkSelection } from "@/lib/literature/enrich-work-selection";
import { Header } from "@/components/Header";
import { ImageCapture } from "@/components/ImageCapture";
import { TextEditor } from "@/components/TextEditor";
import { WorkSelectStep } from "@/components/WorkSelectStep";
import { AnalysisResultView } from "@/components/AnalysisResult";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { DEFAULT_DISCLAIMER } from "@/lib/rag";
import { runTesseractOcr, warmOcrWorkers } from "@/lib/ocr/tesseract-browser";
import type { OcrDebugInfo } from "@/lib/ocr/ocr-debug";
import type { OcrTiming } from "@/lib/ocr/ocr-timing";
import { postProcessOcrText } from "@/lib/ocr/post-process";
import {
  applyCorrectionSuggestions,
  type WorkBasedCorrectionResult,
} from "@/lib/ocr/work-based-correction";
import {
  LOW_OCR_CONFIDENCE_MESSAGE,
  MIN_OCR_CONFIDENCE_PERCENT,
} from "@/lib/validation/text";

type Step = "capture" | "edit" | "select" | "result";

const STEP_INDEX: Record<Step, number> = {
  capture: 0,
  edit: 1,
  select: 2,
  result: 3,
};

async function fetchWorkCorrection(text: string): Promise<{
  searchResult: WorkSearchResult;
  correction: WorkBasedCorrectionResult;
}> {
  const res = await fetch("/api/work-correction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      rawText: text,
      cleanedText: postProcessOcrText(text),
    }),
  });

  const data = await res.json();

  if (res.ok) {
    return {
      searchResult: data.searchResult as WorkSearchResult,
      correction: data.correction as WorkBasedCorrectionResult,
    };
  }

  return {
    searchResult: { phrases: [], normalizedText: "", matches: [], notFound: true },
    correction: {
      eligible: false,
      workCandidates: [],
      suggestions: [],
      previewText: text,
    },
  };
}

export default function HomePage() {
  const [step, setStep] = useState<Step>("capture");
  const [ocrText, setOcrText] = useState("");
  const [ocrOriginalText, setOcrOriginalText] = useState("");
  const [ocrCorrectedText, setOcrCorrectedText] = useState<string | undefined>();
  const [ocrRawText, setOcrRawText] = useState("");
  const [ocrCleanedText, setOcrCleanedText] = useState("");
  const [ocrDebug, setOcrDebug] = useState<OcrDebugInfo | undefined>();
  const [initialOcrText, setInitialOcrText] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const [ocrProvider, setOcrProvider] = useState("tesseract.js");
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrLowConfidence, setOcrLowConfidence] = useState(false);
  const [classification, setClassification] = useState<TextClassification | null>(null);
  const [workSearchResult, setWorkSearchResult] = useState<WorkSearchResult | null>(null);
  const [correctionResult, setCorrectionResult] = useState<WorkBasedCorrectionResult | null>(null);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [appliedCorrectionIds, setAppliedCorrectionIds] = useState<Set<string>>(new Set());
  const [workSelection, setWorkSelection] = useState<WorkSelection | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualSource, setManualSource] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [ocrTiming, setOcrTiming] = useState<OcrTiming | null>(null);
  const [workSearchMs, setWorkSearchMs] = useState<number | null>(null);

  useEffect(() => {
    void warmOcrWorkers();
  }, []);

  const loadWorkCorrection = useCallback(async (text: string) => {
    setCorrectionLoading(true);
    setWorkSearchMs(null);
    console.time("[OCR] work-search");
    const startedAt = performance.now();

    try {
      const { searchResult, correction } = await fetchWorkCorrection(text);
      setWorkSearchResult(searchResult);
      setCorrectionResult(correction);
    } catch {
      setWorkSearchResult({ phrases: [], normalizedText: "", matches: [], notFound: true });
      setCorrectionResult({
        eligible: false,
        workCandidates: [],
        suggestions: [],
        previewText: text,
      });
    } finally {
      const ms = Math.round(performance.now() - startedAt);
      console.timeEnd("[OCR] work-search");
      setWorkSearchMs(ms);
      setCorrectionLoading(false);
    }
  }, []);

  const applySuggestionToText = useCallback(
    (text: string, suggestionId: string, shouldApply: boolean) => {
      if (!correctionResult) return text;

      const suggestion = correctionResult.suggestions.find((s) => s.id === suggestionId);
      if (!suggestion) return text;

      const lines = text.split("\n");
      if (suggestion.lineIndex < 0 || suggestion.lineIndex >= lines.length) return text;

      lines[suggestion.lineIndex] = shouldApply
        ? suggestion.correctedLine
        : suggestion.originalLine;

      return lines.join("\n");
    },
    [correctionResult]
  );

  const handleCapture = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      setLoadingMessage("이미지 전처리 및 OCR 준비 중...");

      try {
        const result = await runTesseractOcr(file, {
          onProgress: (progress, message) => {
            setLoadingMessage(message ?? `OCR 진행 중... ${progress}%`);
          },
        });

        const raw = result.rawText ?? result.text;

        setOcrRawText(raw);
        setOcrCleanedText(result.cleanedText ?? postProcessOcrText(raw));
        setOcrDebug(result.debug);
        setOcrTiming(result.timing ?? null);
        setWorkSearchMs(null);
        setOcrText(raw);
        setOcrOriginalText(raw);
        setOcrCorrectedText(undefined);
        setInitialOcrText(raw);
        setOcrConfidence(result.confidence);
        setOcrProvider(result.provider);
        setOcrSuccess(result.success);
        setOcrLowConfidence(
          result.lowConfidence ?? result.confidence < MIN_OCR_CONFIDENCE_PERCENT
        );
        setClassification(null);
        setWorkSearchResult(null);
        setCorrectionResult(null);
        setAppliedCorrectionIds(new Set());
        setWorkSelection(null);
        setManualOpen(false);
        setManualTitle("");
        setManualAuthor("");
        setManualSource("");

        if (result.lowConfidence ?? result.confidence < MIN_OCR_CONFIDENCE_PERCENT) {
          setError(LOW_OCR_CONFIDENCE_MESSAGE);
        }

        setStep("edit");
        setLoading(false);

        await loadWorkCorrection(raw);
      } catch (e) {
        setError(e instanceof Error ? e.message : "OCR 처리 오류");
        setLoading(false);
      }
    },
    [loadWorkCorrection]
  );

  const textManuallyVerified =
    ocrText.trim() !== initialOcrText.trim() && ocrText.trim().length > 0;

  const handleToggleCorrection = useCallback(
    (id: string) => {
      if (!correctionResult) return;

      setAppliedCorrectionIds((prev) => {
        const next = new Set(prev);
        const willApply = !next.has(id);
        if (willApply) next.add(id);
        else next.delete(id);

        setOcrText((current) => applySuggestionToText(current, id, willApply));
        return next;
      });
    },
    [correctionResult, applySuggestionToText]
  );

  const handleApplyAllCorrections = useCallback(() => {
    if (!correctionResult) return;

    const ids = correctionResult.suggestions.map((s) => s.id);
    setAppliedCorrectionIds(new Set(ids));
    setOcrText(applyCorrectionSuggestions(ocrOriginalText, correctionResult.suggestions, new Set(ids)));
  }, [correctionResult, ocrOriginalText]);

  const handleIgnoreAllCorrections = useCallback(() => {
    if (!correctionResult) return;

    setAppliedCorrectionIds(new Set());
    setOcrText(ocrOriginalText);
  }, [correctionResult, ocrOriginalText]);

  const handleProceedToSelect = useCallback(async () => {
    if (ocrLowConfidence && !textManuallyVerified) {
      setError(LOW_OCR_CONFIDENCE_MESSAGE);
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingMessage("작품 분류 및 검색 결과 확인 중...");
    setWorkSelection(null);
    setManualOpen(false);

    const hasAppliedCorrections = appliedCorrectionIds.size > 0;
    setOcrCorrectedText(hasAppliedCorrections ? ocrText : undefined);

    try {
      const [classifyRes, correctionData] = await Promise.all([
        fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: ocrText,
            extractionConfidence: ocrConfidence,
          }),
        }),
        fetchWorkCorrection(ocrText),
      ]);

      const classifyData = await classifyRes.json();

      if (classifyRes.ok && !classifyData.blocked && classifyData.category) {
        setClassification(classifyData as TextClassification);
      }

      setWorkSearchResult(correctionData.searchResult);
      setCorrectionResult(correctionData.correction);
      setStep("select");
    } catch (e) {
      setError(e instanceof Error ? e.message : "작품 검색 오류");
    } finally {
      setLoading(false);
    }
  }, [
    ocrText,
    ocrConfidence,
    ocrLowConfidence,
    textManuallyVerified,
    appliedCorrectionIds.size,
  ]);

  const handleSelectCandidate = useCallback((match: WorkSearchMatch) => {
    setWorkSelection(enrichWorkSelection(match));
    setManualOpen(false);
  }, []);

  const handleSelectManual = useCallback(() => {
    setManualOpen(true);
    setWorkSelection(null);
  }, []);

  const handleConfirmManual = useCallback(() => {
    if (!manualTitle.trim()) return;
    setWorkSelection({
      mode: "manual",
      title: manualTitle.trim(),
      author: manualAuthor.trim() || "미상",
      source: manualSource.trim() || "교사 직접 입력",
    });
  }, [manualTitle, manualAuthor, manualSource]);

  const handleAnalyze = useCallback(async () => {
    if (!workSelection?.title?.trim()) {
      setError("분석 전 작품을 선택하거나 직접 입력해 주세요.");
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingMessage("선택 작품 기준 분석 초안 생성 중...");

    const analysisText = ocrText;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: analysisText,
          originalOcrText: ocrOriginalText,
          correctedOcrText: ocrCorrectedText,
          ocr: {
            success: ocrSuccess || textManuallyVerified,
            confidence: ocrConfidence,
            provider: ocrProvider,
          },
          textManuallyVerified,
          selectedWork: workSelection,
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
    ocrOriginalText,
    ocrCorrectedText,
    ocrConfidence,
    ocrProvider,
    ocrSuccess,
    workSelection,
    textManuallyVerified,
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
    setOcrOriginalText("");
    setOcrCorrectedText(undefined);
    setOcrRawText("");
    setOcrCleanedText("");
    setOcrDebug(undefined);
    setInitialOcrText("");
    setOcrConfidence(0);
    setOcrProvider("tesseract.js");
    setOcrSuccess(false);
    setOcrLowConfidence(false);
    setClassification(null);
    setWorkSearchResult(null);
    setCorrectionResult(null);
    setCorrectionLoading(false);
    setAppliedCorrectionIds(new Set());
    setWorkSelection(null);
    setManualOpen(false);
    setManualTitle("");
    setManualAuthor("");
    setManualSource("");
    setAnalysis(null);
    setError(null);
    setOcrTiming(null);
    setWorkSearchMs(null);
  };

  return (
    <div className="min-h-dvh bg-background">
      <Header step={STEP_INDEX[step]} totalSteps={4} />

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
            cleanedText={ocrCleanedText}
            ocrDebug={ocrDebug}
            initialText={initialOcrText}
            confidence={ocrConfidence}
            ocrSuccess={ocrSuccess}
            ocrLowConfidence={ocrLowConfidence}
            correctionResult={correctionResult}
            correctionLoading={correctionLoading}
            appliedCorrectionIds={appliedCorrectionIds}
            ocrTiming={ocrTiming}
            workSearchMs={workSearchMs}
            onChange={setOcrText}
            onToggleCorrection={handleToggleCorrection}
            onApplyAllCorrections={handleApplyAllCorrections}
            onIgnoreAllCorrections={handleIgnoreAllCorrections}
            onProceed={handleProceedToSelect}
            onBack={handleReset}
            isLoading={loading}
          />
        )}

        {step === "select" && (
          <WorkSelectStep
            classification={classification}
            workSearchResult={workSearchResult}
            isSearching={false}
            selection={workSelection}
            manualOpen={manualOpen}
            manualTitle={manualTitle}
            manualAuthor={manualAuthor}
            manualSource={manualSource}
            onSelectCandidate={handleSelectCandidate}
            onSelectManual={handleSelectManual}
            onManualTitleChange={setManualTitle}
            onManualAuthorChange={setManualAuthor}
            onManualSourceChange={setManualSource}
            onConfirmManual={handleConfirmManual}
            onAnalyze={handleAnalyze}
            onBack={() => setStep("edit")}
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
