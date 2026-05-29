import { NextRequest, NextResponse } from "next/server";
import { classifyText } from "@/lib/ai/classify";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body.text as string;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "분류할 텍스트가 필요합니다." }, { status: 400 });
    }

    const result = classifyText(text);

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
