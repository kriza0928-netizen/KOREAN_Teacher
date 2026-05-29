import type { AnalysisResponse } from "@/types";

export interface ExportDocument {
  title: string;
  generatedAt: string;
  textType: string;
  sections: ExportSection[];
  disclaimer: string[];
  metadata: {
    format: "pdf" | "hwp";
    version: string;
  };
}

export interface ExportSection {
  heading: string;
  items: { label: string; value: string }[];
}

export function buildExportDocument(
  analysis: AnalysisResponse,
  format: "pdf" | "hwp"
): ExportDocument {
  const { analysis: data, classification, disclaimer } = analysis;
  const sections: ExportSection[] = [];

  sections.push({
    heading: "지문 분류",
    items: [
      { label: "대분류", value: classification.category },
      { label: "세부 분류", value: classification.subCategory },
      { label: "신뢰도", value: `${classification.confidence}%` },
      { label: "분류 근거", value: classification.reason },
      ...(classification.isUncertain
        ? [{ label: "상태", value: "분류 불확실 — 교사 검토 필요" }]
        : []),
      ...classification.warnings.map((w, i) => ({
        label: `주의 ${i + 1}`,
        value: w,
      })),
    ],
  });

  sections.push({
    heading: "출처 후보",
    items: data.sourceCandidates.map((s, i) => ({
      label: `후보 ${i + 1}`,
      value: `${s.title} / ${s.author} (${s.source}) — 신뢰도 ${Math.round(s.confidence * 100)}%`,
    })),
  });

  if (data.type === "literature") {
    sections.push(
      {
        heading: "작품 정보",
        items: [
          { label: "갈래", value: data.genre },
          { label: "시대/배경", value: data.era },
          { label: "주제", value: data.theme },
        ],
      },
      {
        heading: "화자·정서",
        items: [
          { label: "화자/서술자", value: data.narrator },
          { label: "정서와 태도", value: data.emotionAndAttitude },
        ],
      },
      {
        heading: "표현법",
        items: data.expressions.map((e, i) => ({
          label: `${i + 1}`,
          value: e,
        })),
      }
    );
  } else {
    sections.push(
      {
        heading: "글의 개요",
        items: [
          { label: "분야", value: data.field },
          { label: "중심 화제", value: data.centralTopic },
          { label: "글의 구조", value: data.structure },
        ],
      },
      {
        heading: "문단별 요지",
        items: data.paragraphSummaries.map((p) => ({
          label: `${p.paragraph}문단`,
          value: p.summary,
        })),
      },
      {
        heading: "핵심 개념",
        items: data.keyConcepts.map((c, i) => ({
          label: `${i + 1}`,
          value: c,
        })),
      },
      {
        heading: "주장·근거",
        items: data.claimEvidence.map((ce, i) => ({
          label: `관계 ${i + 1}`,
          value: `주장: ${ce.claim} / 근거: ${ce.evidence}`,
        })),
      }
    );
  }

  sections.push({
    heading: "출제 포인트",
    items: data.examPoints.map((p, i) => ({
      label: `${i + 1}`,
      value: p,
    })),
  });

  sections.push({
    heading: "예상 문제",
    items: data.sampleQuestions.map((q, i) => ({
      label: `문제 ${i + 1} (${q.type})`,
      value: q.hint ? `${q.question}\n[힌트] ${q.hint}` : q.question,
    })),
  });

  if (data.shortQuotes.length > 0) {
    sections.push({
      heading: "짧은 인용 (저작권 보호)",
      items: data.shortQuotes.map((q, i) => ({
        label: `인용 ${i + 1}`,
        value: `"${q}"`,
      })),
    });
  }

  return {
    title: "국어 수업 분석 자료",
    generatedAt: new Date().toLocaleString("ko-KR"),
    textType: `${classification.category} (${classification.subCategory})`,
    sections,
    disclaimer: [
      disclaimer.sourceAccuracy,
      disclaimer.copyrightNotice,
      disclaimer.teacherReviewRequired,
    ],
    metadata: {
      format,
      version: "1.0-mvp",
    },
  };
}

/** HWP 연동용 JSON 구조 — 추후 한글 SDK/변환기와 연결 */
export function toHwpPayload(doc: ExportDocument): string {
  return JSON.stringify(
    {
      ...doc,
      hwpTemplate: {
        paperSize: "A4",
        margins: { top: 20, bottom: 20, left: 25, right: 25 },
        fontFamily: "맑은 고딕",
        titleStyle: { size: 16, bold: true },
        headingStyle: { size: 13, bold: true },
        bodyStyle: { size: 11 },
      },
    },
    null,
    2
  );
}

export async function generatePdfBlob(doc: ExportDocument): Promise<Blob> {
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const addText = (text: string, fontSize: number, bold = false) => {
    pdf.setFontSize(fontSize);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    const lines = pdf.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, margin, y);
      y += fontSize * 0.45;
    }
    y += 2;
  };

  addText(doc.title, 18, true);
  addText(`${doc.textType} | 생성: ${doc.generatedAt}`, 10);
  y += 4;

  for (const section of doc.sections) {
    addText(section.heading, 13, true);
    for (const item of section.items) {
      addText(`${item.label}: ${item.value}`, 10);
    }
    y += 3;
  }

  addText("주의사항", 13, true);
  for (const d of doc.disclaimer) {
    addText(`• ${d}`, 9);
  }

  return pdf.output("blob");
}
