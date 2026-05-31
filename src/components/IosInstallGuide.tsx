"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "pwa-ios-install-dismissed";

function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isSafariBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/.test(ua);
  return isSafari || isIosDevice();
}

export function IosInstallGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosDevice() || !isSafariBrowser() || isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const timer = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-lg rounded-2xl border border-white/20 bg-[#1e3a5f]/95 p-4 text-white shadow-2xl backdrop-blur-md">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">iPhone 홈 화면에 추가</p>
            <p className="mt-1 text-xs text-white/75">
              앱처럼 빠르게 실행하고 오프라인 캐시를 사용할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "1");
              setVisible(false);
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-white/70 hover:bg-white/10"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <ol className="space-y-2 text-xs leading-relaxed text-white/90">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold">
              1
            </span>
            <span>
              Safari 하단의 <strong className="text-white">공유</strong> 버튼
              <span className="mx-1 inline-block rounded bg-white/15 px-1.5 py-0.5">□↑</span>
              을 누릅니다.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold">
              2
            </span>
            <span>
              <strong className="text-white">홈 화면에 추가</strong>를 선택합니다.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold">
              3
            </span>
            <span>
              이름 <strong className="text-white">국어 분석</strong> 확인 후{" "}
              <strong className="text-white">추가</strong>를 누릅니다.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
