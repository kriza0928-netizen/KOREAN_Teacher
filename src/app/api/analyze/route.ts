import { NextRequest, NextResponse } from "next/server";
import { analyzeText } from "@/lib/ai/analyze";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body.text as string;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "분석할 텍스트가 필요합니다." }, { status: 400 });
    }

    const result = await analyzeText(text);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "분석 중 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
