"use client";

import type { OcrLangMode } from "@/lib/ocr/ocr-candidate";

type TesseractWorker = Awaited<
  ReturnType<(typeof import("tesseract.js"))["createWorker"]>
>;

const workers = new Map<OcrLangMode, TesseractWorker>();
const workerInit = new Map<OcrLangMode, Promise<TesseractWorker>>();

async function createLangWorker(lang: OcrLangMode): Promise<TesseractWorker> {
  console.time(`[OCR] worker-init:${lang}`);
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker(lang, 1);
  console.timeEnd(`[OCR] worker-init:${lang}`);
  return worker;
}

async function getWorker(lang: OcrLangMode): Promise<TesseractWorker> {
  const existing = workers.get(lang);
  if (existing) return existing;

  let pending = workerInit.get(lang);
  if (!pending) {
    pending = createLangWorker(lang).then((worker) => {
      workers.set(lang, worker);
      workerInit.delete(lang);
      return worker;
    });
    workerInit.set(lang, pending);
  }

  return pending;
}

/** 앱 진입 시 kor worker 미리 로드 */
export async function warmOcrWorkers(): Promise<void> {
  if (typeof window === "undefined") return;
  await getWorker("kor");
}

export async function recognizeCanvas(
  canvas: HTMLCanvasElement,
  lang: OcrLangMode,
  psm: 6 | 11
): Promise<Awaited<ReturnType<TesseractWorker["recognize"]>>> {
  const worker = await getWorker(lang);
  const Tesseract = await import("tesseract.js");

  await worker.setParameters({
    tessedit_pageseg_mode:
      psm === 6 ? Tesseract.PSM.SINGLE_BLOCK : Tesseract.PSM.SPARSE_TEXT,
  });

  return worker.recognize(canvas);
}
