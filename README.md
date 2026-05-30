# 국어 지문 분석 — 교사용 MVP

교재·문제집·시험지 지문을 촬영하면 **GPT-4o Vision** 한 번의 호출로 텍스트 추출 → 문학/비문학 분류 → 출처 후보 → 수업 분석을 제공합니다.

## 시작하기

```bash
npm install
cp .env.example .env.local
# .env.local에 OPENAI_API_KEY 설정
npm run dev
```

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 키 (필수) | — |
| `OPENAI_VISION_MODEL` | Vision 통합 분석 모델 | `gpt-4o` |
| `OPENAI_MODEL` | 텍스트 재분석용 | `gpt-4o-mini` |
| `RAG_ENABLED` | 벡터 DB RAG | `false` |

## 처리 흐름

```
이미지 업로드 → POST /api/analyze (multipart)
  → GPT-4o Vision 단일 호출
    1. 텍스트 추출
    2. 문학/비문학 분류
    3. 작품명·출처 후보
    4. 교사용 분석
  → 결과 화면
```

## 아키텍처

```
src/lib/ai/vision-analyze.ts  # GPT-4o Vision 통합 분석
src/lib/ai/classify.ts        # 규칙 기반 분류 보정
src/lib/vision/validate.ts    # 추출·길이·신뢰도 검증
src/app/api/analyze/          # 이미지/텍스트 분석 API
```

## 저작권

- 원문 전체 미제공, 짧은 인용만 포함
- 모든 결과에 교사 검토·저작권 주의 표시
