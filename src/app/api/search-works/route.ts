import { NextRequest, NextResponse } from "next/server";
import { searchLiteratureWorks, getDatabaseMeta } from "@/lib/literature/search";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim() ?? "";

    if (!text) {
      return NextResponse.json({ error: "검색할 텍스트가 필요합니다." }, { status: 400 });
    }

    const result = searchLiteratureWorks(text);

    return NextResponse.json({
      ...result,
      meta: getDatabaseMeta(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "작품 검색 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ meta: getDatabaseMeta() });
}
