/** 단독으로 작품 특정 불가 — +1점만, 후보 자격 불충분 */
export const GLOBAL_WEAK_KEYWORDS = new Set([
  "엄마", "아버지", "어머니", "나무", "방", "가지", "해", "시장", "혼자", "옛날", "유년",
  "눈", "바람", "꽃", "별", "하늘", "땅", "강", "산", "집", "길", "밤", "낮", "봄", "가을",
  "겨울", "여름", "사랑", "슬픔", "그리움", "나", "너", "우리", "사람", "마음", "이름",
  "시", "노래", "꿈", "기억", "고요", "외로움", "고독", "행복", "눈물",
]);

/** 제목이 일반 단어 하나뿐인 작품 — 제목만으로 고득점·100% 금지 */
export const WEAK_SINGLE_WORD_TITLES = new Set([
  "엄마", "나무", "눈", "나", "사", "풀", "해", "방", "별", "꽃", "바람", "승무",
]);

export const SCORE_WEIGHTS = {
  UNIQUE_PHRASE_EXACT: 60,
  UNIQUE_PHRASE_PARTIAL: 40,
  TITLE: 50,
  TITLE_WEAK: 5,
  AUTHOR: 40,
  KEYWORD: 10,
  WEAK_KEYWORD: 1,
  MAX_CONFIDENCE_DEFAULT: 95,
} as const;

export function isWeakKeyword(term: string): boolean {
  const t = term.replace(/\s/g, "");
  return GLOBAL_WEAK_KEYWORDS.has(t) || t.length <= 1;
}

export function isWeakSingleWordTitle(title: string): boolean {
  return WEAK_SINGLE_WORD_TITLES.has(title.trim());
}
