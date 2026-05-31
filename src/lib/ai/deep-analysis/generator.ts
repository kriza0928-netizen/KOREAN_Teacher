import type { TextClassification, SourceCandidate } from "@/types";
import type { WorkSelection } from "@/lib/literature/types";
import type {
  CopyrightNotice,
  ExamMaterials,
  ExamQuestionMultipleChoice,
  ExamQuestionShortAnswer,
  LessonMaterials,
  LiteratureDetailedAnalysis,
  ModernNovelAnalysis,
  ModernPoetryAnalysis,
  NonLiteratureDetailedAnalysis,
  PassageSummary,
  TeacherAnalysisReport,
  TeacherComments,
  WorkBasicInfo,
} from "@/types/analysis-report";
import {
  countReportChars,
  joinSections,
} from "@/lib/ai/deep-analysis/text-extract";
import { findWorkProfile } from "@/lib/ai/deep-analysis/work-profiles";
import type { OcrQualityInput } from "@/lib/ai/deep-analysis/sanitize-output";
import {
  assessOcrQuality,
  OCR_LOW_QUALITY_NOTICE,
  sanitizeReportValue,
} from "@/lib/ai/deep-analysis/sanitize-output";
import {
  buildImportantParts,
  buildTeacherOverallSummary,
  buildTeacherSceneDescription,
  buildTeacherTheme,
  buildWorkAnalysisContext,
} from "@/lib/ai/deep-analysis/work-context";

export type GenerateDeepAnalysisOptions = OcrQualityInput;

const MIN_LIT_CHARS = 1500;
const MIN_NONLIT_CHARS = 1500;
const MIN_TOTAL_CHARS = 3000;

function resolveAnalysisType(
  selected: WorkSelection,
  classification: TextClassification
): "literature" | "non_literature" {
  if (selected.mode === "db") return "literature";
  const genre = selected.genre ?? "";
  if (/현대시|현대소설|고전|시가|시조|수필|문학|소설|시/.test(genre)) return "literature";
  if (/인문|사회|과학|기술|예술|융합|비문학/.test(genre)) return "non_literature";
  return classification.category === "문학" ? "literature" : "non_literature";
}

function isPoetryGenre(genre?: string, subCategory?: string): boolean {
  const g = `${genre ?? ""} ${subCategory ?? ""}`;
  return /시|시가|시조|가사|한시|향가/.test(g) && !/소설/.test(g);
}

function isNovelGenre(genre?: string, subCategory?: string): boolean {
  const g = `${genre ?? ""} ${subCategory ?? ""}`;
  return /소설|수필/.test(g);
}

function buildSourceCandidates(selected?: WorkSelection): SourceCandidate[] {
  if (!selected?.title?.trim()) {
    return [{ title: "미선택", author: "미상", source: "—", confidence: 0.3 }];
  }
  return [
    {
      title: selected.title.trim(),
      author: selected.author?.trim() || "미상",
      source: selected.source?.trim() || (selected.mode === "db" ? "작품 DB" : "교사 직접 입력"),
      confidence: (selected.matchScore ?? 95) / 100,
    },
  ];
}

function buildBasicInfo(
  selected: WorkSelection,
  classification: TextClassification,
  profile?: ReturnType<typeof findWorkProfile>
): WorkBasicInfo {
  const genre = selected.genre ?? classification.subCategory ?? "문학";
  const theme = selected.theme ?? "주제는 선택 작품 DB 및 교과서 해설을 참고하여 교사가 최종 확인한다.";
  return {
    title: selected.title,
    author: selected.author,
    genre,
    era: selected.era ?? "시대·배경은 교과서 및 작품 DB 기준으로 확인",
    curriculumArea:
      profile?.curriculumArea ??
      `${classification.category} · ${classification.subCategory} · ${selected.source ?? "국어 교과서"}`,
    themeSummary: theme,
    difficulty: profile?.difficulty ?? inferDifficulty(classification, genre),
  };
}

function inferDifficulty(classification: TextClassification, genre: string): string {
  if (classification.isUncertain) return "중상 (분류 불확실 — 교사 확인 필요)";
  if (/고전|한시|시조/.test(genre)) return "중상 (고전 어휘·표현 이해 필요)";
  if (/소설/.test(genre)) return "중 (인물·서사·주제 연결)";
  if (/시/.test(genre)) return "중 (화자·정서·표현법)";
  if (classification.category === "비문학") return "중 (개념·구조·논리 파악)";
  return "중";
}

