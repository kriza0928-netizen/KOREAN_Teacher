import type { WorkSelection } from "@/lib/literature/types";

interface SelectedWorkBannerProps {
  selection: WorkSelection;
}

export function SelectedWorkBanner({ selection }: SelectedWorkBannerProps) {
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-purple-50 p-5 shadow-sm">
      <p className="text-xs font-semibold text-primary">🎯 사용자가 선택한 작품</p>
      <p className="mt-2 text-xl font-bold text-primary">📖 {selection.title}</p>
      <p className="mt-1 text-base text-gray-800">✍ {selection.author}</p>
      {selection.genre && (
        <p className="mt-1 text-sm text-muted">갈래: {selection.genre}</p>
      )}
      {selection.matchScore !== undefined && selection.mode === "db" && (
        <p className="mt-1 text-xs text-muted">매칭 신뢰도 {selection.matchScore}%</p>
      )}
      {selection.mode === "manual" && (
        <p className="mt-1 text-xs text-muted">직접 입력 · {selection.source ?? "출처 미입력"}</p>
      )}
    </div>
  );
}
