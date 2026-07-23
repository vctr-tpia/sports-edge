import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export function Card({ className, elevated = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "dashboard-card rounded-[24px] text-ink",
        elevated && "shadow-card",
        className,
      )}
      {...props}
    />
  );
}
