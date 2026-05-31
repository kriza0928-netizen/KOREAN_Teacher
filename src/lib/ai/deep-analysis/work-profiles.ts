import type {
  ExamMaterials,
  LessonMaterials,
  LiteratureDetailedAnalysis,
  ModernNovelAnalysis,
  ModernPoetryAnalysis,
  TeacherComments,
} from "@/types/analysis-report";

/** 작품별 심층 분석 보강 데이터 (DB workId 또는 제목 매칭) */
export interface WorkProfile {
  workIds?: string[];
  titleIncludes?: string[];
  curriculumArea?: string;
  difficulty?: string;
  literature?: Partial<LiteratureDetailedAnalysis>;
  poetry?: Partial<ModernPoetryAnalysis>;
  novel?: Partial<ModernNovelAnalysis>;
  lesson?: Partial<LessonMaterials>;
  exam?: Partial<ExamMaterials>;
  teacher?: Partial<TeacherComments>;
  contextBeforeAfter?: string;
  positionInWork?: string;
}

export const WORK_PROFILES: WorkProfile[] = [
  {
    workIds: ["work-014"],
    titleIncludes: ["운수 좋은 날", "운수좋은날"],
    curriculumArea: "현대소설 · 서민 문학 · 단편소설",
    difficulty: "중 (인물·정서·상징 연결 필요)",
    contextBeforeAfter:
      "이 지문은 김첨지가 운수 좋은 날 설렁탕을 사 오는 과정과, 집에 돌아와 아내의 죽음을 알게 되는 장면 전후에 해당한다. 앞부분에서는 가난 속에서도 아내를 생각하는 김첨지의 애정과 소박한 기쁨이 드러나고, 뒷부분에서는 죽음과 대면하며 정서가 급격히 전환된다.",
    positionInWork:
      "작품 후반부의 클라이맥스에 해당하는 장면으로, '운수 좋은 날'이라는 아이러니와 아내의 죽음이 대비되며 주제가 압축적으로 드러난다.",
    literature: {
      speaker: "3인칭 제한 시점의 서술자가 김첨지의 행동·심리를 따라가며 서술한다. 서술자는 김첨지의 내면을 간접적으로 드러내고, 대화와 행동을 통해 인물의 성격과 정서를 보여 준다.",
      centralSubject: "인력거꾼 김첨지와 그의 아내. 김첨지는 가난하지만 아내를 깊이 사랑하는 인물이며, 아내는 병든 채 집에서 김첨지를 기다리는 존재로 그려진다.",
      situation:
        "운수 좋은 날, 김첨지는 평소보다 많은 수입을 올리고 설렁탕을 사 오려 한다. 집으로 돌아가는 길과 집 안에서 아내의 죽음을 접하는 상황이 전개된다.",
      emotionAndAttitude:
        "앞부분: 소박한 기쁨, 아내에 대한 애정, 설렁탕을 사 오려는 정성. 뒷부분: 충격, 슬픔, 말문이 막힌 상태, 죽은 아내를 대하는 애틋함과 허무.",
      themeConsciousness:
        "가난한 서민의 삶, 부부의 애정, 죽음 앞에서의 인간적 연민, '운수 좋은 날'이라는 표제와 실제 상황의 아이러니를 통한 허무·비극.",
      conflictStructure:
        "외적 갈등: 가난과 생계의 어려움. 내적 갈등: 기쁨과 슬픔의 대립, 삶에 대한 미약한 희망과 죽음의 현실. 구조적 아이러니: 운수 좋은 날 ↔ 아내의 죽음.",
      characterRelations:
        "김첨지↔아내: 깊은 애정과 의존 관계. 김첨지↔사회: 인력거꾼으로서의 열등한 경제적 위치. 서술자↔김첨지: 동정적·관찰적 시선.",
      expressionFeatures:
        "대화를 통한 인물 성격 드러내기, 행동·세부 묘사(설렁탕, 인력거 등), 상징적 소재 활용, 점층적 정서 전개, 제목과 내용의 아이러니.",
      symbolicMaterials:
        "설렁탕: 아내에 대한 사랑·정성·가난 속 소박한 기쁨. 인력거: 서민의 생계·노동. '운수 좋은 날': 표면적 행운과 실제 비극의 대비.",
      keyVocabulary:
        "김첨지(주인공), 설렁탕(정성·사랑의 상징), 인력거(서민 노동), '왜 먹지를 못하니'(아내에 대한 애정·슬픔의 대표 대사).",
      repetitionEffect:
        "'운수 좋은 날'의 반복은 아이러니를 강화한다. 아내를 부르거나 대하는 표현의 반복은 애정과 슬픔을 누적시킨다.",
      moodAndTone:
        "앞부분: 담담하면서도 따뜻한 톤. 뒷부분: 슬프고 무거운 분위기. 전체적으로 서민적·写實적 어조.",
      studentConfusionPoints: [
        "제목 '운수 좋은 날'이 긍정적 의미만 있는 것으로 오해하는 경우",
        "김첨지의 정서 변화(기쁨→충격→슬픔)를 한 번에 파악하지 못하는 경우",
        "설렁탕을 단순 음식으로만 이해하고 상징적 의미를 놓치는 경우",
        "3인칭 시점에서 서술자와 김첨지를 혼동하는 경우",
      ],
      examFocusPoints: [
        "김첨지의 성격과 정서 변화",
        "설렁탕·인력거·'운수 좋은 날'의 상징적 의미",
        "대화와 행동을 통한 인물 형상화",
        "제목과 내용의 아이러니, 주제 의식",
      ],
    },
    novel: {
      characters:
        "김첨지: 가난하지만 성실하고 아내를 깊이 사랑하는 인력거꾼. 아내: 병든 채 집에서 남편을 기다리다 죽음. 두 인물 모두 서민 계층의 비애를 대표한다.",
      events:
        "운수 좋은 날 수입 → 설렁탕 구입 → 귀가 → 아내의 죽음 발견 → 슬픔과 대면. 사건은 단순하지만 정서 변화가 핵심이다.",
      setting: "1920년대 경성(서울) 일대, 인력거꾼의 거리와 가난한 서민의 집.",
      conflict: "경제적 가난 vs 부부의 애정, 기쁨 vs 죽음, 희망 vs 허무.",
      pointOfView: "3인칭 제한 시점. 김첨지의 행동·대화·심리를 중심으로 서술.",
      narrativeFeatures:
        "행동·대화 중심 서사, 점진적 정서 고조, 상징적 소재(설렁탕)의 기능, 클라이맥스에서 주제 압축.",
      characterPsychology:
        "김첨지: 아내를 향한 애정, 가난 속 소박한 기쁨, 죽음 앞의 충격과 슬픔. '왜 먹지를 못하니'는 애정과 안타까움이 응축된 심리.",
      dialogueAndAction:
        "대화는 김첨지의 성격과 아내와의 관계를 드러낸다. 설렁탕을 사 오는 행동은 정성과 사랑의 구체적 표현이다.",
      foreshadowing: "아내의 병·쇠약한 상태, 가난한 생활은 죽음에 대한 암시. '운수 좋은 날'이라는 표현 자체가 아이러니적 복선.",
      sceneFunction:
        "설렁탕 장면: 애정·정성 강조. 죽음 발견 장면: 주제·정서의 절정. 두 장면의 대비가 작품 전체를 관통한다.",
      endingAndTheme:
        "아내의 죽음을 접한 김첨지의 슬픔 속에서, 가난한 서민의 삶과 인간적 애정, 죽음 앞의 허무가 드러난다.",
      possibleChoices: [
        "김첨지가 설렁탕을 사 온 이유는 자신의 기쁨 때문이다. (× → 아내에 대한 정성)",
        "이 작품은 1인칭 주인공 시점으로 서술된다. (× → 3인칭)",
        "'운수 좋은 날'은 표면과 실제가 대비되는 아이러니를 형성한다. (○)",
        "설렁탕은 단순한 음식 묘사에 그친다. (× → 상징적 소재)",
      ],
    },
    lesson: {
      introQuestions: [
        "'운수 좋은 날'이라는 표현을 들으면 어떤 기분이 드나요? 제목만 보고 작품 내용을 예측해 봅시다.",
        "여러분이 가장 소중한 사람에게 선물을 준비한다면 어떤 마음일까요?",
      ],
      backgroundKnowledge:
        "1920년대 경성, 일제강점기 서민의 생활, 인력거·설렁탕 등 시대적 배경, 현진건과 1920년대 단편소설(写實主義·민족 문학)을 간략히 소개한다.",
      performanceAssessmentIdeas: [
        "김첨지의 하루를 일기 형식으로 재구성하기",
        "설렁탕·인력거·'운수 좋은 날' 중 하나를 주제로 상징 포스터 만들기",
        "대화 장면을 역할극으로 재현하고 인물 심리 설명하기",
      ],
    },
    teacher: {
      emphasisPoints: [
        "제목과 내용의 아이러니를 반드시 연결해 지도한다.",
        "설렁탕을 '정성·사랑'의 상징으로 읽는 연습을 한다.",
        "김첨지의 정서 변화를 시간 순서대로 추적하는 활동을 넣는다.",
      ],
      commonMisunderstandings: [
        "운수 좋은 날=행복한 하루로만 이해",
        "현진건=민족 저항만 강조하고 서민 문학적 측면 간과",
        "비극=슬프기만 한 글로 단순화",
      ],
      internalExamTips: [
        "인물의 성격·정서·행동 연결 서술형",
        "상징적 소재(설렁탕)의 의미",
        "제목의 기능(아이러니)",
      ],
      csatExtensionPoints: [
        "서민 소설의 写實性과 상징 읽기",
        "대화·행동을 통한 인물 형상화",
        "표제의 함축적 의미",
      ],
    },
  },
  {
    workIds: ["work-029"],
    titleIncludes: ["님의 침묵", "님의침묵"],
    curriculumArea: "현대시 · 저항·초월의 서정 · 한용운",
    difficulty: "중상 (상징·주제·화자 정서 종합)",
    contextBeforeAfter:
      "시 전반에 걸쳐 떠나간 '님'을 향한 그리움과 이별의 정서가 누적되며, 자연 이미지(산빛·단풍·길·미풍)를 통해 떠남과 추억이 시적으로 형상화된다.",
    positionInWork:
      "대표 구절은 작품의 이별·그리움·초월 의지를 응축적으로 보여 주며, 수업에서는 화자·정서·상징·주제를 연결해 지도한다.",
    literature: {
      speaker:
        "1인칭 화자. 사랑하는 '님'과의 이별을 받아들이면서도 그리움과 희망을 동시에 드러낸다.",
      centralSubject: "떠나간 '님'과 화자의 그리움. '님'은 연인·이상·조국 등 다층적으로 해석될 수 있다.",
      situation:
        "화자는 떠나간 님을 회상하며 이별의 슬픔을 표현하고 있다. 단풍·산빛·길·미풍의 이미지 속에서 떠남과 추억이 전개된다.",
      emotionAndAttitude:
        "그리움, 비애, 경건함, 이별의 슬픔과 함께 새로운 희망을 향한 의지가 공존한다.",
      themeConsciousness:
        "이별의 슬픔을 극복하고 새로운 희망을 추구하려는 의지. 이별과 초월, 절대자 탐색, 역설적 사랑.",
      conflictStructure:
        "떠남과 그리움, 침묵과 울림, 상실과 희망의 대립·긴장.",
      characterRelations: "화자↔님: 사랑·그리움·이별. 화자↔자연: 산빛·단풍·미풍을 통한 정서의 투영.",
      expressionFeatures:
        "자연 이미지의 상징화, 반복, 절제된 서정, 이별의 미학, 침묵 속의 울림.",
      symbolicMaterials: "님, 침묵, 산빛, 단풍, 길, 미풍 — 이별·그리움·떠남·희망과 연결.",
      keyVocabulary: "님, 침묵, 산빛, 단풍, 미풍, 이별, 사랑, 그리움",
      repetitionEffect: "'님', '갔습니다' 등 반복은 그리움과 이별의 정서를 누적·강화한다.",
      moodAndTone: "비애·그리움·경건함이 어우러진 절제된 서정적 분위기.",
      studentConfusionPoints: [
        "'님'을 연인으로만 이해하는 경우",
        "OCR 오류를 그대로 인용하는 경우",
        "자연 이미지를 장식으로만 읽는 경우",
      ],
      examFocusPoints: [
        "화자의 정서와 태도",
        "님·침묵·자연 이미지의 상징",
        "이별·희망·초월의 주제",
        "표현법과 정서·주제의 연결",
      ],
    },
    poetry: {
      speakerSituation: "사랑하는 님과 이별한 화자. 그리움과 희망을 동시에 품은 시적 상황.",
      attitudeToSubject: "떠나간 님에 대한 그리움, 슬픔, 그리고 새로운 희망을 향한 의지.",
      poeticSituation: "화자는 떠나간 님을 회상하며 이별의 슬픔을 표현하고 있다.",
      emotionalChange: "그리움·비애 → 이별의 수용 → 희망·초월 의지로 정서가 전개된다.",
      imageryDevelopment: "산빛·단풍·길·미풍의 자연 이미지를 따라 떠남과 추억이 전개된다.",
      stanzaSummaries: [
        "1연: 님의 떠남과 화자의 그리움 제시",
        "2연: 자연 이미지를 통한 이별·추억의 심화",
        "3연: 이별의 슬픔과 희망·초월 의지의 응축",
      ],
      keyWordInterpretations: [
        "님: 사랑·이상·그리움의 대상",
        "침묵: 말하지 못하는 정서·초월",
        "산빛·단풍·미풍: 떠남·추억·희망의 이미지",
      ],
      imagery: "산빛, 단풍, 작은 길, 미풍 — 떠남·그리움·희망의 심상.",
      metaphorAndSymbol: "자연 이미지를 통해 이별·그리움·희망을 상징적으로 드러낸다.",
      repetitionAndParallelism: "핵심 시어의 반복으로 정서·주제를 강화한다.",
      rhetoricalDevices: "상징, 반복, 절제된 서정, 자연 이미지의 은유.",
      theme: "이별의 슬픔을 극복하고 새로운 희망을 추구하려는 의지",
      possibleChoices: [
        "화자는 님의 떠남을 그리움과 희망으로 받아들인다. (○)",
        "이 작품은 유머와 풍자만을 목적으로 한다. (×)",
        "자연 이미지는 주제·정서와 연결된다. (○)",
      ],
    },
    lesson: {
      introQuestions: [
        "'님'이라는 말을 들으면 어떤 정서가 떠오르나요?",
        "이별을 다룬 다른 작품과 비교해 보면 어떤 공통점이 있을까요?",
      ],
      backgroundKnowledge:
        "한용운, 「님의 침묵」, 「만세전」, 일제강점기 저항·초월의 서정, '님'의 다층적 의미(연인·이상·조국)를 간략히 소개한다.",
    },
    teacher: {
      emphasisPoints: [
        "OCR 원문 반복보다 작품 DB 해설·주제·정서 중심으로 지도",
        "'님'·침묵·자연 이미지의 상징적 의미 연결",
        "이별·그리움·희망의 정서 변화 추적",
      ],
      commonMisunderstandings: [
        "OCR 오류를 그대로 인용",
        "'님'을 연인으로만 단정",
        "자연 묘사를 장식으로만 이해",
      ],
    },
  },
  {
    titleIncludes: ["초혼"],
    curriculumArea: "현대시 · 서정시 · 김소월",
    difficulty: "중 (화자·정서·표현법 종합)",
    contextBeforeAfter:
      "죽은 연인의 이름을 부르며 그리움을 노래하는 시 전체 맥락 속에서, 반복되는 호명과 이별의 정서가 누적된다.",
    positionInWork: "시 전체가 죽은 연인에 대한 그리움을 반복·심화시키는 구조이며, 각 연은 정서의 절정을 향해 전개된다.",
    literature: {
      speaker: "죽은 연인을 그리워하는 1인칭 화자. 직접적인 자아 드러남(나)과 연인에 대한 호명이 교차한다.",
      centralSubject: "죽은 연인(이름·그리움의 대상). '이름' 자체가 중심 소재이자 상징.",
      situation: "연인과의 이별(죽음) 이후, 화자가 허공 속에서 이름을 부르며 그리움을 노래하는 시적 상황.",
      emotionAndAttitude: "애틋함, 슬픔, 그리움, 허무, 이별의 절망. 이름을 부르는 행위에 애정과 고통이 응축.",
      themeConsciousness: "죽음과 이별, 그리움, 사랑의 지속, 허무와 절망.",
      conflictStructure: "살아 있음 vs 죽음, 부름 vs 응답 없음, 가까움 vs 멀어짐(하늘과 땅).",
      characterRelations: "화자↔죽은 연인: 사랑과 그리움. 화자↔세계: 고립·허무.",
      expressionFeatures: "반복, 대구, 상징(이름·허공), 의인법, 강한 정서적 어조.",
      symbolicMaterials: "이름: 사랑·기억·그리움. 허공: 이별·단절. 하늘과 땅: 거리·절망.",
      keyVocabulary: "이름, 허공, 부르다, 부서지다, 하늘과 땅 — 각 시어가 이별·그리움과 연결.",
      repetitionEffect: "'이름이여' 등 반복은 그리움을 강화하고 정서를 누적시킨다.",
      moodAndTone: "애상적·서정적·절절한 분위기.",
      studentConfusionPoints: [
        "화자=작가 혼동",
        "반복=단순 나열로만 이해",
        "이름=고유명사만으로 파악",
      ],
      examFocusPoints: [
        "화자의 정서와 태도",
        "반복·대구·상징",
        "주제(그리움·이별)",
      ],
    },
    poetry: {
      speakerSituation: "죽은 연인을 그리워하는 화자. 이별 후 고독한 시적 상황.",
      attitudeToSubject: "연인에 대한 깊은 애정, 그리움, 이름을 부르고 싶은 간절함.",
      poeticSituation: "허공 속에서 이름을 부르며 그리움을 노래하는 상황.",
      emotionalChange: "부름→절망→허무로 정서가 심화.",
      imageryDevelopment: "이름→허공→하늘과 땅으로 공간·정서 확장.",
      stanzaSummaries: [
        "1연: 죽은 연인의 이름을 부르며 그리움 표출",
        "2연: 이름을 부르는 행위와 화자의 정서 심화",
        "3연: 이별·단절·허무의 정서 절정",
      ],
      keyWordInterpretations: [
        "이름: 사랑·기억·그리움의 상징",
        "허공: 응답 없는 이별·단절",
        "하늘과 땅: 거리·절망·이별",
      ],
      imagery: "허공, 하늘과 땅, 부서진 이름 — 이별·그리움의 심상.",
      metaphorAndSymbol: "이름=사랑·기억, 허공=단절, 부서짐=이별의 고통.",
      repetitionAndParallelism: "'~이여' 반복, 대구를 통한 정서 강화.",
      rhetoricalDevices: "반복, 대구, 의인법, 영탄(여), 상징.",
      theme: "죽은 연인에 대한 그리움과 이별의 슬픔, 허무.",
      possibleChoices: [
        "화자는 연인에 대한 분노를 드러낸다. (× → 그리움)",
        "반복은 정서를 강화하는 기능을 한다. (○)",
        "이름은 단순 고유명사일 뿐이다. (× → 상징)",
      ],
    },
  },
];

export function findWorkProfile(workId?: string, title?: string): WorkProfile | undefined {
  const normalizedTitle = title?.replace(/\s/g, "") ?? "";
  return WORK_PROFILES.find((p) => {
    if (workId && p.workIds?.includes(workId)) return true;
    if (title && p.titleIncludes?.some((t) => title.includes(t) || normalizedTitle.includes(t.replace(/\s/g, ""))))
      return true;
    return false;
  });
}
