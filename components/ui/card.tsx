import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export function Card({ className, elevated = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-panel border border-borderSubtle bg-surface1 text-ink shadow-panel",
        elevated && "shadow-card",
        className,
      )}
      {...props}
    />
  );
}
