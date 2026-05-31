import { getWorkById } from "@/lib/literature/enrich-work-selection";
import type { LiteratureWork, WorkSelection } from "@/lib/literature/types";
import { findWorkProfile, type WorkProfile } from "@/lib/ai/deep-analysis/work-profiles";
import { joinSections } from "@/lib/ai/deep-analysis/text-extract";

export interface WorkAnalysisContext {
  selected: WorkSelection;
  work?: LiteratureWork;
  profile?: WorkProfile;
  themes: string[];
  emotions: string[];
  symbols: string[];
  keywords: string[];
  guide: string;
  genre: string;
  era: string;
  lowOcrQuality: boolean;
}

export function buildWorkAnalysisContext(
  selected: WorkSelection,
  lowOcrQuality: boolean
): WorkAnalysisContext {
  const work = selected.workId ? getWorkById(selected.workId) : undefined;
  const profile = findWorkProfile(selected.workId, selected.title);

  const themes = unique([
    ...(work?.themes ?? []),
    ...(selected.theme?.split(/[,·]/).map((t) => t.trim()) ?? []),
  ]).filter(Boolean);

  const emotions = unique(work?.emotions ?? []);
  const symbols = unique(work?.symbols ?? []);
  const keywords = unique([
    ...(work?.searchKeywords ?? []),
    ...(work?.keyWords ?? []),
    ...(work?.keywords ?? []),
  ]).filter((k) => k.length >= 2);

  const guide =
    selected.textbookGuide?.trim() ||
    work?.textbookGuide?.trim() ||
    buildDefaultGuide(selected, themes, emotions, symbols);

  return {
    selected,
    work,
    profile,
    themes,
    emotions,
    symbols,
    keywords,
    guide,
    genre: selected.genre ?? work?.genre ?? "문학",
    era: selected.era ?? work?.era ?? "교과서·작품 DB 기준",
    lowOcrQuality,
  };
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function buildDefaultGuide(
  selected: WorkSelection,
  themes: string[],
  emotions: string[],
  symbols: string[]
): string {
  const themePart = themes[0] ?? "작품의 핵심 주제";
  const emotionPart = emotions.slice(0, 2).join(", ") || "정서";
  const symbolPart = symbols.slice(0, 2).join(", ") || "핵심 소재";

  return `「${selected.title}」(${selected.author})은 ${themePart}을(를) 중심으로 ${emotionPart}을(를) 드러내며, ${symbolPart} 등의 소재가 주제와 연결된다.`;
}

export function buildTeacherOverallSummary(ctx: WorkAnalysisContext): string {
  const { selected, profile, guide, themes, emotions, lowOcrQuality } = ctx;

  if (profile?.literature?.themeConsciousness && lowOcrQuality) {
    return joinSections([
      profile.literature.themeConsciousness,
      guide,
    ]);
  }

  if (/님의 침묵/.test(selected.title)) {
    return joinSections([
      "화자는 사랑하는 님과의 이별을 받아들이면서도 그리움과 희망을 동시에 드러내고 있다.",
      guide,
    ]);
  }

  const emotionPart =
    emotions.length > 0
      ? `${emotions.slice(0, 3).join(", ")}의 정서를 중심으로`
      : "인물·화자의 정서를 중심으로";

  const themePart =
    themes.length > 0
      ? `${themes[0]}을(를) 핵심 주제로`
      : "작품의 주제를 중심으로";

  return joinSections([
    `「${selected.title}」(${selected.author})은 ${emotionPart} ${themePart} 전개되는 ${ctx.genre} 작품이다.`,
    guide,
    "선택 작품 DB·교과서 해설을 바탕으로 지문의 기능과 수업 포인트를 정리한다.",
  ]);
}

export function buildTeacherSceneDescription(ctx: WorkAnalysisContext): string {
  const { selected, profile, guide, emotions, symbols } = ctx;

  if (profile?.literature?.situation) {
    return profile.literature.situation;
  }

  if (profile?.poetry?.poeticSituation) {
    return profile.poetry.poeticSituation;
  }

  if (/님의 침묵/.test(selected.title)) {
    return joinSections([
      "화자는 떠나간 님을 회상하며 이별의 슬픔을 표현하고 있다.",
      "단풍·산빛·길·미풍 등의 이미지를 통해 떠남과 그리움이 시적으로 형상화된다.",
    ]);
  }

  if (/운수 좋은 날/.test(selected.title)) {
    return joinSections([
      "가난한 서민의 하루 속에서 소박한 기쁨과 정성이 드러나는 장면이 전개된다.",
      "이후 죽음과 마주하며 정서가 급격히 전환되는 구조를 학생과 함께 추적한다.",
    ]);
  }

  const emotionPart =
    emotions.length > 0 ? `${emotions.slice(0, 2).join(", ")}이(가) 드러나는` : "핵심 정서가 드러나는";
  const symbolPart =
    symbols.length > 0 ? `${symbols.slice(0, 3).join(", ")} 등의 소재가 등장하는` : "핵심 소재가 등장하는";

  return joinSections([
    `「${selected.title}」에서 ${emotionPart} ${symbolPart} 장면·상황을 중심으로 수업을 전개한다.`,
    guide ? `교과서 해설: ${guide}` : "",
  ]);
}

export function buildTeacherTheme(ctx: WorkAnalysisContext): string {
  const { selected, profile, themes } = ctx;

  if (profile?.literature?.themeConsciousness) {
    return profile.literature.themeConsciousness;
  }

  if (profile?.poetry?.theme) {
    return profile.poetry.theme;
  }

  if (/님의 침묵/.test(selected.title)) {
    return "이별의 슬픔을 극복하고 새로운 희망을 추구하려는 의지";
  }

  if (themes.length >= 2) {
    return `${themes[0]}과(와) ${themes[1]}을(를) 중심으로 작품의 주제 의식을 파악한다.`;
  }

  if (themes.length === 1) {
    return themes[0];
  }

  return selected.theme ?? "작품 DB·교과서 해설을 참고하여 주제를 정리한다.";
}

export function buildImportantParts(ctx: WorkAnalysisContext): string[] {
  const { themes, emotions, symbols, keywords, profile } = ctx;

  if (profile?.literature?.examFocusPoints?.length) {
    return profile.literature.examFocusPoints.slice(0, 4);
  }

  const parts = [
    themes[0] ? `핵심 주제: ${themes[0]}` : undefined,
    emotions.length > 0 ? `대표 정서: ${emotions.slice(0, 3).join(", ")}` : undefined,
    symbols.length > 0 ? `상징·소재: ${symbols.slice(0, 3).join(", ")}` : undefined,
    keywords.length > 0 ? `핵심어: ${keywords.slice(0, 4).join(", ")}` : undefined,
    "화자·서술자·주제·표현의 연결",
  ].filter(Boolean) as string[];

  return parts.length > 0
    ? parts
    : ["주제·정서·표현법", "작품 DB 해설과의 연결", "수업·시험 포인트"];
}
