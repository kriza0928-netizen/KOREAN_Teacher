import { NextRequest, NextResponse } from "next/server";
import { buildExportDocument, generatePdfBlob, toHwpPayload } from "@/lib/export";
import type { AnalysisResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const analysis = body.analysis as AnalysisResponse;
    const format = (body.format as "pdf" | "hwp") ?? "pdf";

    if (!analysis || analysis.status !== "complete" || !analysis.analysis) {
      return NextResponse.json(
        { error: "완료된 분석 결과만 내보낼 수 있습니다." },
        { status: 400 }
      );
    }

    const doc = buildExportDocument(analysis, format);

    if (format === "hwp") {
      const payload = toHwpPayload(doc);
      return new NextResponse(payload, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="gukoe-analysis-hwp.json"',
        },
      });
    }

    const blob = await generatePdfBlob(doc);
    const buffer = Buffer.from(await blob.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="gukoe-analysis.pdf"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "내보내기 중 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
