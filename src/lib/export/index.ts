import type { AnalysisResponse } from "@/types";
import type { TeacherAnalysisReport } from "@/types/analysis-report";

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

function pushSection(sections: ExportSection[], heading: string, items: { label: string; value: string }[]) {
  if (items.length > 0) sections.push({ heading, items });
}

function reportToSections(report: TeacherAnalysisReport): ExportSection[] {
  const sections: ExportSection[] = [];

  pushSection(sections, "1. 작품 기본 정보", [
    { label: "작품명", value: report.basicInfo.title },
    { label: "작가", value: report.basicInfo.author },
    { label: "갈래", value: report.basicInfo.genre },
    { label: "시대", value: report.basicInfo.era },
    { label: "수록 가능 영역", value: report.basicInfo.curriculumArea },
    { label: "핵심 주제", value: report.basicInfo.themeSummary },
    { label: "수업 난이도", value: report.basicInfo.difficulty },
  ]);

  pushSection(sections, "2. 지문 요약", [
    { label: "전체 요약", value: report.passageSummary.overallSummary },
    { label: "장면/상황", value: report.passageSummary.sceneDescription },
    { label: "앞뒤 맥락", value: report.passageSummary.contextBeforeAfter },
    ...report.passageSummary.importantParts.map((p, i) => ({
      label: `중요 부분 ${i + 1}`,
      value: p,
    })),
  ]);

  if (report.literatureAnalysis) {
    const l = report.literatureAnalysis;
    pushSection(sections, "3. 문학 작품 분석", [
      { label: "화자/서술자", value: l.speaker },
      { label: "중심 대상", value: l.centralSubject },
      { label: "상황", value: l.situation },
      { label: "정서와 태도", value: l.emotionAndAttitude },
      { label: "주제 의식", value: l.themeConsciousness },
      { label: "갈등 구조", value: l.conflictStructure },
      { label: "인물 관계", value: l.characterRelations },
      { label: "표현상 특징", value: l.expressionFeatures },
      { label: "상징적 소재", value: l.symbolicMaterials },
      { label: "핵심 어휘", value: l.keyVocabulary },
      { label: "반복 표현", value: l.repetitionEffect },
      { label: "분위기·어조", value: l.moodAndTone },
      { label: "지문 위치", value: l.positionInWork },
      ...l.studentConfusionPoints.map((p, i) => ({ label: `헷갈림 ${i + 1}`, value: p })),
      ...l.examFocusPoints.map((p, i) => ({ label: `시험 포인트 ${i + 1}`, value: p })),
    ]);
  }

  if (report.modernPoetryAnalysis) {
    const p = report.modernPoetryAnalysis;
    pushSection(sections, "4. 현대시 분석", [
      { label: "화자의 처지", value: p.speakerSituation },
      { label: "대상에 대한 태도", value: p.attitudeToSubject },
      { label: "시적 상황", value: p.poeticSituation },
      { label: "정서 변화", value: p.emotionalChange },
      { label: "시상 전개", value: p.imageryDevelopment },
      { label: "심상", value: p.imagery },
      { label: "비유·상징", value: p.metaphorAndSymbol },
      { label: "반복·대구", value: p.repetitionAndParallelism },
      { label: "표현법", value: p.rhetoricalDevices },
      { label: "주제", value: p.theme },
      ...p.stanzaSummaries.map((s, i) => ({ label: `${i + 1}연`, value: s })),
    ]);
  }

  if (report.modernNovelAnalysis) {
    const n = report.modernNovelAnalysis;
    pushSection(sections, "5. 현대소설 분석", [
      { label: "인물", value: n.characters },
      { label: "사건", value: n.events },
      { label: "배경", value: n.setting },
      { label: "갈등", value: n.conflict },
      { label: "시점", value: n.pointOfView },
      { label: "서술상 특징", value: n.narrativeFeatures },
      { label: "인물 심리", value: n.characterPsychology },
      { label: "대화·행동", value: n.dialogueAndAction },
      { label: "복선", value: n.foreshadowing },
      { label: "장면 기능", value: n.sceneFunction },
      { label: "결말·주제", value: n.endingAndTheme },
    ]);
  }

  if (report.nonLiteratureAnalysis) {
    const n = report.nonLiteratureAnalysis;
    pushSection(sections, "6. 비문학 분석", [
      { label: "중심 화제", value: n.centralTopic },
      { label: "글의 목적", value: n.purpose },
      { label: "글의 구조", value: n.structure },
      { label: "비교·대조", value: n.comparisonContrast },
      { label: "원인·결과", value: n.causeEffect },
      { label: "문제·해결", value: n.problemSolution },
      ...n.paragraphSummaries.map((p) => ({
        label: `${p.paragraph}문단`,
        value: p.summary,
      })),
      ...n.keyConcepts.map((c, i) => ({ label: `개념 ${i + 1}`, value: c })),
      ...n.claimsAndEvidence.map((ce, i) => ({
        label: `주장·근거 ${i + 1}`,
        value: `${ce.claim} / ${ce.evidence}`,
      })),
    ]);
  }

  const lm = report.lessonMaterials;
  pushSection(sections, "7. 수업 활용 자료", [
    ...lm.introQuestions.map((q, i) => ({ label: `도입 ${i + 1}`, value: q })),
    { label: "배경지식", value: lm.backgroundKnowledge },
    ...lm.studentGuidingQuestions.map((q, i) => ({ label: `유도 질문 ${i + 1}`, value: q })),
    ...lm.discussionQuestions.map((q, i) => ({ label: `토론 ${i + 1}`, value: q })),
    ...lm.boardSummary.map((b, i) => ({ label: `판서 ${i + 1}`, value: b })),
    ...lm.performanceAssessmentIdeas.map((p, i) => ({ label: `수행평가 ${i + 1}`, value: p })),
  ]);

  pushSection(
    sections,
    "8. 시험 대비 — 객관식",
    report.examMaterials.multipleChoice.flatMap((q) => [
      { label: `문제 ${q.number}`, value: q.question },
      ...q.choices.map((c, i) => ({ label: `선지 ${i + 1}`, value: c })),
      { label: "정답", value: `${q.answer}번` },
      { label: "해설", value: q.explanation },
      { label: "출제 의도", value: q.intent },
    ])
  );

  pushSection(
    sections,
    "8. 시험 대비 — 서술형",
    report.examMaterials.shortAnswer.flatMap((q) => [
      { label: `문제 ${q.number}`, value: q.question },
      { label: "모범 답안", value: q.modelAnswer },
      { label: "채점 기준", value: q.gradingCriteria },
      { label: "출제 의도", value: q.intent },
    ])
  );

  const tc = report.teacherComments;
  pushSection(sections, "9. 교사용 코멘트", [
    ...tc.emphasisPoints.map((p, i) => ({ label: `강조 ${i + 1}`, value: p })),
    ...tc.commonMisunderstandings.map((p, i) => ({ label: `오해 ${i + 1}`, value: p })),
    ...tc.internalExamTips.map((p, i) => ({ label: `내신 ${i + 1}`, value: p })),
    ...tc.csatExtensionPoints.map((p, i) => ({ label: `수능 ${i + 1}`, value: p })),
  ]);

  pushSection(sections, "10. 저작권 주의", [
    { label: "원문 미제공", value: report.copyrightNotice.noFullText },
    { label: "OCR 일부", value: report.copyrightNotice.partialOcrOnly },
    { label: "최소 인용", value: report.copyrightNotice.minimalQuotation },
    ...report.copyrightNotice.shortQuotes.map((q, i) => ({
      label: `인용 ${i + 1}`,
      value: `"${q}"`,
    })),
  ]);

  return sections;
}

