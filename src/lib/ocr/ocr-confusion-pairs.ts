/** 작품 후보 90% 이상일 때 교차 보정 활성화 */
export const WORK_MATCH_CORRECTION_THRESHOLD = 90;

/** 대표 구절 유사도 — 교정 후보 생성 최소값 */
export const PHRASE_CORRECTION_MIN_SIMILARITY = 80;

/** 교정 신뢰도 '높음' 기준 — 그 미만은 반드시 사용자 확인 */
export const CORRECTION_HIGH_CONFIDENCE = 85;

/** OCR 한글 오인식 패턴 (양방향) */
export const OCR_CONFUSION_PAIRS: ReadonlyArray<[string, string]> = [
  ["슨", "은"],
  ["은", "슨"],
  ["슬", "을"],
  ["을", "슬"],
  ["슨", "는"],
  ["는", "슨"],
  ["누", "풍"],
  ["풍", "누"],
  ["미", "미풍"],
  ["미풍", "미"],
  ["탄", "단"],
  ["단", "탄"],
  ["나", "누"],
  ["누", "나"],
];

export function areConfusableChars(a: string, b: string): boolean {
  if (a === b) return true;
  return OCR_CONFUSION_PAIRS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

export function areConfusableSubstrings(a: string, b: string): boolean {
  if (a === b) return true;
  if (areConfusableChars(a, b)) return true;
  return OCR_CONFUSION_PAIRS.some(([x, y]) => {
    if (a.length >= x.length && b.length >= y.length) {
      return a.includes(x) && b.includes(y);
    }
    return false;
  });
}
