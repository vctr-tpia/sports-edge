import type { ReactNode } from "react";
import { MobileNav, Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

type AppShellProps = {
  breadcrumbs: Array<{ label: string; href?: string }>;
  freshnessLabel?: string | null;
  freshnessTone?: "healthy" | "warning" | "neutral";
  showMobileTopBar?: boolean;
  children: ReactNode;
};

export function AppShell({
  breadcrumbs,
  freshnessLabel,
  freshnessTone,
  showMobileTopBar = true,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="min-h-screen w-full">
        <div className="dashboard-glow min-h-screen overflow-hidden bg-[var(--background-main)] min-[768px]:grid min-[768px]:grid-cols-[244px_minmax(0,1fr)]">
          <Sidebar />
          <div className="min-w-0 bg-[var(--surface-main)]">
            <div className={showMobileTopBar ? "" : "hidden min-[768px]:block"}>
              <TopBar
                breadcrumbs={breadcrumbs}
                status={freshnessLabel ?? null}
                statusTone={freshnessTone}
              />
            </div>
            <main className="app-grid px-5 pb-24 pt-5 min-[640px]:px-6 min-[768px]:px-10 min-[768px]:pb-8 min-[768px]:pt-0">
              <div className="w-full">{children}</div>
            </main>
            <MobileNav />
          </div>
        </div>
      </div>
    </div>
  );
}
