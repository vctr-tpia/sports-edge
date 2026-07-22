type FeaturePillProps = {
  label: string;
  value: string;
  tone?: "positive" | "neutral";
};

const toneClasses: Record<NonNullable<FeaturePillProps["tone"]>, string> = {
  positive: "bg-court/15 text-ink border-court/30",
  neutral: "bg-white/80 text-ink border-ink/10",
};

export function FeaturePill({
  label,
  value,
  tone = "neutral",
}: FeaturePillProps) {
  return (
    <div className={`rounded-full border px-4 py-2 text-sm ${toneClasses[tone]}`}>
      <span className="font-semibold">{value}</span> {label}
    </div>
  );
}
