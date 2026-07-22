import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

type BadgeTone = "neutral" | "brand" | "positive" | "warning" | "danger";

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: "border-borderSubtle bg-white/[0.04] text-inkSecondary",
  brand: "border-brand/25 bg-brandSoft text-ink",
  positive: "border-court/20 bg-court/10 text-court",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
        badgeToneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
