import { describe, expect, it } from "vitest";
import { classifyText } from "@/lib/ai/classify";
import { generateDeepAnalysis } from "@/lib/ai/deep-analysis/generator";
import { enrichWorkSelection } from "@/lib/literature/search";
import { searchLiteratureWorks } from "@/lib/literature/search";

const UNSO_OCR = `
김첨지는 오늘 운수가 좋은 날이라고 생각했다.
그는 설렁탕을 사 오기 위해 인력거를 끌고 거리를 걸었다.
집에 돌아온 김첨지는 아내의 죽음을 알게 되었다.
왜 먹지를 못하니 하고 말했다.
`.trim();

describe("generateDeepAnalysis", () => {
  it("운수 좋은 날 지문에 대해 3000자 이상 심층 분석을 생성한다", () => {
    const search = searchLiteratureWorks(UNSO_OCR);
    const top = search.matches[0];
    expect(top?.title).toContain("운수");

    const selected = enrichWorkSelection(top);
    const classification = classifyText(UNSO_OCR);
    const report = generateDeepAnalysis(UNSO_OCR, classification, selected);

    expect(report.version).toBe("2.0");
    expect(report.type).toBe("literature");
    expect(report.basicInfo.title).toBe("운수 좋은 날");
    expect(report.literatureAnalysis).toBeDefined();
    expect(report.modernNovelAnalysis).toBeDefined();
    expect(report.examMaterials.multipleChoice).toHaveLength(5);
    expect(report.examMaterials.shortAnswer).toHaveLength(5);
    expect(report.totalCharCount).toBeGreaterThanOrEqual(3000);
  });

  it("비문학 지문에 대해 1500자 이상 비문학 분석을 생성한다", () => {
    const nonLitText = `
      인공지능은 데이터를 학습하여 패턴을 인식한다.
      따라서 의료, 교육, 교통 등 다양한 분야에서 활용된다.
      그러나 개인정보 보호와 윤리적 문제도 함께 제기된다.
      예를 들어 알고리즘 편향은 특정 집단에 불이익을 줄 수 있다.
      따라서 기술 발전과 함께 제도적 보완이 필요하다.
    `.trim();

    const classification = classifyText(nonLitText);
    const report = generateDeepAnalysis(nonLitText, classification, {
      mode: "manual",
      title: "인공지능과 사회",
      author: "교과서",
      source: "비문학 지문",
      theme: "인공지능의 활용과 윤리적 과제",
    });

    expect(report.type).toBe("non_literature");
    expect(report.nonLiteratureAnalysis).toBeDefined();
    expect(report.totalCharCount).toBeGreaterThanOrEqual(3000);
  });
});
