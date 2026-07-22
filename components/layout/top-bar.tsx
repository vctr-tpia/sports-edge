import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SearchIcon } from "@/components/icons";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type TopBarProps = {
  breadcrumbs: BreadcrumbItem[];
  status?: string | null;
};

export function TopBar({ breadcrumbs, status }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-borderSubtle bg-background/90 px-5 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-inkMuted">
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden min-w-[220px] items-center gap-3 rounded-xl border border-borderSubtle bg-surface2 px-4 py-2.5 text-sm text-inkSecondary md:flex">
            <SearchIcon className="h-4 w-4 text-inkMuted" />
            <span>Search players, matches, tournaments</span>
          </div>
          {status ? <Badge tone="brand">{status}</Badge> : null}
        </div>
      </div>
    </header>
  );
}
