import { NextRequest, NextResponse } from "next/server";
import { searchLiteratureWorks } from "@/lib/literature/search";
import { generateWorkBasedCorrections } from "@/lib/ocr/work-based-correction";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { text?: string; rawText?: string; cleanedText?: string };
    const text = body.text?.trim() ?? "";

    if (!text) {
      return NextResponse.json({ error: "교정할 OCR 텍스트가 필요합니다." }, { status: 400 });
    }

    const searchResult = searchLiteratureWorks(text, {
      rawText: body.rawText?.trim() || text,
      cleanedText: body.cleanedText?.trim(),
    });

    const correction = generateWorkBasedCorrections(text, searchResult.matches);

    return NextResponse.json({
      searchResult,
      correction,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "작품 기반 교정 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
