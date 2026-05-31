"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-xl">
        <div>
          <p className="text-sm font-semibold text-primary">앱으로 설치</p>
          <p className="text-xs text-muted">홈 화면에 추가해 더 빠르게 사용하세요.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-lg px-3 py-2 text-xs text-muted"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={async () => {
              await deferredPrompt.prompt();
              await deferredPrompt.userChoice;
              setVisible(false);
              setDeferredPrompt(null);
            }}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white"
          >
            설치
          </button>
        </div>
      </div>
    </div>
  );
}
