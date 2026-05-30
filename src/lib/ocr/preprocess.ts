"use client";

export interface PreprocessProgress {
  step: string;
  progress: number;
}

const CONTRAST_FACTOR = 1.45;
const BRIGHTNESS_OFFSET = 12;
const SCALE_FACTOR = 2.5;
const CROP_PADDING_RATIO = 0.06;

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

function adjustContrastAndBrightness(data: ImageData): ImageData {
  const out = cloneImageData(data);
  for (let i = 0; i < out.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const adjusted =
        (out.data[i + c] - 128) * CONTRAST_FACTOR + 128 + BRIGHTNESS_OFFSET;
      out.data[i + c] = clampByte(adjusted);
    }
  }
  return out;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/** 3×3 중값 필터로 노이즈 제거 */
function removeNoise(data: ImageData): ImageData {
  const { width, height, data: src } = data;
  const out = cloneImageData(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const neighbors: number[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          neighbors.push(src[idx]);
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

function shouldInvert(data: ImageData): boolean {
  let sum = 0;
  for (let i = 0; i < data.data.length; i += 4) {
    sum += data.data[i];
  }
  return sum / (data.width * data.height) < 128;
}

function invertGrayscale(data: ImageData): ImageData {
  const out = cloneImageData(data);
  for (let i = 0; i < out.data.length; i += 4) {
    const inverted = 255 - out.data[i];
    out.data[i] = inverted;
    out.data[i + 1] = inverted;
    out.data[i + 2] = inverted;
  }
  return out;
}

interface TextBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function findTextBounds(data: ImageData, inverted: boolean): TextBounds | null {
  const threshold = computeOtsuThreshold(data);
  const { width, height, data: pixels } = data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let textPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const gray = pixels[i];
      const isText = inverted ? gray > threshold + 8 : gray < threshold - 8;
      if (isText) {
        textPixels++;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (textPixels < width * height * 0.002) return null;

  const padX = Math.round((maxX - minX + 1) * CROP_PADDING_RATIO);
  const padY = Math.round((maxY - minY + 1) * CROP_PADDING_RATIO);
  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);

  return {
    x,
    y,
    width: Math.min(width - x, maxX - minX + 1 + padX * 2),
    height: Math.min(height - y, maxY - minY + 1 + padY * 2),
  };
}

function cropCanvas(source: HTMLCanvasElement, bounds: TextBounds): HTMLCanvasElement {
  const cropped = createCanvas(bounds.width, bounds.height);
  const ctx = getContext(cropped);
  ctx.drawImage(
    source,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height
  );
  return cropped;
}

function scaleCanvas(source: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const scaled = createCanvas(
    Math.round(source.width * factor),
    Math.round(source.height * factor)
  );
  const ctx = getContext(scaled);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, scaled.width, scaled.height);
  return scaled;
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

/**
 * OCR 전 이미지 전처리:
 * 흑백 → 대비/밝기 → 노이즈 제거 → 텍스트 영역 크롭 → 2.5배 확대 → threshold
 */
export async function preprocessImageForOcr(
  file: File,
  onProgress?: (progress: PreprocessProgress) => void
): Promise<HTMLCanvasElement> {
  onProgress?.({ step: "이미지 불러오는 중", progress: 5 });
  const img = await loadImageFromFile(file);

  const base = createCanvas(img.width, img.height);
  getContext(base).drawImage(img, 0, 0);

  onProgress?.({ step: "흑백 변환", progress: 15 });
  let data = toGrayscale(imageDataFromCanvas(base));

  onProgress?.({ step: "대비·밝기 보정", progress: 25 });
  data = adjustContrastAndBrightness(data);

  onProgress?.({ step: "노이즈 제거", progress: 35 });
  data = removeNoise(data);

  const inverted = shouldInvert(data);
  if (inverted) {
    data = invertGrayscale(data);
  }

  onProgress?.({ step: "텍스트 영역 자동 크롭", progress: 45 });
  let canvas = putImageDataOnCanvas(data);
  const bounds = findTextBounds(data, inverted);
  if (bounds && bounds.width > 40 && bounds.height > 40) {
    canvas = cropCanvas(canvas, bounds);
    data = imageDataFromCanvas(canvas);
  }

  onProgress?.({ step: "이미지 확대 (2.5배)", progress: 55 });
  canvas = scaleCanvas(canvas, SCALE_FACTOR);
  data = imageDataFromCanvas(canvas);

  onProgress?.({ step: "threshold 처리", progress: 65 });
  const threshold = computeOtsuThreshold(data);
  data = applyThreshold(data, threshold);
  canvas = putImageDataOnCanvas(data);

  onProgress?.({ step: "전처리 완료", progress: 70 });
  return canvas;
}