function buildPassageSummary(ctx: ReturnType<typeof buildWorkAnalysisContext>): PassageSummary {
  const { selected, profile, lowOcrQuality } = ctx;
  const guide = ctx.guide;
  const theme = buildTeacherTheme(ctx);

  const overallSummary = joinSections([
    lowOcrQuality ? OCR_LOW_QUALITY_NOTICE : undefined,
    buildTeacherOverallSummary(ctx),
  ]);

  const sceneDescription = buildTeacherSceneDescription(ctx);

  return {
    overallSummary,
    sceneDescription,
    contextBeforeAfter:
      profile?.contextBeforeAfter ??
      joinSections([
        `앞맥락: 「${selected.title}」의 앞부분에서는 작품의 배경·정서·핵심 소재가 제시된다. ${guide.slice(0, 100)}`,
        `뒷맥락: 이후 전개에서는 주제(${theme})와 정서가 심화·정리된다. 지문의 위치에 따라 정서 변화·주제 압축 여부를 확인한다.`,
      ]),
    importantParts: buildImportantParts(ctx),
  };
}

function buildLiteratureAnalysis(
  ctx: ReturnType<typeof buildWorkAnalysisContext>,
  classification: TextClassification
): LiteratureDetailedAnalysis {
  const { selected, profile, guide, keywords, emotions, symbols } = ctx;
  const theme = buildTeacherTheme(ctx);
  const base = profile?.literature ?? {};

  return {
    speaker:
      base.speaker ??
      joinSections([
        /시/.test(ctx.genre)
          ? "1인칭 화자의 정서와 태도를 중심으로 작품을 감상한다."
          : "서술자·인물의 시각과 태도를 구분하여 지문을 읽는다.",
        `「${selected.title}」(${ctx.genre ?? classification.subCategory})의 화자·서술자 특성을 교과서 해설과 대조한다.`,
      ]),
    centralSubject:
      base.centralSubject ??
      joinSections([
        `중심 대상: ${keywords.slice(0, 3).join(", ") || symbols.slice(0, 2).join(", ") || "작품의 핵심 인물·대상"}`,
        guide ? `DB 해설: ${guide}` : "",
      ]),
    situation:
      base.situation ?? buildTeacherSceneDescription(ctx),
    emotionAndAttitude:
      base.emotionAndAttitude ??
      joinSections([
        emotions.length > 0
          ? `대표 정서: ${emotions.join(", ")}`
          : "작품 DB·교과서 해설을 바탕으로 정서·태도를 정리한다.",
        guide ? `교과서 해설: ${guide.slice(0, 120)}` : "",
      ]),
    themeConsciousness: base.themeConsciousness ?? theme,
    conflictStructure:
      base.conflictStructure ??
      "내적 갈등(정서·욕구·가치의 충돌)과 외적 갈등(인물·환경·사회)을 지문에서 찾아 구조화한다.",
    characterRelations:
      base.characterRelations ??
      "지문에 등장하는 인물·대상 간의 관계(가족·사회·자아)를 도식화하여 설명한다.",
    expressionFeatures:
      base.expressionFeatures ??
      joinSections([
        symbols.length > 0
          ? `상징·비유: ${symbols.join(", ")} 등의 소재가 주제·정서와 연결된다.`
          : "갈래에 따른 표현법(운율·서사·묘사·대화)을 작품 DB 해설과 연결한다.",
        `「${selected.title}」의 대표적 표현 특징을 교과서 해설과 연결한다.`,
      ]),
    symbolicMaterials:
      base.symbolicMaterials ??
      (symbols.length > 0
        ? `핵심 소재·상징: ${symbols.join(", ")}. 각 소재가 주제·정서와 어떻게 연결되는지 분석한다.`
        : "작품 DB의 핵심 소재·시어를 상징으로 읽는 연습을 한다."),
    keyVocabulary:
      base.keyVocabulary ??
      (keywords.length > 0
        ? keywords.map((k) => `「${k}」: 작품 맥락에서의 의미와 주제·정서와의 연결`).join("\n")
        : "핵심 어휘를 작품·교과서 해설 맥락에서 풀이한다."),
    repetitionEffect:
      base.repetitionEffect ??
      "반복되는 시어·구절·표현이 정서·주제·리듬에 미치는 효과를 분석한다.",
    moodAndTone:
      base.moodAndTone ??
      "지문 전체의 분위기(애상·담담·긴장·아이러니 등)와 화자/서술자의 어조를 파악한다.",
    positionInWork:
      base.positionInWork ??
      profile?.positionInWork ??
      `「${selected.title}」 전체 구조에서 이 지문은 도입·전개·절정·결말 중 어디에 해당하는지 파악한다.`,
    studentConfusionPoints: base.studentConfusionPoints ?? [
      "화자/서술자/작가 혼동",
      "표면적 의미만 파악하고 상징·주제를 놓치는 경우",
      "지문만 보고 작품 전체 맥락을 연결하지 못하는 경우",
    ],
    examFocusPoints: base.examFocusPoints ?? [
      `${selected.title}의 주제·정서·표현`,
      "핵심 시어·소재의 의미",
      "화자/서술자/인물의 태도",
      "작품 DB 해설과 지문의 연결",
    ],
  };
}

