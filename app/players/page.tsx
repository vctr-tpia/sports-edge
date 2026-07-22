import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function PlayersPage() {
  return (
    <AppShell breadcrumbs={[{ label: "Players" }]}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Players"
          title="Player profiles are planned, but not active in the ATP MVP."
          description="The current sprint focuses on prediction presentation and model analysis. Player profile views will reuse the same design system once we expose a stronger player-level data contract."
        />
        <EmptyState
          title="Player pages are not published yet"
          description="We already have the identity and historical match data needed to grow into this route, but the current MVP keeps the public surface area focused on matches, predictions, and model quality."
        />
      </div>
    </AppShell>
  );
}
