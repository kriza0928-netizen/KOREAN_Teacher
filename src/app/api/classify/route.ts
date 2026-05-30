import { NextRequest, NextResponse } from "next/server";
import { classifyText } from "@/lib/ai/classify";
import { validatePreClassification } from "@/lib/validation/text";
import { TESSERACT_PROVIDER } from "@/lib/providers/ocr/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body.text as string;
    const extractionConfidence = (body.extractionConfidence as number) ?? 70;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "분류할 텍스트가 필요합니다." }, { status: 400 });
    }

    const preCheck = validatePreClassification({
      text,
      success: true,
      confidence: extractionConfidence,
      provider: TESSERACT_PROVIDER,
    });

    if (preCheck) {
      return NextResponse.json({
        blocked: true,
        status: preCheck.status,
        message: preCheck.message,
        ocr: preCheck.ocr,
      });
    }

    const result = classifyText(text);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "분류 중 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