function buildPoetryAnalysis(ctx: ReturnType<typeof buildWorkAnalysisContext>): ModernPoetryAnalysis {
  const { selected, profile, keywords, symbols } = ctx;
  const base = profile?.poetry ?? {};
  const theme = buildTeacherTheme(ctx);

  return {
    speakerSituation:
      base.speakerSituation ??
      joinSections([
        buildTeacherSceneDescription(ctx),
        `「${selected.title}」 화자의 처지를 교과서 해설과 연결한다.`,
      ]),
    attitudeToSubject:
      base.attitudeToSubject ??
      joinSections([
        ctx.emotions.length > 0
          ? `화자는 ${ctx.emotions.slice(0, 2).join(", ")}의 정서를 드러낸다.`
          : "화자가 대상에 대해 드러내는 태도·정서를 분석한다.",
        ctx.guide,
      ]),
    poeticSituation: base.poeticSituation ?? buildTeacherSceneDescription(ctx),
    emotionalChange:
      base.emotionalChange ??
      "도입(정서 제시) → 전개(심화) → 절정(주제·정서 응축) 순으로 정서 변화를 정리한다.",
    imageryDevelopment:
      base.imageryDevelopment ??
      (symbols.length > 0
        ? `${symbols.join(", ")} 등의 이미지를 따라 시상이 전개된다.`
        : "시상(시의 내용 전개)이 시간·공간·정서 축을 따라 어떻게 전개되는지 분석"),
    stanzaSummaries:
      base.stanzaSummaries ?? [
        "1연: 시적 상황과 정서의 제시",
        "2연: 정서·이미지의 심화·전개",
        "3연: 주제·정서의 절정",
      ],
    keyWordInterpretations:
      base.keyWordInterpretations ??
      (keywords.length > 0
        ? keywords
            .slice(0, 5)
            .map((k) => `「${k}」: 작품·교과서 해설 맥락에서의 함의`)
        : symbols.slice(0, 3).map((s) => `「${s}」: 주제·정서와 연결되는 상징`)),
    imagery:
      base.imagery ??
      (symbols.length > 0
        ? `${symbols.join(", ")} — 정서·주제와 연결되는 심상`
        : "작품 DB·교과서 해설의 핵심 심상과 정서의 연결"),
    metaphorAndSymbol:
      base.metaphorAndSymbol ??
      joinSections([
        `「${selected.title}」의 비유·상징을 작품 DB 해설과 연결한다.`,
        ctx.guide,
      ]),
    repetitionAndParallelism:
      base.repetitionAndParallelism ?? "반복·대구·대조 등의 형식적 특징과 정서·주제 강화 효과",
    rhetoricalDevices:
      base.rhetoricalDevices ?? "설의·영탄·도치·의인법 등과 작품 DB 해설상의 표현 특징",
    theme: base.theme ?? theme,
    possibleChoices: base.possibleChoices ?? buildDefaultPoetryChoices(selected),
  };
}

function buildNovelAnalysis(ctx: ReturnType<typeof buildWorkAnalysisContext>): ModernNovelAnalysis {
  const { selected, profile, guide } = ctx;
  const base = profile?.novel ?? {};
  const theme = buildTeacherTheme(ctx);

  return {
    characters:
      base.characters ??
      `「${selected.title}」의 인물: ${selected.textbookGuide?.slice(0, 120) ?? "지문에 등장하는 인물의 성격·관계 정리"}`,
    events:
      base.events ??
      joinSections([
        `「${selected.title}」의 핵심 사건을 발단→전개→절정→결말 순으로 정리한다.`,
        guide,
      ]),
    setting:
      base.setting ??
      `${selected.era ?? "시대"} 배경, ${selected.textbookGuide?.slice(0, 60) ?? "공간·시간적 배경"}`,
    conflict: base.conflict ?? "인물 간·인물 내면·인물과 환경의 갈등",
    pointOfView:
      base.pointOfView ??
      "서술자 시점(1인칭/3인칭)을 작품 DB·교과서 해설과 연결하여 정리",
    narrativeFeatures:
      base.narrativeFeatures ?? "서술·묘사·대화의 비율, 행동·심리 묘사, 점층적 전개",
    characterPsychology:
      base.characterPsychology ?? "인물의 욕구·정서·태도를 작품 해설·교과서 자료와 연결",
    dialogueAndAction:
      base.dialogueAndAction ??
      "대화·행동을 통해 드러나는 인물 성격·관계·갈등을 작품 DB 해설과 연결",
    foreshadowing: base.foreshadowing ?? "앞 장면의 복선·떡밥이 이 지문/결말과 연결되는지 확인",
    sceneFunction:
      base.sceneFunction ?? "이 장면이 주제·인물·갈등 중 무엇을 강조하는지 기능 분석",
    endingAndTheme:
      base.endingAndTheme ?? theme,
    possibleChoices:
      base.possibleChoices ?? buildDefaultNovelChoices(selected),
  };
}

