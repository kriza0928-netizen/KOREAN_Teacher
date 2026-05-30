import { NextRequest, NextResponse } from "next/server";
import { createOcrProvider } from "@/lib/ocr";
import { isOcrConfigured } from "@/lib/ocr/validate";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!isOcrConfigured()) {
      return NextResponse.json(
        {
          error:
            "OCR API가 설정되지 않았습니다. OCR_PROVIDER=google-vision과 GOOGLE_CLOUD_VISION_API_KEY를 설정하세요.",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const provider = createOcrProvider();
    const result = await provider.extractText(base64, mimeType);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR 처리 중 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
