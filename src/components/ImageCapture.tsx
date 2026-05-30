"use client";

import { useRef, useState } from "react";

interface ImageCaptureProps {
  onCapture: (file: File) => void;
  isLoading: boolean;
}

export function ImageCapture({ onCapture, isLoading }: ImageCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onCapture(file);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-primary">지문 촬영 또는 업로드</h2>
        <p className="mb-4 text-sm text-muted">
          교재·시험지 지문을 촬영하면 전처리(흑백·대비·크롭·확대) 후 Tesseract.js(kor+eng) OCR을 수행합니다.
        </p>

        {preview ? (
          <div className="mb-4 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="촬영 미리보기" className="max-h-64 w-full object-contain bg-gray-50" />
          </div>
        ) : (
          <div className="mb-4 flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-gray-50">
            <span className="text-4xl">📷</span>
            <p className="mt-2 text-sm text-muted">카메라 또는 갤러리에서 선택</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-xl bg-primary py-4 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            <span className="text-2xl">📸</span>
            카메라 촬영
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => uploadRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-primary bg-white py-4 text-sm font-medium text-primary transition active:scale-[0.98] disabled:opacity-50"
          >
            <span className="text-2xl">🖼️</span>
            갤러리 선택
          </button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <p className="font-semibold">📷 촬영 시 OCR 정확도를 높이려면</p>
        <ul className="space-y-1 pl-1">
          <li>• 지문만 선명하게, 그림자 없이 수평으로 촬영하세요.</li>
          <li>• 밝은 배경 위 검은 글씨가 가장 잘 인식됩니다.</li>
        </ul>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
        <p className="font-semibold">⚠️ OCR 실패 가능성이 높은 경우</p>
        <ul className="mt-2 space-y-1 pl-1">
          <li>• <strong>배경 이미지 위의 흰 글씨</strong> — 대비가 낮아 인식률이 크게 떨어집니다.</li>
          <li>• <strong>기울어진 사진</strong> — 텍스트 영역이 왜곡되어 오인식이 많습니다.</li>
          <li>• <strong>작은 글씨</strong> — 확대·전처리 후에도 정확도가 낮을 수 있습니다.</li>
        </ul>
        <p className="mt-2">
          위 경우에는 OCR 후 텍스트를 직접 수정·붙여넣기하거나, 선명한 사진으로 다시 촬영해 주세요.
        </p>
      </div>
    </div>
  );
}
