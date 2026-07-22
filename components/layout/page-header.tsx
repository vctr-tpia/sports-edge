import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/src/lib/cn";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  actionHref,
  actionLabel,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "rounded-hero border border-borderSubtle bg-surface1 p-6 shadow-panel sm:p-8",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-inkMuted">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-balance text-[2rem] font-semibold tracking-[-0.05em] text-ink sm:text-[2.5rem]">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-inkSecondary sm:text-base">
            {description}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          {actionHref && actionLabel ? (
            <ButtonLink href={actionHref} variant="primary">
              {actionLabel}
            </ButtonLink>
          ) : null}
          {actions}
        </div>
      </div>
    </section>
  );
}
