/** 시(詩) 텍스트 레이아웃 감지 */

export interface PoetryLayoutMetrics {
  lineCount: number;
  avgLineLength: number;
  shortLineRatio: number;
  hasParagraphGaps: boolean;
}

export function analyzePoetryLayout(text: string): PoetryLayoutMetrics {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const lineCount = lines.length;
  const avgLineLength =
    lineCount > 0 ? lines.reduce((sum, l) => sum + l.length, 0) / lineCount : 0;
  const shortLineRatio =
    lineCount > 0 ? lines.filter((l) => l.length <= 22).length / lineCount : 0;
  const hasParagraphGaps = /\n\s*\n/.test(text);

  return { lineCount, avgLineLength, shortLineRatio, hasParagraphGaps };
}

/**
 * 시 모드 활성화 조건
 * - 짧은 행이 많음
 * - 줄바꿈이 많음
 * - 문단(빈 줄)이 없음
 */
export function isPoetryLayout(text: string): boolean {
  const { lineCount, avgLineLength, shortLineRatio, hasParagraphGaps } =
    analyzePoetryLayout(text);

  if (lineCount < 3) return false;
  if (hasParagraphGaps && lineCount < 8) return false;
  if (avgLineLength > 28) return false;

  return shortLineRatio >= 0.55 && lineCount >= 4;
}
