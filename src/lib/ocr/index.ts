import type { OcrResult } from "@/types";
import { isOcrConfigured } from "@/lib/ocr/validate";

export interface OcrProvider {
  readonly name: string;
  extractText(imageBase64: string, mimeType: string): Promise<OcrResult>;
}

export class GoogleVisionOcrProvider implements OcrProvider {
  readonly name = "google-vision";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractText(imageBase64: string, _mimeType: string): Promise<OcrResult> {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
              imageContext: { languageHints: ["ko", "en"] },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Vision OCR 실패: ${error}`);
    }

    const data = await response.json();
    const annotation = data.responses?.[0]?.fullTextAnnotation;
    const text = annotation?.text?.trim() ?? "";

    if (!text) {
      throw new Error("OCR 인식 결과가 비어 있습니다. 지문이 선명하게 보이도록 다시 촬영해 주세요.");
    }

    const confidence = annotation?.pages?.[0]?.confidence ?? 0.9;

    return {
      text,
      confidence,
      provider: "google-vision",
      success: true,
    };
  }
}

export function createOcrProvider(): OcrProvider {
  if (!isOcrConfigured()) {
    throw new Error(
      "OCR API가 설정되지 않았습니다. .env.local에 OCR_PROVIDER=google-vision과 GOOGLE_CLOUD_VISION_API_KEY를 설정하세요."
    );
  }

  return new GoogleVisionOcrProvider(process.env.GOOGLE_CLOUD_VISION_API_KEY!);
}
