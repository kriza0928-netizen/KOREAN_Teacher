"use client";

import type { AnalysisResponse, AnalysisResult, LiteratureAnalysis, NonLiteratureAnalysis } from "@/types";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { AnalysisCard, BulletList } from "./AnalysisCard";
import { SelectedWorkBanner } from "./SelectedWorkBanner";

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

function EditableField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          rows={3}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      )}
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
      <button type="button" onClick={onReset} className="mt-4 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white">
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
  const { analysis, classification, disclaimer, extractedText, status, isDraft, selectedWork } = result;
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
          <strong>자동 분석 초안</strong> — 규칙 기반으로 생성되었습니다. 아래 내용을 교사가 직접 수정·보완하세요.
        </div>
      )}

      {extractedText && (
        <AnalysisCard title="추출된 텍스트" icon="📝">
          <textarea
            value={extractedText}
            onChange={(e) => onResultChange({ ...result, extractedText: e.target.value })}
            className="max-h-48 min-h-[100px] w-full resize-y rounded-lg border border-border bg-gray-50 p-3 text-sm leading-relaxed"
          />
        </AnalysisCard>
      )}

      <div
        className={`rounded-2xl p-4 text-white shadow-md ${
          isLiterature
            ? "bg-gradient-to-br from-literature to-purple-700"
            : "bg-gradient-to-br from-non-literature to-teal-700"
        }`}
      >
        <h2 className="text-xl font-bold">{isLiterature ? "📖 문학" : "📄 비문학"}</h2>
        <p className="mt-1 text-sm">{classification.category} · {classification.subCategory}</p>
        <p className="mt-2 text-sm text-white/90">{classification.reason}</p>
      </div>

      <AnalysisCard title="출처 후보 (수정 가능)" icon="🔍" variant="warning">
        {analysis.sourceCandidates.map((s, i) => (
          <div key={i} className="space-y-2 rounded-lg bg-white/80 p-3">
            <EditableField
              label="작품명"
              value={s.title}
              onChange={(v) => {
                const candidates = [...analysis.sourceCandidates];
                candidates[i] = { ...candidates[i], title: v };
                updateAnalysis({ ...analysis, sourceCandidates: candidates });
              }}
            />
            <EditableField
              label="작가"
              value={s.author}
              onChange={(v) => {
                const candidates = [...analysis.sourceCandidates];
                candidates[i] = { ...candidates[i], author: v };
                updateAnalysis({ ...analysis, sourceCandidates: candidates });
              }}
            />
            <EditableField
              label="출처"
              value={s.source}
              onChange={(v) => {
                const candidates = [...analysis.sourceCandidates];
                candidates[i] = { ...candidates[i], source: v };
                updateAnalysis({ ...analysis, sourceCandidates: candidates });
              }}
            />
          </div>
        ))}
      </AnalysisCard>

      {isLiterature ? (
        <LiteratureDraftEditor
          analysis={analysis}
          onChange={(a) => updateAnalysis(a)}
        />
      ) : (
        <NonLiteratureDraftEditor
          analysis={analysis}
          onChange={(a) => updateAnalysis(a)}
        />
      )}

      <AnalysisCard title="출제 포인트 (수정 가능)" icon="🎯">
        <BulletList
          items={analysis.examPoints}
          editable
          onChange={(items) => updateAnalysis({ ...analysis, examPoints: items })}
        />
      </AnalysisCard>

      <AnalysisCard title="예상 문제 (수정 가능)" icon="❓">
        <div className="space-y-3">
          {analysis.sampleQuestions.map((q, i) => (
            <div key={i} className="rounded-lg border border-border bg-gray-50 p-3">
              <EditableField
                label={`문제 ${i + 1} (${q.type})`}
                value={q.question}
                onChange={(v) => {
                  const qs = [...analysis.sampleQuestions];
                  qs[i] = { ...qs[i], question: v };
                  updateAnalysis({ ...analysis, sampleQuestions: qs });
                }}
                multiline
              />
            </div>
          ))}
        </div>
      </AnalysisCard>

      <EditableField
        label="분석 요약"
        value={analysis.summary}
        onChange={(v) => updateAnalysis({ ...analysis, summary: v })}
        multiline
      />

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
        <button type="button" onClick={onReset} className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white">
          새 지문 분석하기
        </button>
      </div>
    </div>
  );
}

function LiteratureDraftEditor({
  analysis,
  onChange,
}: {
  analysis: LiteratureAnalysis;
  onChange: (a: LiteratureAnalysis) => void;
}) {
  return (
    <>
      <AnalysisCard title="문학 분석 초안" icon="📚" variant="literature">
        <div className="space-y-3">
          <EditableField label="갈래" value={analysis.genre} onChange={(v) => onChange({ ...analysis, genre: v })} />
          <EditableField label="시대/배경" value={analysis.era} onChange={(v) => onChange({ ...analysis, era: v })} />
          <EditableField label="주제" value={analysis.theme} onChange={(v) => onChange({ ...analysis, theme: v })} multiline />
          <EditableField label="화자/서술자" value={analysis.narrator} onChange={(v) => onChange({ ...analysis, narrator: v })} multiline />
          <EditableField label="정서와 태도" value={analysis.emotionAndAttitude} onChange={(v) => onChange({ ...analysis, emotionAndAttitude: v })} multiline />
        </div>
      </AnalysisCard>
      <AnalysisCard title="표현법 (수정 가능)" icon="✍️" variant="literature">
        <BulletList
          items={analysis.expressions}
          editable
          onChange={(items) => onChange({ ...analysis, expressions: items })}
        />
      </AnalysisCard>
    </>
  );
}

function NonLiteratureDraftEditor({
  analysis,
  onChange,
}: {
  analysis: NonLiteratureAnalysis;
  onChange: (a: NonLiteratureAnalysis) => void;
}) {
  return (
    <>
      <AnalysisCard title="비문학 분석 초안" icon="📋" variant="non-literature">
        <div className="space-y-3">
          <EditableField label="분야" value={analysis.field} onChange={(v) => onChange({ ...analysis, field: v })} />
          <EditableField label="중심 화제" value={analysis.centralTopic} onChange={(v) => onChange({ ...analysis, centralTopic: v })} multiline />
          <EditableField label="글의 구조" value={analysis.structure} onChange={(v) => onChange({ ...analysis, structure: v })} multiline />
        </div>
      </AnalysisCard>
      <AnalysisCard title="문단별 요지 (수정 가능)" icon="📝" variant="non-literature">
        <div className="space-y-2">
          {analysis.paragraphSummaries.map((p, i) => (
            <EditableField
              key={p.paragraph}
              label={`${p.paragraph}문단`}
              value={p.summary}
              onChange={(v) => {
                const summaries = [...analysis.paragraphSummaries];
                summaries[i] = { ...summaries[i], summary: v };
                onChange({ ...analysis, paragraphSummaries: summaries });
              }}
              multiline
            />
          ))}
        </div>
      </AnalysisCard>
      <AnalysisCard title="핵심 개념 (수정 가능)" icon="💡" variant="non-literature">
        <BulletList
          items={analysis.keyConcepts}
          editable
          onChange={(items) => onChange({ ...analysis, keyConcepts: items })}
        />
      </AnalysisCard>
    </>
  );
}
