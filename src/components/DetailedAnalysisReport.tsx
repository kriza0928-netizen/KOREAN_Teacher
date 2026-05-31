"use client";

import type { TeacherAnalysisReport } from "@/types/analysis-report";
import { AnalysisCard, BulletList, LabelValue } from "./AnalysisCard";

function EditableField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          rows={4}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      )}
    </div>
  );
}

function EditableTextBlock({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return <EditableField label={label} value={value} onChange={onChange} multiline />;
}

interface DetailedAnalysisReportProps {
  report: TeacherAnalysisReport;
  onChange: (report: TeacherAnalysisReport) => void;
}

export function DetailedAnalysisReport({ report, onChange }: DetailedAnalysisReportProps) {
  const isLiterature = report.type === "literature";
  const lit = report.literatureAnalysis;
  const poetry = report.modernPoetryAnalysis;
  const novel = report.modernNovelAnalysis;
  const nonLit = report.nonLiteratureAnalysis;

  const update = (patch: Partial<TeacherAnalysisReport>) => onChange({ ...report, ...patch });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs text-primary">
        분석 분량: 약 {report.totalCharCount.toLocaleString()}자 · v{report.version} · 선택 작품 DB 기준 심층 분석
      </div>

      {/* 1. 작품 기본 정보 */}
      <AnalysisCard title="1. 작품 기본 정보" icon="📚" variant={isLiterature ? "literature" : "non-literature"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <LabelValue label="작품명" value={report.basicInfo.title} />
          <LabelValue label="작가" value={report.basicInfo.author} />
          <LabelValue label="갈래" value={report.basicInfo.genre} />
          <LabelValue label="시대" value={report.basicInfo.era} />
          <LabelValue label="수록 가능 영역" value={report.basicInfo.curriculumArea} />
          <LabelValue label="수업 난이도" value={report.basicInfo.difficulty} />
        </div>
        <EditableTextBlock
          label="핵심 주제 한 줄 요약"
          value={report.basicInfo.themeSummary}
          onChange={(v) =>
            update({ basicInfo: { ...report.basicInfo, themeSummary: v } })
          }
        />
      </AnalysisCard>

      {/* 2. 지문 요약 */}
      <AnalysisCard title="2. 지문 요약" icon="📝">
        <EditableTextBlock
          label="전체 내용 요약"
          value={report.passageSummary.overallSummary}
          onChange={(v) =>
            update({ passageSummary: { ...report.passageSummary, overallSummary: v } })
          }
        />
        <EditableTextBlock
          label="장면/상황 설명"
          value={report.passageSummary.sceneDescription}
          onChange={(v) =>
            update({ passageSummary: { ...report.passageSummary, sceneDescription: v } })
          }
        />
        <EditableTextBlock
          label="앞뒤 맥락 추정"
          value={report.passageSummary.contextBeforeAfter}
          onChange={(v) =>
            update({ passageSummary: { ...report.passageSummary, contextBeforeAfter: v } })
          }
        />
        <div>
          <p className="mb-2 text-xs font-medium text-muted">지문에서 중요한 부분</p>
          <BulletList
            items={report.passageSummary.importantParts}
            editable
            onChange={(items) =>
              update({ passageSummary: { ...report.passageSummary, importantParts: items } })
            }
          />
        </div>
      </AnalysisCard>

      {/* 3. 문학 작품 분석 */}
      {lit && (
        <AnalysisCard title="3. 문학 작품 분석" icon="📖" variant="literature">
          <div className="space-y-3">
            {(
              [
                ["화자 또는 서술자", "speaker"],
                ["중심 대상", "centralSubject"],
                ["상황", "situation"],
                ["정서와 태도", "emotionAndAttitude"],
                ["주제 의식", "themeConsciousness"],
                ["갈등 구조", "conflictStructure"],
                ["인물 관계", "characterRelations"],
                ["표현상 특징", "expressionFeatures"],
                ["상징적 소재", "symbolicMaterials"],
                ["시어/핵심 어휘 풀이", "keyVocabulary"],
                ["반복 표현의 효과", "repetitionEffect"],
                ["분위기와 어조", "moodAndTone"],
                ["작품 전체에서 이 지문의 위치", "positionInWork"],
              ] as const
            ).map(([label, key]) => (
              <EditableTextBlock
                key={key}
                label={label}
                value={lit[key]}
                onChange={(v) =>
                  update({
                    literatureAnalysis: { ...lit, [key]: v },
                  })
                }
              />
            ))}
            <div>
              <p className="mb-2 text-xs font-medium text-muted">학생들이 헷갈리는 포인트</p>
              <BulletList
                items={lit.studentConfusionPoints}
                editable
                onChange={(items) =>
                  update({ literatureAnalysis: { ...lit, studentConfusionPoints: items } })
                }
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">시험에 자주 나오는 포인트</p>
              <BulletList
                items={lit.examFocusPoints}
                editable
                onChange={(items) =>
                  update({ literatureAnalysis: { ...lit, examFocusPoints: items } })
                }
              />
            </div>
          </div>
        </AnalysisCard>
      )}

      {/* 4. 현대시 분석 */}
      {poetry && (
        <AnalysisCard title="4. 현대시 분석" icon="🌸" variant="literature">
          <div className="space-y-3">
            {(
              [
                ["화자의 처지", "speakerSituation"],
                ["대상에 대한 태도", "attitudeToSubject"],
                ["시적 상황", "poeticSituation"],
                ["정서 변화", "emotionalChange"],
                ["시상 전개 방식", "imageryDevelopment"],
                ["심상", "imagery"],
                ["비유와 상징", "metaphorAndSymbol"],
                ["반복과 대구", "repetitionAndParallelism"],
                ["설의/영탄/도치 등 표현법", "rhetoricalDevices"],
                ["주제", "theme"],
              ] as const
            ).map(([label, key]) => (
              <EditableTextBlock
                key={key}
                label={label}
                value={poetry[key]}
                onChange={(v) =>
                  update({ modernPoetryAnalysis: { ...poetry, [key]: v } })
                }
              />
            ))}
            <div>
              <p className="mb-2 text-xs font-medium text-muted">연별 핵심 내용</p>
              <BulletList
                items={poetry.stanzaSummaries}
                editable
                onChange={(items) =>
                  update({ modernPoetryAnalysis: { ...poetry, stanzaSummaries: items } })
                }
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">주요 시어 해석</p>
              <BulletList
                items={poetry.keyWordInterpretations}
                editable
                onChange={(items) =>
                  update({ modernPoetryAnalysis: { ...poetry, keyWordInterpretations: items } })
                }
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">출제 가능 선지</p>
              <BulletList
                items={poetry.possibleChoices}
                editable
                onChange={(items) =>
                  update({ modernPoetryAnalysis: { ...poetry, possibleChoices: items } })
                }
              />
            </div>
          </div>
        </AnalysisCard>
      )}

      {/* 5. 현대소설 분석 */}
      {novel && (
        <AnalysisCard title="5. 현대소설 분석" icon="📕" variant="literature">
          <div className="space-y-3">
            {(
              [
                ["인물", "characters"],
                ["사건", "events"],
                ["배경", "setting"],
                ["갈등", "conflict"],
                ["시점", "pointOfView"],
                ["서술상 특징", "narrativeFeatures"],
                ["인물의 심리", "characterPsychology"],
                ["대화와 행동의 의미", "dialogueAndAction"],
                ["복선", "foreshadowing"],
                ["장면의 기능", "sceneFunction"],
                ["결말과 주제", "endingAndTheme"],
              ] as const
            ).map(([label, key]) => (
              <EditableTextBlock
                key={key}
                label={label}
                value={novel[key]}
                onChange={(v) =>
                  update({ modernNovelAnalysis: { ...novel, [key]: v } })
                }
              />
            ))}
            <div>
              <p className="mb-2 text-xs font-medium text-muted">출제 가능 선지</p>
              <BulletList
                items={novel.possibleChoices}
                editable
                onChange={(items) =>
                  update({ modernNovelAnalysis: { ...novel, possibleChoices: items } })
                }
              />
            </div>
          </div>
        </AnalysisCard>
      )}

      {/* 6. 비문학 분석 */}
      {nonLit && (
        <AnalysisCard title="6. 비문학 분석" icon="📋" variant="non-literature">
          <div className="space-y-3">
            <EditableTextBlock
              label="중심 화제"
              value={nonLit.centralTopic}
              onChange={(v) =>
                update({ nonLiteratureAnalysis: { ...nonLit, centralTopic: v } })
              }
            />
            <EditableTextBlock
              label="글의 목적"
              value={nonLit.purpose}
              onChange={(v) =>
                update({ nonLiteratureAnalysis: { ...nonLit, purpose: v } })
              }
            />
            <EditableTextBlock
              label="글의 구조"
              value={nonLit.structure}
              onChange={(v) =>
                update({ nonLiteratureAnalysis: { ...nonLit, structure: v } })
              }
            />
            <EditableTextBlock
              label="비교/대조 관계"
              value={nonLit.comparisonContrast}
              onChange={(v) =>
                update({ nonLiteratureAnalysis: { ...nonLit, comparisonContrast: v } })
              }
            />
            <EditableTextBlock
              label="원인/결과 관계"
              value={nonLit.causeEffect}
              onChange={(v) =>
                update({ nonLiteratureAnalysis: { ...nonLit, causeEffect: v } })
              }
            />
            <EditableTextBlock
              label="문제/해결 구조"
              value={nonLit.problemSolution}
              onChange={(v) =>
                update({ nonLiteratureAnalysis: { ...nonLit, problemSolution: v } })
              }
            />
            <div>
              <p className="mb-2 text-xs font-medium text-muted">문단별 요지</p>
              {nonLit.paragraphSummaries.map((p, i) => (
                <EditableField
                  key={p.paragraph}
                  label={`${p.paragraph}문단`}
                  value={p.summary}
                  onChange={(v) => {
                    const summaries = [...nonLit.paragraphSummaries];
                    summaries[i] = { ...summaries[i], summary: v };
                    update({ nonLiteratureAnalysis: { ...nonLit, paragraphSummaries: summaries } });
                  }}
                  multiline
                />
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">핵심 개념</p>
              <BulletList
                items={nonLit.keyConcepts}
                editable
                onChange={(items) =>
                  update({ nonLiteratureAnalysis: { ...nonLit, keyConcepts: items } })
                }
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">주장과 근거</p>
              {nonLit.claimsAndEvidence.map((ce, i) => (
                <div key={i} className="mb-2 rounded-lg bg-white/80 p-3">
                  <EditableField
                    label="주장"
                    value={ce.claim}
                    onChange={(v) => {
                      const arr = [...nonLit.claimsAndEvidence];
                      arr[i] = { ...arr[i], claim: v };
                      update({ nonLiteratureAnalysis: { ...nonLit, claimsAndEvidence: arr } });
                    }}
                  />
                  <EditableField
                    label="근거"
                    value={ce.evidence}
                    onChange={(v) => {
                      const arr = [...nonLit.claimsAndEvidence];
                      arr[i] = { ...arr[i], evidence: v };
                      update({ nonLiteratureAnalysis: { ...nonLit, claimsAndEvidence: arr } });
                    }}
                    multiline
                  />
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">학생들이 어려워할 개념</p>
              <BulletList
                items={nonLit.difficultConcepts}
                editable
                onChange={(items) =>
                  update({ nonLiteratureAnalysis: { ...nonLit, difficultConcepts: items } })
                }
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">출제 포인트</p>
              <BulletList
                items={nonLit.examFocusPoints}
                editable
                onChange={(items) =>
                  update({ nonLiteratureAnalysis: { ...nonLit, examFocusPoints: items } })
                }
              />
            </div>
          </div>
        </AnalysisCard>
      )}

      {/* 7. 수업 활용 자료 */}
      <AnalysisCard title="7. 수업 활용 자료" icon="🎓">
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-medium text-muted">5분 도입 질문</p>
            <BulletList
              items={report.lessonMaterials.introQuestions}
              editable
              onChange={(items) =>
                update({ lessonMaterials: { ...report.lessonMaterials, introQuestions: items } })
              }
            />
          </div>
          <EditableTextBlock
            label="본문 읽기 전 배경지식"
            value={report.lessonMaterials.backgroundKnowledge}
            onChange={(v) =>
              update({ lessonMaterials: { ...report.lessonMaterials, backgroundKnowledge: v } })
            }
          />
          <div>
            <p className="mb-2 text-xs font-medium text-muted">학생 질문 유도 문항</p>
            <BulletList
              items={report.lessonMaterials.studentGuidingQuestions}
              editable
              onChange={(items) =>
                update({
                  lessonMaterials: { ...report.lessonMaterials, studentGuidingQuestions: items },
                })
              }
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted">토론 질문</p>
            <BulletList
              items={report.lessonMaterials.discussionQuestions}
              editable
              onChange={(items) =>
                update({
                  lessonMaterials: { ...report.lessonMaterials, discussionQuestions: items },
                })
              }
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted">판서용 핵심 정리</p>
            <BulletList
              items={report.lessonMaterials.boardSummary}
              editable
              onChange={(items) =>
                update({ lessonMaterials: { ...report.lessonMaterials, boardSummary: items } })
              }
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted">수행평가 아이디어</p>
            <BulletList
              items={report.lessonMaterials.performanceAssessmentIdeas}
              editable
              onChange={(items) =>
                update({
                  lessonMaterials: { ...report.lessonMaterials, performanceAssessmentIdeas: items },
                })
              }
            />
          </div>
        </div>
      </AnalysisCard>

      {/* 8. 시험 대비 자료 */}
      <AnalysisCard title="8. 시험 대비 자료" icon="📝" variant="warning">
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted">객관식 예상 문제 5개</p>
          {report.examMaterials.multipleChoice.map((q, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-4">
              <p className="font-semibold text-primary">
                {q.number}. {q.question}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {q.choices.map((c, j) => (
                  <li key={j} className={q.answer === j + 1 ? "font-semibold text-success" : ""}>
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                정답: {q.answer}번 · 난이도: {q.difficulty} · 출제 의도: {q.intent}
              </p>
              <EditableTextBlock
                label="해설"
                value={q.explanation}
                onChange={(v) => {
                  const mc = [...report.examMaterials.multipleChoice];
                  mc[i] = { ...mc[i], explanation: v };
                  update({ examMaterials: { ...report.examMaterials, multipleChoice: mc } });
                }}
              />
              <div className="mt-2">
                <p className="mb-1 text-xs font-medium text-muted">오답 선지 해설</p>
                <BulletList
                  items={q.wrongChoiceExplanations}
                  editable
                  onChange={(items) => {
                    const mc = [...report.examMaterials.multipleChoice];
                    mc[i] = { ...mc[i], wrongChoiceExplanations: items };
                    update({ examMaterials: { ...report.examMaterials, multipleChoice: mc } });
                  }}
                />
              </div>
            </div>
          ))}

          <p className="text-xs font-semibold text-muted">서술형 예상 문제 5개</p>
          {report.examMaterials.shortAnswer.map((q, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-4">
              <EditableTextBlock
                label={`${q.number}. 서술형`}
                value={q.question}
                onChange={(v) => {
                  const sa = [...report.examMaterials.shortAnswer];
                  sa[i] = { ...sa[i], question: v };
                  update({ examMaterials: { ...report.examMaterials, shortAnswer: sa } });
                }}
              />
              <EditableTextBlock
                label="모범 답안"
                value={q.modelAnswer}
                onChange={(v) => {
                  const sa = [...report.examMaterials.shortAnswer];
                  sa[i] = { ...sa[i], modelAnswer: v };
                  update({ examMaterials: { ...report.examMaterials, shortAnswer: sa } });
                }}
              />
              <EditableTextBlock
                label="채점 기준"
                value={q.gradingCriteria}
                onChange={(v) => {
                  const sa = [...report.examMaterials.shortAnswer];
                  sa[i] = { ...sa[i], gradingCriteria: v };
                  update({ examMaterials: { ...report.examMaterials, shortAnswer: sa } });
                }}
              />
              <p className="mt-1 text-xs text-muted">
                출제 의도: {q.intent} · 난이도: {q.difficulty}
              </p>
            </div>
          ))}
        </div>
      </AnalysisCard>

      {/* 9. 교사용 코멘트 */}
      <AnalysisCard title="9. 교사용 코멘트" icon="👩‍🏫">
        <div className="space-y-3">
          {(
            [
              ["강조할 점", "emphasisPoints"],
              ["자주 오해하는 부분", "commonMisunderstandings"],
              ["내신 출제 포인트", "internalExamTips"],
              ["수능형 확장", "csatExtensionPoints"],
            ] as const
          ).map(([label, key]) => (
            <div key={key}>
              <p className="mb-2 text-xs font-medium text-muted">{label}</p>
              <BulletList
                items={report.teacherComments[key]}
                editable
                onChange={(items) =>
                  update({ teacherComments: { ...report.teacherComments, [key]: items } })
                }
              />
            </div>
          ))}
        </div>
      </AnalysisCard>

      {/* 10. 저작권 주의 */}
      <AnalysisCard title="10. 저작권 주의" icon="⚖️" variant="warning">
        <EditableTextBlock
          label="원문 전체 미제공"
          value={report.copyrightNotice.noFullText}
          onChange={(v) =>
            update({ copyrightNotice: { ...report.copyrightNotice, noFullText: v } })
          }
        />
        <EditableTextBlock
          label="OCR 지문 일부만 활용"
          value={report.copyrightNotice.partialOcrOnly}
          onChange={(v) =>
            update({ copyrightNotice: { ...report.copyrightNotice, partialOcrOnly: v } })
          }
        />
        <EditableTextBlock
          label="최소 인용 원칙"
          value={report.copyrightNotice.minimalQuotation}
          onChange={(v) =>
            update({ copyrightNotice: { ...report.copyrightNotice, minimalQuotation: v } })
          }
        />
        <div>
          <p className="mb-2 text-xs font-medium text-muted">허용 인용 (최소 범위)</p>
          <BulletList items={report.copyrightNotice.shortQuotes} />
        </div>
      </AnalysisCard>
    </div>
  );
}
