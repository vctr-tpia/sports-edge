import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MatchDetailNotFound() {
  return (
    <AppShell breadcrumbs={[{ label: "Matches", href: "/matches" }, { label: "Match unavailable" }]} freshnessTone="neutral">
      <div className="flex min-h-[70vh] items-center justify-center pb-24 pt-6 min-[768px]:pb-8">
        <Card className="max-w-[640px] rounded-[28px] p-8 text-center sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Match detail</p>
          <h1 className="mt-4 text-[40px] font-semibold leading-[0.98] tracking-[-0.05em] text-ink">
            Match not found
          </h1>
          <p className="mt-4 text-[15px] leading-8 text-inkSecondary">
            That match identifier does not exist in the current Sports Edge ATP dataset, or the local files needed to build the report are missing.
          </p>
          <div className="mt-7 flex justify-center">
            <ButtonLink href="/matches" variant="primary">
              Back to matches
            </ButtonLink>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
