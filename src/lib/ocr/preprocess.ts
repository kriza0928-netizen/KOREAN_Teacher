"use client";

export interface PreprocessProgress {
  step: string;
  progress: number;
}

/** OCR 후보 이미지 — 원본 필수, 나머지는 보조 */
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

const SCALE_FACTOR = 2.5;

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

function scaleCanvas(source: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const scaled = createCanvas(
    Math.round(source.width * factor),
    Math.round(source.height * factor)
  );
  const ctx = getContext(scaled);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, scaled.width, scaled.height);
  return scaled;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function removeNoise(data: ImageData): ImageData {
  const { width, height, data: src } = data;
  const out = cloneImageData(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const neighbors: number[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          neighbors.push(src[((y + dy) * width + (x + dx)) * 4]);
        }
      }
      const value = median(neighbors);
      const i = (y * width + x) * 4;
      out.data[i] = value;
      out.data[i + 1] = value;
      out.data[i + 2] = value;
    }
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

function fileToOriginalCanvas(file: File): Promise<HTMLCanvasElement> {
  return loadImageFromFile(file).then((img) => {
    const canvas = createCanvas(img.width, img.height);
    getContext(canvas).drawImage(img, 0, 0);
    return canvas;
  });
}

/**
 * 전처리 파이프라인 (누적):
 * 원본 → 흑백 → threshold → 확대 → 노이즈 제거
 * 각 단계별 canvas를 OCR 보조 후보로 반환. 원본은 반드시 포함.
 */
export async function buildOcrImageVariants(
  file: File,
  onProgress?: (progress: PreprocessProgress) => void
): Promise<OcrImageVariants> {
  onProgress?.({ step: "원본 이미지 준비", progress: 10 });
  const original = await fileToOriginalCanvas(file);

  onProgress?.({ step: "흑백 변환", progress: 25 });
  const grayData = toGrayscale(imageDataFromCanvas(original));
  const grayscale = putImageDataOnCanvas(grayData);

  onProgress?.({ step: "threshold 처리", progress: 40 });
  const threshValue = computeOtsuThreshold(grayData);
  const threshold = putImageDataOnCanvas(applyThreshold(grayData, threshValue));

  onProgress?.({ step: "이미지 확대", progress: 55 });
  const scaled = scaleCanvas(threshold, SCALE_FACTOR);

  onProgress?.({ step: "노이즈 제거", progress: 65 });
  const denoised = putImageDataOnCanvas(
    removeNoise(imageDataFromCanvas(scaled))
  );

  onProgress?.({ step: "이미지 변형 준비 완료", progress: 70 });
  return { original, grayscale, threshold, scaled, denoised };
}

/** @deprecated buildOcrImageVariants 사용 */
export async function preprocessImageVariants(
  file: File,
  onProgress?: (progress: PreprocessProgress) => void
): Promise<OcrImageVariants> {
  return buildOcrImageVariants(file, onProgress);
}
