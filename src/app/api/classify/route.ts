import { NextRequest, NextResponse } from "next/server";
import { classifyText } from "@/lib/ai/classify";
import { validatePreClassification } from "@/lib/vision/validate";
import { VISION_PROVIDER } from "@/lib/ai/vision-analyze";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body.text as string;
    const extractionConfidence = (body.extractionConfidence as number) ?? 90;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "분류할 텍스트가 필요합니다." }, { status: 400 });
    }

    const preCheck = validatePreClassification({
      text,
      success: true,
      confidence: extractionConfidence,
      provider: VISION_PROVIDER,
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

    if (result.confidence < 75) {
      return NextResponse.json({
        category: result.category,
        subCategory: "분류 불확실",
        confidence: result.confidence,
        reason: result.reason,
        warnings: result.warnings,
        isUncertain: true,
        blocked: true,
        message: "분류 신뢰도 75% 미만 — 분류 불확실",
      });
    }

    return NextResponse.json({
      category: result.category,
      subCategory: result.subCategory,
      confidence: result.confidence,
      reason: result.reason,
      warnings: result.warnings,
      isUncertain: result.isUncertain,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "분류 중 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
