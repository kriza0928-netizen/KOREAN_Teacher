export const TESSERACT_PROVIDER = "tesseract.js";
export const GOOGLE_VISION_PROVIDER = "google-vision";
export const OPENAI_VISION_PROVIDER = "gpt-4o-vision";

export interface OcrResult {
  text: string;
  /** Tesseract 원본 텍스트 (후처리 없음, trim 제외 displayText와 비교용) */
  rawText?: string;
  confidence: number;
  provider: string;
  success: boolean;
  psm?: number;
  preprocessed?: boolean;
  lowConfidence?: boolean;
  debug?: import("@/lib/ocr/ocr-debug").OcrDebugInfo;
}

export interface OcrProvider {
  readonly name: string;
  extractText(source: File | string): Promise<OcrResult>;
}

/** 유료 — Google Cloud Vision (추후 연동) */
export class GoogleVisionOcrProvider implements OcrProvider {
  readonly name = GOOGLE_VISION_PROVIDER;

  async extractText(): Promise<OcrResult> {
    throw new Error(
      "Google Vision OCR은 유료 API입니다. GOOGLE_CLOUD_VISION_API_KEY 설정 후 활성화하세요."
    );
  }
}

/** 유료 — OpenAI Vision OCR (추후 연동) */
export class OpenAiVisionOcrProvider implements OcrProvider {
  readonly name = OPENAI_VISION_PROVIDER;

  async extractText(): Promise<OcrResult> {
    throw new Error(
      "OpenAI Vision OCR은 유료 API입니다. OPENAI_API_KEY 설정 후 활성화하세요."
    );
  }
}

export function createServerOcrProvider(): OcrProvider {
  const provider = process.env.OCR_PROVIDER ?? TESSERACT_PROVIDER;
  if (provider === GOOGLE_VISION_PROVIDER) return new GoogleVisionOcrProvider();
  if (provider === OPENAI_VISION_PROVIDER) return new OpenAiVisionOcrProvider();
  throw new Error("서버 OCR은 브라우저 Tesseract.js를 사용하세요.");
}
