import type { Disclaimer } from "@/types";

interface DisclaimerBannerProps {
  disclaimer: Disclaimer;
  compact?: boolean;
}

export function DisclaimerBanner({ disclaimer, compact }: DisclaimerBannerProps) {
  const items = [
    { icon: "🎯", text: disclaimer.sourceAccuracy, color: "border-warning/30 bg-amber-50" },
    { icon: "©", text: disclaimer.copyrightNotice, color: "border-primary/20 bg-blue-50" },
    { icon: "✓", text: disclaimer.teacherReviewRequired, color: "border-success/30 bg-emerald-50" },
  ];

  if (compact) {
    return (
      <div className="rounded-xl border border-warning/30 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-semibold">⚠️ 교사 검토 필수 · 저작권 주의 · 후보 정확도 한계</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.text.slice(0, 20)}
          className={`rounded-xl border p-3 text-xs leading-relaxed ${item.color}`}
        >
          <span className="mr-1.5">{item.icon}</span>
          {item.text}
        </div>
      ))}
    </div>
  );
}
