/** OCR 지문에서 분석에 활용할 텍스트 요소 추출 */

export function normalizeLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export function extractSentences(text: string, max = 8): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?。])\s+|[\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6)
    .slice(0, max);
}

export function extractShortQuotes(text: string, max = 3, maxLen = 40): string[] {
  const sentences = extractSentences(text, 12);
  return sentences
    .filter((s) => s.length >= 8 && s.length <= maxLen)
    .slice(0, max);
}

export function extractKeywordsFromText(text: string, minLen = 2, maxLen = 8): string[] {
  const matches = text.match(/[가-힣]{2,10}/g) ?? [];
  const freq = new Map<string, number>();
  for (const m of matches) {
    if (m.length < minLen || m.length > maxLen) continue;
    if (/^(그리고|하지만|그러나|따라서|그래서|이것|저것|것이|하는|있는|없는)$/.test(m)) continue;
    freq.set(m, (freq.get(m) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);
}

export function inferParagraphSummaries(text: string, max = 6) {
  const paragraphs = text.split(/\n\s*\n+/).filter((p) => p.trim().length > 15);
  if (paragraphs.length === 0) {
    return normalizeLines(text)
      .filter((l) => l.length > 15)
      .slice(0, max)
      .map((line, i) => ({
        paragraph: i + 1,
        summary: summarizeChunk(line),
      }));
  }
  return paragraphs.slice(0, max).map((p, i) => ({
    paragraph: i + 1,
    summary: summarizeChunk(p.replace(/\n/g, " ")),
  }));
}

function summarizeChunk(chunk: string): string {
  const trimmed = chunk.trim();
  if (trimmed.length <= 150) return trimmed;
  return trimmed.slice(0, 147) + "…";
}

export function countPattern(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

export function detectTextSignals(text: string) {
  return {
    hasFirstPerson: /나는|내가|나의|저는|우리/.test(text),
    hasDialogue: /["「『]|라고\s|물었다|대답/.test(text),
    hasEmotion: /그리움|슬픔|사랑|기쁨|외로|눈물|정서|애상|분노|허무/.test(text),
    hasMetaphor: /처럼|같이|마치|비유|상징|은유/.test(text),
    hasClaim: /주장|근거|따라서|그러므로|해야|필요/.test(text),
    hasCauseEffect: /원인|결과|때문|영향|효과/.test(text),
    hasCompare: /비교|대조|반면|차이|공통/.test(text),
    lineCount: normalizeLines(text).length,
    charCount: text.replace(/\s/g, "").length,
  };
}

export function joinSections(parts: (string | undefined | null)[], separator = "\n\n"): string {
  return parts.filter(Boolean).join(separator);
}

export function countReportChars(report: unknown): number {
  const flatten = (obj: unknown): string => {
    if (obj == null) return "";
    if (typeof obj === "string") return obj;
    if (typeof obj === "number") return String(obj);
    if (Array.isArray(obj)) return obj.map(flatten).join("");
    if (typeof obj === "object") return Object.values(obj as Record<string, unknown>).map(flatten).join("");
    return "";
  };

  return flatten(report).replace(/\s/g, "").length;
}