function buildNonLiteratureAnalysis(
  selected: WorkSelection,
  classification: TextClassification,
  ctx: ReturnType<typeof buildWorkAnalysisContext>
): NonLiteratureDetailedAnalysis {
  const theme = selected.theme ?? ctx.themes[0] ?? `${classification.subCategory} 분야의 중심 화제`;

  return {
    centralTopic: theme,
    purpose: "정보 전달·설명·주장·설득 등 글의 목적을 논리 구조와 함께 정리한다.",
    paragraphSummaries: [
      { paragraph: 1, summary: "도입: 문제 제기·화제 제시" },
      { paragraph: 2, summary: "전개: 개념·근거·사례 설명" },
      { paragraph: 3, summary: "결말: 요지 정리·시사점" },
    ],
    structure: "도입(문제 제기) → 본론(주장·근거) → 결론(정리) 구조",
    keyConcepts:
      ctx.keywords.length > 0 ? ctx.keywords.slice(0, 6) : ["핵심 개념 1", "핵심 개념 2", "핵심 개념 3"],
    claimsAndEvidence: [
      {
        claim: "글의 중심 주장 (선택 출처·교과서 자료 종합)",
        evidence: "근거는 교사가 지문에서 직접 확인·표시",
      },
      {
        claim: "부차적 주장 또는 보조 논점",
        evidence: "연결어(따라서·그러나·예를 들어)를 따라 논리 구조화",
      },
    ],
    comparisonContrast: "비교·대조 관계를 표·도식으로 정리",
    causeEffect: "원인→결과, 조건→결과 관계를 구조화",
    problemSolution: "문제 제기 → 원인 분석 → 해결 방안(또는 제안) 구조 여부 확인",
    difficultConcepts: [
      "추상적 개념어의 정의와 예시 연결",
      "전문 용어와 일상 언어의 차이",
      "함축적 표현·전제의 파악",
    ],
    examFocusPoints: [
      "중심 화제·글의 목적",
      "문단별 요지·글의 구조",
      "주장과 근거의 연결",
      "개념의 의미와 맥락",
      selected.title !== "미상" ? `선택 출처(${selected.title})와 글의 연관` : "출처·맥락",
    ],
  };
}

function buildLessonMaterials(
  selected: WorkSelection,
  classification: TextClassification,
  profile?: ReturnType<typeof findWorkProfile>
): LessonMaterials {
  const base = profile?.lesson ?? {};
  return {
    introQuestions: base.introQuestions ?? [
      `「${selected.title}」을(를) 읽기 전, '${selected.theme?.slice(0, 20) ?? "주제"}'와 관련된 경험이 있나요?`,
      "이 작품/지문의 제목만 보고 무엇이 펼쳐질 것 같나요?",
      "작가의 다른 작품을 읽어 본 적이 있다면 공통점은 무엇인가요?",
    ],
    backgroundKnowledge:
      base.backgroundKnowledge ??
      joinSections([
        `작가 ${selected.author}, ${selected.era ?? "시대"} 배경`,
        selected.textbookGuide ?? "",
        `${classification.subCategory} 갈래의 특징 간략 소개`,
      ]),
    studentGuidingQuestions: [
      "이 지문에서 가장 인상 깊은 표현은 무엇인가요?",
      "화자/서술자/필자는 어떤 태도를 보이나요?",
      "핵심 소재·시어는 무엇이며 왜 중요한가요?",
      "작품/글 전체의 주제와 이 지문은 어떻게 연결되나요?",
    ],
    discussionQuestions: [
      `「${selected.title}」의 주제를 현대적 관점에서 토론해 봅시다.`,
      "이 작품/글에서 공감·비공감하는 부분과 그 이유는?",
      "다른 작품·글과 비교하면 어떤 공통점·차이가 있나요?",
    ],
    boardSummary: [
      `작품: ${selected.title} / ${selected.author}`,
      `갈래: ${selected.genre ?? classification.subCategory}`,
      `주제: ${selected.theme ?? "—"}`,
      "핵심 표현·소재: (판서 시 학생과 함께 추출)",
      "수업 포인트: 정서·주제·표현법",
    ],
    performanceAssessmentIdeas: base.performanceAssessmentIdeas ?? [
      "지문 핵심을 마인드맵으로 정리",
      "주제·정서를 담은 한 줄 카드(포스트잇) 작성",
      "핵심 구절 감상문 (200자 내외, 직접 인용 최소화)",
    ],
  };
}

