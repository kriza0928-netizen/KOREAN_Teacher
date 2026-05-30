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
          교재, 문제집, 프린트, 시험지의 지문을 촬영하세요. GPT-4o Vision이 텍스트 추출·분류·분석을 한 번에 처리합니다.
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

      <div className="rounded-xl bg-white/60 p-3 text-xs text-muted">
        <p>💡 팁: 지문만 선명하게, 그림자 없이 촬영하면 OCR 정확도가 높아집니다.</p>
      </div>
    </div>
  );
}
