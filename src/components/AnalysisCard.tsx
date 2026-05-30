interface AnalysisCardProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  variant?: "default" | "literature" | "non-literature" | "warning";
}

const VARIANT_STYLES = {
  default: "border-border",
  literature: "border-literature/30 bg-purple-50/50",
  "non-literature": "border-non-literature/30 bg-cyan-50/50",
  warning: "border-warning/30 bg-amber-50/50",
};

export function AnalysisCard({
  title,
  icon,
  children,
  variant = "default",
}: AnalysisCardProps) {
  return (
    <div
      className={`animate-fade-in rounded-2xl border bg-card p-4 shadow-sm ${VARIANT_STYLES[variant]}`}
    >
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

export function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

export function BulletList({
  items,
  editable,
  onChange,
}: {
  items: string[];
  editable?: boolean;
  onChange?: (items: string[]) => void;
}) {
  if (editable && onChange) {
    return (
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i}>
            <input
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm"
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}
