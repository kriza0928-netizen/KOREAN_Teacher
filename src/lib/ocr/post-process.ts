/**
 * OCR 후처리 — 원문 보존 최우선
 * 한글 단어 의미 추론·교정 금지. 명백한 OCR 노이즈만 제거.
 */

/** Tesseract 한글→영문 오인식 토큰 */
const KNOWN_OCR_ENGLISH_TOKENS = new Set([
  "HJ", "HY", "He", "Hedy", "Sd", "TEA", "TUBE",
]);

/** 줄 단위로 제거할 영문 OCR 노이즈 (단어 경계) */
const GARBAGE_TOKEN_PATTERN =
  /\b(?:HJ|HY|He|Hedy|Sd|TEA|TUBE)\b/gi;

/** 의미 없는 특수문자 */
const SPECIAL_CHAR_BLOB = /[※@#$%^&*+=|\\<>~`|^]+/g;

/** 한글·영문·숫자 없이 특수문자만 있는 줄 */
const SPECIAL_ONLY_LINE = /^[^\uAC00-\uD7A3a-zA-Z0-9]+$/;

export interface OcrPostProcessResult {
  /** Tesseract 원문 (null 제거·줄바꿈 정규화만) */
  rawText: string;
  /** 검색 보조용 정제 텍스트 */
  cleanedText: string;
}

/** OCR 원문 보존 — trim·줄바꿈 정규화만 */
export function preserveRawOcrText(raw: string): string {
  return raw.replace(/\0/g, "").replace(/\r\n/g, "\n").trim();
}

/**
 * 한글 문맥 사이에 끼어든 영문 OCR 노이즈 제거
 * 예: "나의 HJ 갔습니다" → "나의 갔습니다"
 */
export function stripEnglishOcrNoiseInKoreanContext(line: string): string {
  let result = line;

  result = result.replace(
    /(?<=[가-힣])\s+(?:HJ|HY|He|Hedy|Sd|TEA|TUBE)\s+(?=[가-힣])/gi,
    " "
  );

  result = result.replace(
    /(?<=[가-힣])\s+(?:HJ|HY|He|Hedy|Sd|TEA|TUBE)(?=\s|$)/gi,
    ""
  );

  result = result.replace(
    /(?:^|\s)(?:HJ|HY|He|Hedy|Sd|TEA|TUBE)\s+(?=[가-힣])/gi,
    " "
  );

  result = result.replace(/(?<=[가-힣])[A-Za-z]{1,5}(?=[가-힣])/g, (token) =>
    KNOWN_OCR_ENGLISH_TOKENS.has(token) || /^H[a-z]{0,3}$/i.test(token) ? "" : token
  );

  result = result.replace(GARBAGE_TOKEN_PATTERN, "");

  return result.replace(/[ \t]+/g, " ").trim();
}

/**
 * 최소 정제 OCR (검색·가독성 평가용)
 * - 특수문자 노이즈 제거
 * - 한글 사이 영문 OCR 노이즈 제거
 * - 연속 공백 정리
 * - 한글 단어는 변경하지 않음
 */
export function postProcessOcrText(raw: string): string {
  const preserved = preserveRawOcrText(raw);
  if (!preserved) return "";

  const lines = preserved
    .split("\n")
    .map((line) => {
      let cleaned = line.replace(SPECIAL_CHAR_BLOB, "");
      cleaned = stripEnglishOcrNoiseInKoreanContext(cleaned);
      cleaned = cleaned.replace(/[ \t]+/g, " ");
      return cleaned.trimEnd();
    })
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (SPECIAL_ONLY_LINE.test(trimmed)) return false;
      return true;
    });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function processOcrOutput(raw: string): OcrPostProcessResult {
  const rawText = preserveRawOcrText(raw);
  return {
    rawText,
    cleanedText: postProcessOcrText(rawText),
  };
}