export function buildExportDocument(
  response: AnalysisResponse,
  format: "pdf" | "hwp"
): ExportDocument {
  if (response.status !== "complete" || !response.analysis || !response.classification) {
    throw new Error("완료된 분석 결과만 내보낼 수 있습니다.");
  }

  const { analysis: data, classification, disclaimer, ocr, selectedWork } = response;
  const sections: ExportSection[] = [];

  sections.push({
    heading: "텍스트 추출",
    items: [
      { label: "추출 성공", value: ocr.success ? "성공" : "실패" },
      { label: "추출 신뢰도", value: `${ocr.confidence}%` },
      { label: "Provider", value: ocr.provider },
      ...(selectedWork
        ? [
            { label: "선택 작품", value: `${selectedWork.title} / ${selectedWork.author}` },
          ]
        : []),
      ...(response.extractedText
        ? [
            {
              label: "추출 텍스트 (일부)",
              value:
                response.extractedText.slice(0, 400) +
                (response.extractedText.length > 400 ? "…" : ""),
            },
          ]
        : []),
    ],
  });

  sections.push({
    heading: "지문 분류",
    items: [
      { label: "대분류", value: classification.category },
      { label: "세부 분류", value: classification.subCategory },
      { label: "분류 신뢰도", value: `${classification.confidence}%` },
      { label: "분류 근거", value: classification.reason },
    ],
  });

  sections.push(...reportToSections(data));

  return {
    title: `국어 수업 분석 자료 — ${data.basicInfo.title}`,
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
      version: "2.0-deep",
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
