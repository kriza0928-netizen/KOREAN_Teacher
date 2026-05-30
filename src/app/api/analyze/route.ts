import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/ai/vision-analyze";
import { isAiConfigured } from "@/lib/vision/validate";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!isAiConfigured()) {
      return NextResponse.json(
        {
          error:
            "OpenAI API가 설정되지 않았습니다. .env.local에 OPENAI_API_KEY를 설정하세요.",
        },
        { status: 503 }
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image") as File | null;

      if (!file) {
        return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      const mimeType = file.type || "image/jpeg";

      const result = await analyzeImage({ base64, mimeType });
      return NextResponse.json(result);
    }

    const body = await request.json();
    const text = body.text as string | undefined;

    if (text && typeof text === "string") {
      const { analyzeTextOnly } = await import("@/lib/ai/vision-analyze");
      const result = await analyzeTextOnly(text);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "이미지(image) 또는 텍스트(text)가 필요합니다." },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "분석 중 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
