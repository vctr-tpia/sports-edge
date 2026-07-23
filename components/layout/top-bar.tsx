import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type TopBarProps = {
  breadcrumbs: BreadcrumbItem[];
  status?: string | null;
  statusTone?: "healthy" | "warning" | "neutral";
};

const STATUS_TONE_STYLES = {
  healthy: {
    wrapper: "border-[var(--status-border)] bg-[var(--status-surface)]",
    text: "text-[var(--accent-lime)]",
  },
  warning: {
    wrapper: "border-[rgba(255,184,77,0.35)] bg-[rgba(52,31,8,0.92)]",
    text: "text-[var(--warning)]",
  },
  neutral: {
    wrapper: "border-white/[0.08] bg-[rgba(12,23,36,0.92)]",
    text: "text-inkSecondary",
  },
} as const;

export function TopBar({ breadcrumbs, status, statusTone = "healthy" }: TopBarProps) {
  const toneStyles = STATUS_TONE_STYLES[statusTone];

  return (
    <header className="sticky top-0 z-20 hidden h-[68px] border-b border-[var(--topbar-border)] bg-[color:var(--background-topbar)]/94 backdrop-blur min-[768px]:block">
      <div className="flex h-full items-center justify-between gap-6 px-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-inkSecondary">
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`} className="flex items-center gap-2">
                {item.href ? (
                  <Link href={item.href} className="transition hover:text-ink">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-inkSecondary">{item.label}</span>
                )}
                {index < breadcrumbs.length - 1 ? <span className="text-inkMuted/60">/</span> : null}
              </span>
            ))}
          </div>
        </div>

        {status ? (
          <div
            className={`flex h-[46px] items-center rounded-[16px] border px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] ${toneStyles.wrapper}`}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${toneStyles.text}`}>
              {"\u25cf"} {status}
            </p>
          </div>
        ) : null}
      </div>
    </header>
  );
}
