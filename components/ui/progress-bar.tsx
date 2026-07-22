import { cn } from "@/src/lib/cn";

type ProgressBarProps = {
  value: number;
  tone?: "brand" | "positive" | "neutral";
  className?: string;
};

const toneClasses = {
  brand: "bg-brand",
  positive: "bg-court",
  neutral: "bg-neutral",
};

export function ProgressBar({ value, tone = "brand", className }: ProgressBarProps) {
  const width = `${Math.max(0, Math.min(100, value * 100))}%`;

  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-white/[0.06]", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", toneClasses[tone])}
        style={{ width }}
      />
    </div>
  );
}