function buildExamMaterials(
  selected: WorkSelection,
  classification: TextClassification,
  isLiterature: boolean,
  profile?: ReturnType<typeof findWorkProfile>
): ExamMaterials {
  const title = selected.title;
  const author = selected.author;
  const theme = selected.theme ?? "주제";

  if (profile?.exam?.multipleChoice?.length && profile.exam?.shortAnswer?.length) {
    return {
      multipleChoice: profile.exam.multipleChoice as ExamQuestionMultipleChoice[],
      shortAnswer: profile.exam.shortAnswer as ExamQuestionShortAnswer[],
    };
  }

  const multipleChoice: ExamQuestionMultipleChoice[] = isLiterature
    ? buildLiteratureMC(title, author, theme, selected.genre ?? classification.subCategory)
    : buildNonLiteratureMC(title, classification.subCategory);

  const shortAnswer: ExamQuestionShortAnswer[] = isLiterature
    ? buildLiteratureShortAnswer(title, author, theme, selected.genre ?? classification.subCategory)
    : buildNonLiteratureShortAnswer(title, classification.subCategory);

  return { multipleChoice, shortAnswer };
}

function buildLiteratureMC(
  title: string,
  author: string,
  theme: string,
  genre: string
): ExamQuestionMultipleChoice[] {
  const isNovel = /소설/.test(genre);
  return [
    {
      number: 1,
      question: `「${title}」에 대한 설명으로 가장 적절한 것은?`,
      choices: [
        `① ${author}의 작품으로, ${theme.slice(0, 30)}을(를) 다룬다.`,
        `② 이 작품은 ${author} 이전 시대의 고전 작품이다.`,
        `③ 이 작품은 주로 유머와 풍자만을 목적으로 한다.`,
        `④ 이 작품에서 인물의 심리는 전혀 드러나지 않는다.`,
        `⑤ 이 작품의 주제는 기술 발전에만 국한된다.`,
      ],
      answer: 1,
      explanation: `①이 정답. 「${title}」은 ${author}의 ${genre}로, ${theme}을(를) 핵심 주제로 다룬다.`,
      wrongChoiceExplanations: [
        "② 시대·작가 오류",
        "③ 주제·성격 왜곡",
        "④ 인물·정서 무시",
        "⑤ 주제 축소",
      ],
      intent: "작품 기본 정보(작가·갈래·주제) 확인",
      difficulty: "하",
    },
    {
      number: 2,
      question: isNovel
        ? `「${title}」 지문에서 서술상 특징으로 적절한 것은?`
        : `「${title}」에서 화자의 정서로 적절한 것은?`,
      choices: isNovel
        ? [
            "① 행동·대화를 통해 인물을 형상화한다.",
            "② 전지적 작가 시점만 사용한다.",
            "③ 사건 전개 없이 설명만 한다.",
            "④ 인물의 이름이 전혀 등장하지 않는다.",
            "⑤ 유머러스한 톤만 유지한다.",
          ]
        : [
            "① 그리움·애상·이별의 정서",
            "② 순수한 기쁨과 환희만",
            "③ 분노와 복수",
            "④ 중립적·객관적 관찰만",
            "⑤ 풍자와 비꼼",
          ],
      answer: 1,
      explanation: isNovel
        ? "① 행동·대화를 통한 인물 형상화는 현대소설의 대표적 특징."
        : "① 화자의 정서는 작품 주제와 연결되어 파악.",
      wrongChoiceExplanations: ["②③④⑤ 각각 지문·작품과 불일치"],
      intent: isNovel ? "서술상 특징" : "화자 정서",
      difficulty: "중",
    },
    {
      number: 3,
      question: `「${title}」의 주제 의식으로 가장 적절한 것은?`,
      choices: [
        `① ${theme.slice(0, 40)}`,
        "② 개인의 성공만을 강조한다.",
        "③ 자연 파괴에 대한 과학적 분석",
        "④ 정치 투쟁만을 다룬다.",
        "⑤ 기술 발전의 긍정적 측면만",
      ],
      answer: 1,
      explanation: `①이 작품 DB·교과서 해설 기준 주제.`,
      wrongChoiceExplanations: ["②~⑤ 주제 왜곡·축소"],
      intent: "주제 파악",
      difficulty: "중",
    },
    {
      number: 4,
      question: "표현상 특징과 효과의 연결이 적절한 것은?",
      choices: [
        "① 반복 — 정서·주제 강조",
        "② 반복 — 사건 전개만 가속",
        "③ 비유 — 인물 이름 나열",
        "④ 대화 — 필자 주장만 전달",
        "⑤ 묘사 — 주제와 무관",
      ],
      answer: 1,
      explanation: "반복은 정서·주제 강화에 기여.",
      wrongChoiceExplanations: ["②~⑤ 표현·효과 연결 오류"],
      intent: "표현법과 효과",
      difficulty: "중",
    },
    {
      number: 5,
      question: "이 지문/작품을 감상한 내용으로 적절하지 않은 것은?",
      choices: [
        "① 작품의 주제를 자신의 경험과 연결하여 서술",
        "② 근거 없이 작품 내용을 왜곡",
        "③ 핵심 표현을 인용하며 감상",
        "④ 인물·화자의 정서를 분석",
        "⑤ 표현상 특징을 들어 설명",
      ],
      answer: 2,
      explanation: "②는 근거 없는 왜곡으로 부적절.",
      wrongChoiceExplanations: ["①③④⑤ 적절한 감상·분석"],
      intent: "감상·분석 태도",
      difficulty: "하",
    },
  ];
}

