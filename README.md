# 국어 지문 분석 — 교사용 MVP

교재·문제집·시험지 지문을 촬영하면 OCR → 문학/비문학 분류 → 수업 분석을 제공하는 모바일 웹앱입니다.

## 시작하기

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 http://localhost:3000 을 열고, 모바일에서는 같은 Wi-Fi의 PC IP로 접속하세요.

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `OCR_PROVIDER` | `mock` 또는 `google-vision` | `mock` |
| `GOOGLE_CLOUD_VISION_API_KEY` | Google Cloud Vision API 키 | — |
| `AI_PROVIDER` | `mock` 또는 `openai` | `mock` |
| `OPENAI_API_KEY` | OpenAI API 키 | — |
| `OPENAI_MODEL` | 사용 모델 | `gpt-4o-mini` |
| `RAG_ENABLED` | 벡터 DB RAG 활성화 | `false` |

API 키는 **서버 환경 변수**에만 설정하세요. 프론트엔드에 노출되지 않습니다.

## 아키텍처

```
src/
├── app/
│   ├── api/ocr/       # OCR (서버)
│   ├── api/analyze/   # AI 분석 (서버)
│   └── api/export/    # PDF/HWP 내보내기
├── lib/
│   ├── ocr/           # OCR Provider 추상화
│   ├── ai/            # AI 분석
│   ├── rag/           # RAG/벡터DB 확장 포인트
│   └── export/        # PDF·HWP 구조
└── components/        # 모바일 UI
```

### OCR 추상화

`OcrProvider` 인터페이스로 Google Vision 외 다른 OCR API 추가 가능.

### RAG 확장

`VectorStore` 인터페이스를 Pinecone, Qdrant, Supabase pgvector 등으로 교체하면 교과서/문학작품 DB 연동 가능.

### 내보내기

- **PDF**: jsPDF로 즉시 다운로드
- **HWP**: 한글 SDK 연동용 JSON 구조 (MVP)

## 저작권

- 원문 전체 미제공, 짧은 인용(50자 이내)만 포함
- 모든 결과에 교사 검토·저작권 주의 표시

## MVP 제한

- Mock 모드: API 키 없이 데모 분석 가능
- HWP는 JSON 구조만 제공 (실제 .hwp 변환은 추후)
- RAG는 MockVectorStore (RAG_ENABLED=true 시 데모 데이터)
