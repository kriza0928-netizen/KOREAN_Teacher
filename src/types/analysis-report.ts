import type { SourceCandidate } from "@/types";

/** 1. 작품 기본 정보 */
export interface WorkBasicInfo {
  title: string;
  author: string;
  genre: string;
  era: string;
  curriculumArea: string;
  themeSummary: string;
  difficulty: string;
}

/** 2. 지문 요약 */
export interface PassageSummary {
  overallSummary: string;
  sceneDescription: string;
  contextBeforeAfter: string;
  importantParts: string[];
}

/** 3. 문학 작품 분석 */
export interface LiteratureDetailedAnalysis {
  speaker: string;
  centralSubject: string;
  situation: string;
  emotionAndAttitude: string;
  themeConsciousness: string;
  conflictStructure: string;
  characterRelations: string;
  expressionFeatures: string;
  symbolicMaterials: string;
  keyVocabulary: string;
  repetitionEffect: string;
  moodAndTone: string;
  positionInWork: string;
  studentConfusionPoints: string[];
  examFocusPoints: string[];
}

/** 4. 현대시 분석 */
export interface ModernPoetryAnalysis {
  speakerSituation: string;
  attitudeToSubject: string;
  poeticSituation: string;
  emotionalChange: string;
  imageryDevelopment: string;
  stanzaSummaries: string[];
  keyWordInterpretations: string[];
  imagery: string;
  metaphorAndSymbol: string;
  repetitionAndParallelism: string;
  rhetoricalDevices: string;
  theme: string;
  possibleChoices: string[];
}

/** 5. 현대소설 분석 */
export interface ModernNovelAnalysis {
  characters: string;
  events: string;
  setting: string;
  conflict: string;
  pointOfView: string;
  narrativeFeatures: string;
  characterPsychology: string;
  dialogueAndAction: string;
  foreshadowing: string;
  sceneFunction: string;
  endingAndTheme: string;
  possibleChoices: string[];
}

/** 6. 비문학 분석 */
export interface NonLiteratureDetailedAnalysis {
  centralTopic: string;
  purpose: string;
  paragraphSummaries: { paragraph: number; summary: string }[];
  structure: string;
  keyConcepts: string[];
  claimsAndEvidence: { claim: string; evidence: string }[];
  comparisonContrast: string;
  causeEffect: string;
  problemSolution: string;
  difficultConcepts: string[];
  examFocusPoints: string[];
}

/** 7. 수업 활용 자료 */
export interface LessonMaterials {
  introQuestions: string[];
  backgroundKnowledge: string;
  studentGuidingQuestions: string[];
  discussionQuestions: string[];
  boardSummary: string[];
  performanceAssessmentIdeas: string[];
}

/** 8. 시험 대비 자료 */
export interface ExamQuestionMultipleChoice {
  number: number;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
  wrongChoiceExplanations: string[];
  intent: string;
  difficulty: string;
}

export interface ExamQuestionShortAnswer {
  number: number;
  question: string;
  modelAnswer: string;
  gradingCriteria: string;
  intent: string;
  difficulty: string;
}

export interface ExamMaterials {
  multipleChoice: ExamQuestionMultipleChoice[];
  shortAnswer: ExamQuestionShortAnswer[];
}

/** 9. 교사용 코멘트 */
export interface TeacherComments {
  emphasisPoints: string[];
  commonMisunderstandings: string[];
  internalExamTips: string[];
  csatExtensionPoints: string[];
}

/** 10. 저작권 주의 */
export interface CopyrightNotice {
  noFullText: string;
  partialOcrOnly: string;
  minimalQuotation: string;
  shortQuotes: string[];
}

/** 통합 교사용 분석 리포트 */
export interface TeacherAnalysisReport {
  type: "literature" | "non_literature";
  version: "2.0";
  basicInfo: WorkBasicInfo;
  passageSummary: PassageSummary;
  literatureAnalysis?: LiteratureDetailedAnalysis;
  modernPoetryAnalysis?: ModernPoetryAnalysis;
  modernNovelAnalysis?: ModernNovelAnalysis;
  nonLiteratureAnalysis?: NonLiteratureDetailedAnalysis;
  lessonMaterials: LessonMaterials;
  examMaterials: ExamMaterials;
  teacherComments: TeacherComments;
  copyrightNotice: CopyrightNotice;
  sourceCandidates: SourceCandidate[];
  /** 생성된 전체 텍스트 분량 (검증용) */
  totalCharCount: number;
}