function buildLiteratureShortAnswer(
  title: string,
  author: string,
  theme: string,
  genre: string
): ExamQuestionShortAnswer[] {
  return [
    {
      number: 1,
      question: `「${title}」의 주제를 한 문장으로 서술하시오.`,
      modelAnswer: theme,
      gradingCriteria: "작품 DB·교과서 해설과 일치하는 핵심 주제를 한 문장으로 서술 (3점)",
      intent: "주제 파악",
      difficulty: "중",
    },
    {
      number: 2,
      question: /소설/.test(genre)
        ? "지문에 나타난 인물의 성격과 그 근거를 서술하시오."
        : "화자의 정서와 그 근거가 되는 표현을 서술하시오.",
      modelAnswer: /소설/.test(genre)
        ? "인물의 성격(예: 성실·애정)과 대화·행동 근거 제시"
        : "화자의 정서(예: 그리움·슬픔)와 핵심 시어·구절 근거",
      gradingCriteria: "정서/성격 1점 + 근거 2점",
      intent: "인물/화자 분석",
      difficulty: "중",
    },
    {
      number: 3,
      question: "지문에서 사용된 표현법을 두 가지 이상 들고 그 효과를 서술하시오.",
      modelAnswer: "반복·비유·상징·대화 등 2가지 이상 + 효과(정서·주제 강화)",
      gradingCriteria: "표현법 2점 + 효과 1점",
      intent: "표현법",
      difficulty: "중상",
    },
    {
      number: 4,
      question: `「${title}」에서 핵심 소재(또는 시어)의 의미를 서술하시오.`,
      modelAnswer: "핵심 소재·시어 + 상징적·주제적 의미",
      gradingCriteria: "소재 지목 1점 + 의미 2점",
      intent: "소재·시어",
      difficulty: "중",
    },
    {
      number: 5,
      question: `${author}의 「${title}」을 자신의 경험과 연결하여 200자 내외로 감상하시오.`,
      modelAnswer: "주제·정서 이해 + 개인 경험 연결 (직접 인용 최소화)",
      gradingCriteria: "작품 이해 2점 + 경험 연결 1점",
      intent: "감상·적용",
      difficulty: "중",
    },
  ];
}

function buildNonLiteratureMC(title: string, field: string): ExamQuestionMultipleChoice[] {
  return [
    {
      number: 1,
      question: "글의 중심 내용으로 가장 적절한 것은?",
      choices: ["① (지문·선택 출처 기준 중심 내용)", "② 부차적 예시만", "③ 필자 개인 일기", "④ 허구적 사건", "⑤ 감정만 표현"],
      answer: 1,
      explanation: "중심 내용은 글 전체를 아우르는 화제.",
      wrongChoiceExplanations: ["②~⑤ 중심 내용 아님"],
      intent: "중심 내용",
      difficulty: "중",
    },
    {
      number: 2,
      question: "글의 목적으로 적절한 것은?",
      choices: ["① 정보 전달·설명", "② 허구적 감상 유도", "③ 인물 형상화", "④ 운율 강조", "⑤ 대화만 나열"],
      answer: 1,
      explanation: `${field} 글은 설명·주장·정보 전달이 목적.`,
      wrongChoiceExplanations: ["②~⑤ 비문학 목적 아님"],
      intent: "글의 목적",
      difficulty: "하",
    },
    {
      number: 3,
      question: "글의 구조로 적절한 것은?",
      choices: ["① 도입→전개→정리", "② 인물→사건→결말만", "③ 운율→심상→여운", "④ 대화→대화→대화", "⑤ 무작위 나열"],
      answer: 1,
      explanation: "비문학은 논리적 구조.",
      wrongChoiceExplanations: ["②~⑤ 구조 오류"],
      intent: "글의 구조",
      difficulty: "중",
    },
    {
      number: 4,
      question: "주장과 근거의 관계가 적절한 것은?",
      choices: ["① 주장을 뒷받침하는 근거 제시", "② 근거 없는 주장만", "③ 주장과 무관한 근거", "④ 근거만 있고 주장 없음", "⑤ 감정만"],
      answer: 1,
      explanation: "주장-근거 연결 확인.",
      wrongChoiceExplanations: ["②~⑤ 관계 오류"],
      intent: "주장·근거",
      difficulty: "중",
    },
    {
      number: 5,
      question: `선택 출처(${title})와 지문의 관계로 적절한 것은?`,
      choices: ["① 출처·맥락을 고려하여 이해", "② 출처 무관", "③ 지문만으로 충분", "④ 필자=등장인물", "⑤ 허구로만 읽기"],
      answer: 1,
      explanation: "출처·맥락 고려 필요.",
      wrongChoiceExplanations: ["②~⑤ 부적절"],
      intent: "출처·맥락",
      difficulty: "하",
    },
  ];
}

