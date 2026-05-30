"use client";

import type { AnalysisResponse } from "@/types";
import { DisclaimerBanner } from "./DisclaimerBanner";
import {
  AnalysisCard,
  BulletList,
  LabelValue,
  NumberedList,
} from "./AnalysisCard";

interface AnalysisResultProps {
  result: AnalysisResponse;
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
    ai_unconfigured: "AI 분석 미설정",
  };

  return (
    <div className="rounded-2xl border border-warning/30 bg-amber-50 p-5">
      <h2 className="text-lg font-bold text-amber-900">
        {titles[result.status] ?? "분석 중단"}
      </h2>
      {result.message && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-amber-900/90">
          {result.message}
        </p>
      )}
      {result.classification && (
        <div className="mt-3 rounded-lg bg-white/80 p-3 text-sm">
          <p className="font-medium text-primary">
            {result.classification.category} · {result.classification.subCategory}
          </p>
          <p className="mt-1 text-muted">{result.classification.reason}</p>
        </div>
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
  onReset,
  onExport,
  isExporting,
}: AnalysisResultProps) {
  const { analysis, classification, disclaimer, extractedText, ragContextUsed, ragSources, status } = result;
  const isComplete = status === "complete" && analysis && classification;

  if (!isComplete) {
    return (
      <div className="animate-fade-in space-y-4">
        <ExtractionStatusBar result={result} />
        {extractedText && (
          <AnalysisCard title="추출된 텍스트" icon="📝" variant="warning">
            <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
              {extractedText}
            </p>
          </AnalysisCard>
        )}
        <StatusMessage result={result} onReset={onReset} />
        <DisclaimerBanner disclaimer={disclaimer} compact />
      </div>
    );
  }

  const isLiterature = analysis.type === "literature";

  return (
    <div className="animate-fade-in space-y-4">
      <ExtractionStatusBar result={result} />

      {extractedText && (
        <AnalysisCard title="추출된 텍스트 (교사 검토)" icon="📝">
          <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {extractedText}
          </p>
        </AnalysisCard>
      )}

      <div
        className={`rounded-2xl p-4 text-white shadow-md ${
          isLiterature
            ? "bg-gradient-to-br from-literature to-purple-700"
            : "bg-gradient-to-br from-non-literature to-teal-700"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-white/80">분류 결과</p>
            <h2 className="text-xl font-bold">
              {isLiterature ? "📖 문학" : "📄 비문학"}
            </h2>
            <p className="mt-1 text-sm text-white/90">
              {classification.category} · {classification.subCategory}
            </p>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
            {classification.confidence}%
          </span>
        </div>
        <p className="mt-2 text-sm text-white/90">{classification.reason}</p>
        {classification.warnings.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-white/85">
            {classification.warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-white/80">{analysis.summary}</p>
      </div>

      <DisclaimerBanner disclaimer={disclaimer} compact />

      <AnalysisCard title="출처 후보" icon="🔍" variant="warning">
        {analysis.sourceCandidates.map((s, i) => (
          <div key={i} className="rounded-lg bg-white/80 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{s.title}</span>
              <span className="text-xs text-muted">
                {Math.round(s.confidence * 100)}%
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {s.author} · {s.source}
            </p>
          </div>
        ))}
      </AnalysisCard>

      {isLiterature ? (
        <>
          <AnalysisCard title="작품 정보" icon="📚" variant="literature">
            <dl className="grid gap-3">
              <LabelValue label="갈래" value={analysis.genre} />
              <LabelValue label="시대/배경" value={analysis.era} />
              <LabelValue label="주제" value={analysis.theme} />
            </dl>
          </AnalysisCard>

          <AnalysisCard title="화자·정서" icon="💭" variant="literature">
            <dl className="grid gap-3">
              <LabelValue label="화자/서술자" value={analysis.narrator} />
              <LabelValue label="정서와 태도" value={analysis.emotionAndAttitude} />
            </dl>
          </AnalysisCard>

          <AnalysisCard title="표현법" icon="✍️" variant="literature">
            <BulletList items={analysis.expressions} />
          </AnalysisCard>
        </>
      ) : (
        <>
          <AnalysisCard title="글의 개요" icon="📋" variant="non-literature">
            <dl className="grid gap-3">
              <LabelValue label="분야" value={analysis.field} />
              <LabelValue label="중심 화제" value={analysis.centralTopic} />
              <LabelValue label="글의 구조" value={analysis.structure} />
            </dl>
          </AnalysisCard>

          <AnalysisCard title="문단별 요지" icon="📝" variant="non-literature">
            <div className="space-y-2">
              {analysis.paragraphSummaries.map((p) => (
                <div key={p.paragraph} className="rounded-lg bg-white/80 p-2.5">
                  <span className="text-xs font-semibold text-non-literature">
                    {p.paragraph}문단
                  </span>
                  <p className="mt-0.5">{p.summary}</p>
                </div>
              ))}
            </div>
          </AnalysisCard>

          <AnalysisCard title="핵심 개념" icon="💡" variant="non-literature">
            <BulletList items={analysis.keyConcepts} />
          </AnalysisCard>

          <AnalysisCard title="주장·근거 관계" icon="🔗" variant="non-literature">
            <div className="space-y-3">
              {analysis.claimEvidence.map((ce, i) => (
                <div key={i} className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs font-semibold text-non-literature">주장</p>
                  <p className="mb-2">{ce.claim}</p>
                  <p className="text-xs font-semibold text-muted">근거</p>
                  <p>{ce.evidence}</p>
                </div>
              ))}
            </div>
          </AnalysisCard>
        </>
      )}

      {analysis.shortQuotes.length > 0 && (
        <AnalysisCard title="짧은 인용 (저작권 보호)" icon="💬" variant="warning">
          {analysis.shortQuotes.map((q, i) => (
            <blockquote
              key={i}
              className="border-l-2 border-accent pl-3 italic text-muted"
            >
              &ldquo;{q}&rdquo;
            </blockquote>
          ))}
        </AnalysisCard>
      )}

      <AnalysisCard title="출제 포인트" icon="🎯">
        <NumberedList items={analysis.examPoints} />
      </AnalysisCard>

      <AnalysisCard title="예상 문제 (5선)" icon="❓">
        <div className="space-y-3">
          {analysis.sampleQuestions.map((q, i) => (
            <div key={i} className="rounded-lg border border-border bg-gray-50 p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="text-xs text-muted">{q.type}</span>
              </div>
              <p>{q.question}</p>
              {q.hint && (
                <p className="mt-1 text-xs text-muted">💡 {q.hint}</p>
              )}
            </div>
          ))}
        </div>
      </AnalysisCard>

      {ragContextUsed && (
        <AnalysisCard title="RAG 참고 출처" icon="🗄️">
          <BulletList items={ragSources} />
        </AnalysisCard>
      )}

      <DisclaimerBanner disclaimer={disclaimer} />

      <div className="space-y-3 pb-4">
        <p className="text-center text-xs text-muted">수업 자료 내보내기</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onExport("pdf")}
            disabled={isExporting}
            className="rounded-xl border-2 border-primary bg-white py-3.5 text-sm font-medium text-primary transition active:scale-[0.98] disabled:opacity-50"
          >
            {isExporting ? "생성 중..." : "📄 PDF 저장"}
          </button>
          <button
            type="button"
            onClick={() => onExport("hwp")}
            disabled={isExporting}
            className="rounded-xl border-2 border-accent bg-white py-3.5 text-sm font-medium text-accent transition active:scale-[0.98] disabled:opacity-50"
          >
            {isExporting ? "생성 중..." : "📝 HWP 구조"}
          </button>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          새 지문 분석하기
        </button>
      </div>
    </div>
  );
}
