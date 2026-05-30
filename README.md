# 국어 지문 분석 — 교사용 무료 MVP

교재·시험지 지문을 촬영하면 **브라우저 Tesseract.js OCR** → 텍스트 수정 → **규칙 기반 분석 초안**을 제공합니다. API 키가 필요 없습니다.

## 시작하기

```bash
npm install
npm run dev
```

`.env.local`은 **선택 사항**입니다. 유료 API 연동 시에만 설정하세요.

## 무료 버전 기능

- Tesseract.js 한글 OCR (브라우저)
- OCR 텍스트 직접 수정
- 규칙 기반 문학/비문학 분류
- 자동 분석 초안 (교사 수정 가능)
- 작품명·작가·출처 직접 입력

## 유료 API 연동 (추후)

Provider 구조로 확장 가능:

| Provider | 환경 변수 |
|----------|-----------|
| OCR Google Vision | `OCR_PROVIDER=google-vision`, `GOOGLE_CLOUD_VISION_API_KEY` |
| 분석 OpenAI Vision | `ANALYSIS_PROVIDER=openai`, `OPENAI_API_KEY` |

## 처리 흐름

```
촬영 → Tesseract OCR → 텍스트·작품명 수정 → 규칙 기반 분석 초안 → 교사 편집 → PDF/HWP
```
