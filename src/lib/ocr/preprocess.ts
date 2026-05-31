"use client";

export interface PreprocessProgress {
  step: string;
  progress: number;
}

/** OCR 후보 이미지 — 필요 시에만 생성 */
export interface OcrImageVariants {
  original: HTMLCanvasElement;
  grayscale: HTMLCanvasElement;
  threshold: HTMLCanvasElement;
  scaled: HTMLCanvasElement;
  denoised: HTMLCanvasElement;
}

export const OCR_VARIANT_LABELS: Record<keyof OcrImageVariants, string> = {
  original: "원본",
  grayscale: "흑백",
  threshold: "threshold",
  scaled: "확대",
  denoised: "노이즈 제거",
};

export const MAX_OCR_LONG_EDGE = 1500;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };
    img.src = url;
  });
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context를 사용할 수 없습니다.");
  return ctx;
}

function cloneImageData(data: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
}

function toGrayscale(data: ImageData): ImageData {
  const out = cloneImageData(data);
  for (let i = 0; i < out.data.length; i += 4) {
    const gray = Math.round(
      out.data[i] * 0.299 + out.data[i + 1] * 0.587 + out.data[i + 2] * 0.114
    );
    out.data[i] = gray;
    out.data[i + 1] = gray;
    out.data[i + 2] = gray;
  }
  return out;
}

function computeOtsuThreshold(data: ImageData): number {
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < data.data.length; i += 4) {
    histogram[data.data[i]]++;
  }

  const total = data.width * data.height;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) ** 2;

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

function applyThreshold(data: ImageData, threshold: number): ImageData {
  const out = cloneImageData(data);
  for (let i = 0; i < out.data.length; i += 4) {
    const value = out.data[i] < threshold ? 0 : 255;
    out.data[i] = value;
    out.data[i + 1] = value;
    out.data[i + 2] = value;
    out.data[i + 3] = 255;
  }
  return out;
}

function putImageDataOnCanvas(data: ImageData): HTMLCanvasElement {
  const canvas = createCanvas(data.width, data.height);
  getContext(canvas).putImageData(data, 0, 0);
  return canvas;
}

function imageDataFromCanvas(canvas: HTMLCanvasElement): ImageData {
  return getContext(canvas).getImageData(0, 0, canvas.width, canvas.height);
}

/** 긴 변 기준 리사이즈 후 원본 canvas 반환 */
export async function loadResizedOcrCanvas(
  file: File,
  maxLongEdge = MAX_OCR_LONG_EDGE
): Promise<HTMLCanvasElement> {
  const img = await loadImageFromFile(file);
  let width = img.width;
  let height = img.height;
  const longEdge = Math.max(width, height);

  if (longEdge > maxLongEdge) {
    const scale = maxLongEdge / longEdge;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = createCanvas(width, height);
  const ctx = getContext(canvas);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

export function toGrayscaleCanvas(original: HTMLCanvasElement): HTMLCanvasElement {
  return putImageDataOnCanvas(toGrayscale(imageDataFromCanvas(original)));
}

export function toThresholdCanvas(original: HTMLCanvasElement): HTMLCanvasElement {
  const grayData = toGrayscale(imageDataFromCanvas(original));
  const threshValue = computeOtsuThreshold(grayData);
  return putImageDataOnCanvas(applyThreshold(grayData, threshValue));
}

/** @deprecated 순차 OCR은 loadResizedOcrCanvas + lazy 변환 사용 */
export async function buildOcrImageVariants(
  file: File,
  onProgress?: (progress: PreprocessProgress) => void
): Promise<OcrImageVariants> {
  onProgress?.({ step: "원본 이미지 준비", progress: 10 });
  const original = await loadResizedOcrCanvas(file);
  onProgress?.({ step: "흑백 변환", progress: 40 });
  const grayscale = toGrayscaleCanvas(original);
  onProgress?.({ step: "threshold 처리", progress: 70 });
  const threshold = toThresholdCanvas(original);

  return {
    original,
    grayscale,
    threshold,
    scaled: original,
    denoised: original,
  };
}

/** @deprecated buildOcrImageVariants 사용 */
export async function preprocessImageVariants(
  file: File,
  onProgress?: (progress: PreprocessProgress) => void
): Promise<OcrImageVariants> {
  return buildOcrImageVariants(file, onProgress);
}