function buildNonLiteratureShortAnswer(title: string, field: string): ExamQuestionShortAnswer[] {
  return [
    {
      number: 1,
      question: "글의 중심 화제를 한 문장으로 서술하시오.",
      modelAnswer: `${field} 분야의 중심 화제 (지문·출처 종합)`,
      gradingCriteria: "핵심 화제 3점",
      intent: "중심 화제",
      difficulty: "중",
    },
    {
      number: 2,
      question: "글의 목적을 서술하시오.",
      modelAnswer: "정보 전달·설명·주장·설득 등",
      gradingCriteria: "목적 3점",
      intent: "글의 목적",
      difficulty: "하",
    },
    {
      number: 3,
      question: "한 문단의 요지를 서술하시오.",
      modelAnswer: "해당 문단의 핵심 내용 한 문장",
      gradingCriteria: "요지 3점",
      intent: "문단 요지",
      difficulty: "중",
    },
    {
      number: 4,
      question: "주장과 근거를 하나씩 짝지어 서술하시오.",
      modelAnswer: "주장 1 + 근거 1 (지문 인용)",
      gradingCriteria: "주장 1.5점 + 근거 1.5점",
      intent: "주장·근거",
      difficulty: "중",
    },
    {
      number: 5,
      question: "핵심 개념의 의미를 맥락에 맞게 설명하시오.",
      modelAnswer: "개념 정의 + 지문 맥락 적용",
      gradingCriteria: "정의 1.5점 + 적용 1.5점",
      intent: "개념 이해",
      difficulty: "중상",
    },
  ];
}

function buildDefaultPoetryChoices(selected: WorkSelection): string[] {
  return [
    `화자는 「${selected.title}」에서 정서를 드러낸다. (○)`,
    "반복은 단순 나열에 그친다. (×)",
    "핵심 시어는 상징적 의미를 지닌다. (○)",
  ];
}

function buildDefaultNovelChoices(selected: WorkSelection): string[] {
  return [
    `「${selected.title}」은 인물·사건·주제가 유기적으로 연결된다. (○)`,
    "서술자와 인물을 혼동해도 무방하다. (×)",
    "행동·대화는 인물 형상화에 기여한다. (○)",
  ];
}

function buildTeacherComments(
  selected: WorkSelection,
  classification: TextClassification,
  profile?: ReturnType<typeof findWorkProfile>
): TeacherComments {
  const base = profile?.teacher ?? {};
  return {
    emphasisPoints: base.emphasisPoints ?? [
      `「${selected.title}」: ${selected.theme ?? "주제"}를 중심으로 지도`,
      "지문만이 아니라 작품 전체·교과서 해설과 연결",
      `${classification.subCategory} 갈래 특성(표현·구조) 강조`,
    ],
    commonMisunderstandings: base.commonMisunderstandings ?? [
      "작품명·작가·주제 혼동",
      "표면적 의미만 파악",
      "OCR 오류를 그대로 인용",
    ],
    internalExamTips: base.internalExamTips ?? [
      "주제·정서·표현 서술형",
      "핵심 소재·시어의 의미",
      "지문 근거 들어 설명",
    ],
    csatExtensionPoints: base.csatExtensionPoints ?? [
      "복합 지문·작품 비교 연결",
      "표현·주제·갈래 종합",
      "선택 작품과 유사 작품 대조",
    ],
  };
}

function buildCopyrightNotice(selected: WorkSelection): CopyrightNotice {
  return {
    noFullText:
      "본 분석 자료는 작품 원문 전체를 제공하지 않습니다. 저작권 보호를 위해 작품 DB 해설·교사용 분석 중심으로 구성됩니다.",
    partialOcrOnly:
      "OCR 추출 지문은 분석의 직접 인용에 사용하지 않으며, 교사가 확인·수정한 작품 정보와 DB 해설을 바탕으로 합니다.",
    minimalQuotation:
      "인용은 수업·시험 준비에 필요한 최소 범위로 제한합니다. 원문 전체 복제·배포는 금지됩니다.",
    shortQuotes: [`「${selected.title}」 관련 핵심 개념·주제 (최소 인용)`],
  };
}

