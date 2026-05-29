import type { OcrResult } from "@/types";

export interface OcrProvider {
  readonly name: string;
  extractText(imageBase64: string, mimeType: string): Promise<OcrResult>;
}

export class MockOcrProvider implements OcrProvider {
  readonly name = "mock";

  async extractText(_imageBase64: string, _mimeType: string): Promise<OcrResult> {
    return {
      text: `[MVP 데모] OCR API 키가 설정되지 않아 샘플 텍스트가 표시됩니다.

실제 사용 시 .env.local에 GOOGLE_CLOUD_VISION_API_KEY와 OCR_PROVIDER=google-vision을 설정하세요.

---

바람이 불어오는 언덕 위에서
그는 오래된 편지 한 통을 꺼내 들었다.
잉크가 번진 글씨 사이로
누군가의 따뜻한 숨결이 느껴졌다.

"그대를 만나기 전의 나는
아무것도 모르는 빈 종이였소."

그는 편지를 가슴에 품고
저 멀리 지는 해를 바라보았다.
`,
      confidence: 0.85,
      provider: "mock",
    };
  }
}

export class GoogleVisionOcrProvider implements OcrProvider {
  readonly name = "google-vision";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractText(imageBase64: string, mimeType: string): Promise<OcrResult> {
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
    const text = annotation?.text ?? "";
    const confidence = annotation?.pages?.[0]?.confidence ?? 0.9;

    return {
      text: text.trim(),
      confidence,
      provider: "google-vision",
    };
  }
}

export function createOcrProvider(): OcrProvider {
  const provider = process.env.OCR_PROVIDER ?? "mock";

  if (provider === "google-vision") {
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_CLOUD_VISION_API_KEY가 설정되지 않았습니다.");
    }
    return new GoogleVisionOcrProvider(apiKey);
  }

  return new MockOcrProvider();
}
