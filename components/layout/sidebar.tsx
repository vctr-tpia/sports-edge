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
  { href: "/performance", label: "Performance", icon: PredictionIcon, disabled: true },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[244px] border-r border-[var(--topbar-border)] bg-[var(--background-sidebar)] min-[768px]:block">
      <div className="flex min-h-full flex-col px-8 py-11">
        <div className="flex items-center gap-4">
          <div className="relative flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[var(--accent-blue)]">
            <span className="h-[13px] w-[13px] rounded-full bg-[var(--background-sidebar)]" />
          </div>
          <div className="min-w-0">
            <p className="whitespace-nowrap text-[14px] font-bold uppercase tracking-[0.14em] text-brand">
              Sports Edge
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-inkSecondary">
              ATP Analytics
            </p>
          </div>
        </div>

        <nav className="mt-12 space-y-2.5">
          {navItems.map((item) => {
            const selected =
              item.href === "/"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            const classes = cn(
              "group relative flex min-h-[56px] items-center gap-3.5 rounded-[16px] px-5 py-4 text-[13px] font-medium transition",
              selected
                ? "bg-[var(--sidebar-active)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                : item.disabled
                  ? "cursor-default text-inkMuted"
                  : "text-inkSecondary hover:bg-[var(--sidebar-hover)] hover:text-ink",
            );

            const content = (
              <>
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-brand transition",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center transition",
                    selected
                      ? "text-brand"
                      : item.disabled
                        ? "text-inkMuted"
                        : "text-inkMuted group-hover:text-inkSecondary",
                  )}
                >
                  <Icon className="h-[15px] w-[15px]" />
                </span>
                <span>{item.label}</span>
              </>
            );

            return item.disabled ? (
              <div key={item.label} className={classes} aria-disabled="true">
                {content}
              </div>
            ) : (
              <Link key={item.href} href={item.href} className={classes}>
                {content}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10 border-t border-white/[0.06] pt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-inkMuted">
            Workspace
          </p>
          <div className="mt-4 space-y-1.5">
            {[
              "Run history",
              "Data health",
              "Settings",
            ].map((label) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[12px] px-3 py-3 text-[13px] text-inkSecondary"
                aria-disabled="true"
              >
                <span className="h-2 w-2 rounded-full bg-inkMuted/70" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto rounded-[18px] bg-[color:rgba(11,22,39,0.92)] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-blue)] text-[12px] font-bold text-white">
              VT
            </div>
            <div>
              <p className="text-[14px] font-semibold text-ink">Victor Tapia</p>
              <p className="mt-1 text-[12px] text-inkSecondary">Product owner</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-30 border-t border-borderSubtle bg-background/95 px-3 py-2 backdrop-blur min-[768px]:hidden">
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
