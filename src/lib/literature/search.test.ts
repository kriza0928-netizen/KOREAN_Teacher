import { describe, expect, it } from "vitest";
import { getLiteratureWorks, searchLiteratureWorks } from "@/lib/literature/search";
import { scoreWorkMatch } from "@/lib/literature/scoring";
import { buildWorkSearchProfile } from "@/lib/literature/work-profile";
import { loadLiteratureDatabase } from "@/lib/literature/load-database";

const UNSO_OCR =
  "김 첨지 설렁탕을 사다 죽은 이의 얼굴 아내 왜 먹지를 못하니";

const UNSO_PARTIAL = "설렁탕을 사다 놓았는데 왜 먹지를 못하니";

const JEALOUSY_OCR = "책갈피 종이 오랜 세월 고독한 마음";

const SEO_OCR = "죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를";

const CHOHON_OCR = "산산이 부서진 이름이여 허공";

const EOMMA_GEOKJEONG_OCR = `
열무 삼십 단을 이고
시장에 간 우리 엄마
안 오시네
해는 시든 지 오래
찬밥처럼 방에 담겨
내 유년의 윗목
`.trim();

describe("searchLiteratureWorks — uniquePhrases 우선 점수", () => {
  it("엄마 걱정 — 대표 구절 다수 일치 시 95% 이상", () => {
    const result = searchLiteratureWorks(EOMMA_GEOKJEONG_OCR);
    expect(result.notFound).toBe(false);

    const top = result.matches[0];
    expect(top.title).toBe("엄마 걱정");
    expect(top.author).toBe("기형도");
    expect(top.score).toBeGreaterThanOrEqual(95);

    const phrases = top.matchReasons
      .filter((r) => r.label === "대표 구절")
      .map((r) => r.matchedTerm);
    expect(phrases.some((p) => p.includes("열무"))).toBe(true);
    expect(phrases.some((p) => p.includes("시장") || p.includes("엄마"))).toBe(true);
    expect(phrases.some((p) => p.includes("안 오") || p.includes("안오"))).toBe(true);
    expect(phrases.some((p) => p.includes("해는") || p.includes("시든"))).toBe(true);
    expect(phrases.some((p) => p.includes("윗목") || p.includes("유년"))).toBe(true);
  });

  it("일반어(엄마·방·유년)만으로는 100% 후보가 되지 않는다", () => {
    const result = searchLiteratureWorks("엄마 방 유년 나무 가지 해 혼자");
    const hundred = result.matches.filter((m) => m.score >= 100);
    expect(hundred.length).toBe(0);
    if (result.matches[0]) {
      expect(result.matches[0].score).toBeLessThanOrEqual(95);
    }
  });

  it("제목이 '엄마'인 이상 작품 — 단어 '엄마'만으로 상위 후보 아님", () => {
    const db = loadLiteratureDatabase();
    const isang = db.works.find((w) => w.id === "work-004")!;
    const profile = buildWorkSearchProfile(isang);
    const scored = scoreWorkMatch(profile, "엄마", []);
    expect(scored.confidence).toBeLessThanOrEqual(95);
    expect(scored.metrics.weakOnly || scored.confidence === 0).toBe(true);
  });

  it("운수 좋은 날 — 대표 구절·고유명사로 매칭", () => {
    const result = searchLiteratureWorks(UNSO_OCR);
    expect(result.matches[0]?.title).toBe("운수 좋은 날");
    expect(result.matches[0]?.score).toBeGreaterThanOrEqual(70);
  });

  it("부분 발췌로 운수 좋은 날 매칭", () => {
    const result = searchLiteratureWorks(UNSO_PARTIAL);
    expect(result.matches[0]?.title).toBe("운수 좋은 날");
  });

  it("질투는 나의 힘 — 대표 구절·상징 매칭", () => {
    const result = searchLiteratureWorks(JEALOUSY_OCR);
    expect(result.matches[0]?.title).toBe("질투는 나의 힘");
    expect(result.matches[0]?.score).toBeLessThanOrEqual(100);
  });

  it("서시 — 대표 구절 일부 매칭", () => {
    const result = searchLiteratureWorks(SEO_OCR);
    expect(result.matches[0]?.title).toBe("서시");
  });

  it("초혼 — 짧은 발췌 매칭", () => {
    const result = searchLiteratureWorks(CHOHON_OCR);
    expect(result.matches[0]?.title).toBe("초혼");
  });

  it("후보는 최대 5개", () => {
    const result = searchLiteratureWorks(UNSO_OCR);
    expect(result.matches.length).toBeLessThanOrEqual(5);
  });

  it("모든 작품 uniquePhrases 8개 이상", () => {
    const works = getLiteratureWorks();
    for (const work of works) {
      expect((work.uniquePhrases?.length ?? 0)).toBeGreaterThanOrEqual(8);
    }
  });
});
