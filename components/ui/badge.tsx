import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

type BadgeTone = "neutral" | "brand" | "positive" | "warning" | "danger";

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: "border-borderSubtle bg-surface3 text-inkSecondary",
  brand: "border-transparent bg-[linear-gradient(90deg,var(--accent-blue)_0%,#2a88f0_100%)] text-white",
  positive:
    "border-[color:var(--accent-lime)] bg-[color:var(--accent-green-dark)] text-[var(--accent-lime)]",
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
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        badgeToneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
