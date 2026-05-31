import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#1e3a5f] px-6 text-center text-white">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-3xl font-bold">
        국
      </div>
      <h1 className="text-xl font-bold">오프라인 상태입니다</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
        네트워크 연결을 확인한 뒤 다시 시도해 주세요. 설치된 앱은 연결이 복구되면 자동으로
        갱신됩니다.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-[#c45c26] px-6 py-3 text-sm font-semibold text-white"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
