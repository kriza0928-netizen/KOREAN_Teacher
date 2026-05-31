"use client";

export interface OcrStageTiming {
  label: string;
  ms: number;
}

export interface OcrTiming {
  imageLoadMs: number;
  ocrMs: number;
  totalMs: number;
  attempts: number;
  stages: OcrStageTiming[];
}

export class OcrTimer {
  private readonly startedAt = performance.now();
  private readonly stages: OcrStageTiming[] = [];
  private stageStartedAt: number | null = null;
  private currentLabel = "";

  startStage(label: string): void {
    this.endStage();
    this.currentLabel = label;
    this.stageStartedAt = performance.now();
    console.time(`[OCR] ${label}`);
  }

  endStage(): void {
    if (this.stageStartedAt === null || !this.currentLabel) return;
    const ms = performance.now() - this.stageStartedAt;
    console.timeEnd(`[OCR] ${this.currentLabel}`);
    this.stages.push({ label: this.currentLabel, ms: Math.round(ms) });
    this.stageStartedAt = null;
    this.currentLabel = "";
  }

  finish(attempts: number, imageLoadMs: number, ocrStartedAt: number): OcrTiming {
    this.endStage();
    const totalMs = Math.round(performance.now() - this.startedAt);
    const ocrMs = Math.round(performance.now() - ocrStartedAt);

    return {
      imageLoadMs: Math.round(imageLoadMs),
      ocrMs,
      totalMs,
      attempts,
      stages: this.stages,
    };
  }
}

export function formatStageSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}초`;
}