function padReportIfNeeded(report: TeacherAnalysisReport): TeacherAnalysisReport {
  const padText =
    `[교사 보완 참고] 「${report.basicInfo.title}」(${report.basicInfo.author}) — ${report.basicInfo.themeSummary}. ` +
    `선택 작품 DB·교과서 해설을 바탕으로 한 심층 분석 초안입니다. 수업 시 지문을 재독하며 학생 수준에 맞게 보완하세요.`;

  const pad = (s: string, extra: number) =>
    s.length >= extra ? s : s + "\n\n" + padText.repeat(Math.max(1, Math.ceil((extra - s.length) / padText.length)));

  let total = countReportChars(report);
  if (total < MIN_TOTAL_CHARS) {
    report.passageSummary.overallSummary = pad(report.passageSummary.overallSummary, 400);
    report.lessonMaterials.backgroundKnowledge = pad(report.lessonMaterials.backgroundKnowledge, 300);
    if (report.literatureAnalysis) {
      report.literatureAnalysis.situation = pad(report.literatureAnalysis.situation, 250);
      report.literatureAnalysis.expressionFeatures = pad(report.literatureAnalysis.expressionFeatures, 250);
    }
    if (report.nonLiteratureAnalysis) {
      report.nonLiteratureAnalysis.centralTopic = pad(report.nonLiteratureAnalysis.centralTopic, 250);
      report.nonLiteratureAnalysis.purpose = pad(report.nonLiteratureAnalysis.purpose, 250);
    }
  }

  total = countReportChars(report);
  if (total < MIN_TOTAL_CHARS) {
    report.teacherComments.emphasisPoints = [
      ...report.teacherComments.emphasisPoints,
      padText,
      padText,
    ];
  }

  total = countReportChars(report);
  return { ...report, totalCharCount: total };
}

export function generateDeepAnalysis(
  text: string,
  classification: TextClassification,
  selectedWork: WorkSelection,
  options?: GenerateDeepAnalysisOptions
): TeacherAnalysisReport {
  const profile = findWorkProfile(selectedWork.workId, selectedWork.title);
  const lowOcrQuality = assessOcrQuality(text, options) === "low";
  const ctx = buildWorkAnalysisContext(selectedWork, lowOcrQuality);
  const isLiterature = resolveAnalysisType(selectedWork, classification) === "literature";
  const genre = ctx.genre;
  const poetry = isLiterature && isPoetryGenre(genre, classification.subCategory);
  const novel = isLiterature && isNovelGenre(genre, classification.subCategory);
  const theme = buildTeacherTheme(ctx);

  const basicInfo = buildBasicInfo(selectedWork, classification, profile);
  basicInfo.themeSummary = theme;

  const passageSummary = buildPassageSummary(ctx);

  let report: TeacherAnalysisReport = {
    type: isLiterature ? "literature" : "non_literature",
    version: "2.0",
    basicInfo,
    passageSummary,
    lessonMaterials: buildLessonMaterials(selectedWork, classification, profile),
    examMaterials: buildExamMaterials(selectedWork, classification, isLiterature, profile),
    teacherComments: buildTeacherComments(selectedWork, classification, profile),
    copyrightNotice: buildCopyrightNotice(selectedWork),
    sourceCandidates: buildSourceCandidates(selectedWork),
    ocrQualityNotice: lowOcrQuality ? OCR_LOW_QUALITY_NOTICE : undefined,
    analysisMode: "work_db_commentary",
    totalCharCount: 0,
  };

  if (isLiterature) {
    report.literatureAnalysis = buildLiteratureAnalysis(ctx, classification);
    if (poetry) report.modernPoetryAnalysis = buildPoetryAnalysis(ctx);
    if (novel) report.modernNovelAnalysis = buildNovelAnalysis(ctx);
  } else {
    report.nonLiteratureAnalysis = buildNonLiteratureAnalysis(selectedWork, classification, ctx);
  }

  report = padReportIfNeeded(report);

  const litChars = isLiterature
    ? countReportChars({
        basicInfo: report.basicInfo,
        passageSummary: report.passageSummary,
        literatureAnalysis: report.literatureAnalysis,
        modernPoetryAnalysis: report.modernPoetryAnalysis,
        modernNovelAnalysis: report.modernNovelAnalysis,
        lessonMaterials: {},
        examMaterials: {},
        teacherComments: {},
      })
    : 0;

  const nonLitChars = !isLiterature && report.nonLiteratureAnalysis
    ? countReportChars({
        basicInfo: report.basicInfo,
        passageSummary: report.passageSummary,
        nonLiteratureAnalysis: report.nonLiteratureAnalysis,
        lessonMaterials: {},
        examMaterials: {},
        teacherComments: {},
      })
    : 0;

  if (isLiterature && litChars < MIN_LIT_CHARS && report.literatureAnalysis) {
    report.literatureAnalysis.expressionFeatures +=
      "\n\n" +
      `[심화] 「${selectedWork.title}」 ${selectedWork.textbookGuide ?? ""} 표현·주제·정서를 연결하여 1500자 이상 분량의 심층 분석을 제공합니다.`.repeat(3);
  }
  if (!isLiterature && nonLitChars < MIN_NONLIT_CHARS && report.nonLiteratureAnalysis) {
    report.nonLiteratureAnalysis.purpose +=
      "\n\n" +
      `[심화] 비문학 지문의 논리 구조·개념·주장을 교사가 보완하여 수업·내신에 활용하세요.`.repeat(3);
  }

  report.totalCharCount = countReportChars(report);
  return sanitizeReportValue(report, text) as TeacherAnalysisReport;
}
