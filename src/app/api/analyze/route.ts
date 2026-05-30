import { NextRequest, NextResponse } from "next/server";
import { createAnalysisProvider } from "@/lib/providers/analysis/types";
import type { AnalyzeRequest } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { text, ocr, textManuallyVerified, selectedWork } = body;

    if (!selectedWork?.title?.trim()) {
      return NextResponse.json({ error: "분석 전 작품을 선택해 주세요." }, { status: 400 });
    }

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "분석할 텍스트가 필요합니다." }, { status: 400 });
    }

    if (!ocr || typeof ocr.confidence !== "number" || typeof ocr.provider !== "string") {
      return NextResponse.json({ error: "OCR 메타데이터가 필요합니다." }, { status: 400 });
    }

    const provider = createAnalysisProvider();
    const result = await provider.analyze({
      text,
      ocr: {
        success: Boolean(ocr.success),
        confidence: ocr.confidence,
        provider: ocr.provider,
      },
      textManuallyVerified: Boolean(textManuallyVerified),
      selectedWork,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "분석 중 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
