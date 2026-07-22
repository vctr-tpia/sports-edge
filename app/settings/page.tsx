import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function SettingsPage() {
  return (
    <AppShell breadcrumbs={[{ label: "Settings" }]}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Settings"
          title="Settings stays intentionally minimal in the MVP."
          description="Authentication, saved views, and future feature flags can live here later. For now, the route exists mainly so the application shell remains coherent during the redesign."
        />
        <EmptyState
          title="No user-level settings are active yet"
          description="Once auth and role-aware controls are introduced, this section can manage preferences such as default sport, odds-comparison visibility, and internal model-lab access."
        />
      </div>
    </AppShell>
  );
}
