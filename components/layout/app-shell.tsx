import type { ReactNode } from "react";
import { MobileNav, Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

type AppShellProps = {
  breadcrumbs: Array<{ label: string; href?: string }>;
  freshnessLabel?: string | null;
  children: ReactNode;
};

export function AppShell({ breadcrumbs, freshnessLabel, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <TopBar breadcrumbs={breadcrumbs} status={freshnessLabel ?? null} />
          <main className="app-grid px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
          <MobileNav />
        </div>
      </div>
    </div>
  );
}
