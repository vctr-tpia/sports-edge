"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MatchIcon,
  ModelLabIcon,
  OverviewIcon,
  PlayerIcon,
  PredictionIcon,
  SettingsIcon,
} from "@/components/icons";
import { cn } from "@/src/lib/cn";

export const navItems = [
  { href: "/", label: "Overview", icon: OverviewIcon },
  { href: "/matches", label: "Matches", icon: MatchIcon },
  { href: "/predictions", label: "Predictions", icon: PredictionIcon },
  { href: "/players", label: "Players", icon: PlayerIcon },
  { href: "/model-lab", label: "Model Lab", icon: ModelLabIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-borderSubtle bg-black/20 lg:block">
      <div className="flex h-full flex-col px-5 py-6">
        <div className="rounded-2xl border border-brand/20 bg-brandSoft p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-inkMuted">
            Sports Edge
          </p>
          <h1 className="mt-2 text-xl font-semibold text-ink">ATP Terminal</h1>
          <p className="mt-2 text-sm leading-6 text-inkSecondary">
            Explainable match predictions and model health.
          </p>
        </div>

        <nav className="mt-6 space-y-1.5">
          {navItems.map((item) => {
            const selected =
              item.href === "/"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  selected
                    ? "bg-brandSoft text-ink"
                    : "text-inkSecondary hover:bg-white/[0.04] hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-brand transition",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "rounded-xl border p-2 transition",
                    selected
                      ? "border-brand/20 bg-black/10 text-brand"
                      : "border-borderSubtle bg-white/[0.02] text-inkMuted group-hover:text-inkSecondary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-borderSubtle bg-surface2 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
            Scope
          </p>
          <p className="mt-2 text-sm leading-6 text-inkSecondary">
            ATP winner prediction, explainability, projections, and internal evaluation.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-30 border-t border-borderSubtle bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-2">
        {navItems.slice(0, 5).map((item) => {
          const selected =
            item.href === "/"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium transition",
                selected
                  ? "bg-brandSoft text-ink"
                  : "text-inkMuted hover:bg-white/[0.04] hover:text-inkSecondary",
              )}
            >
              <Icon className="mb-1 h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
