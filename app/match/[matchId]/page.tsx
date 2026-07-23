import { notFound } from "next/navigation";
import Link from "next/link";
import { ExpectedMatchCard } from "@/components/match-detail/expected-match-card";
import { FactorBreakdownCard } from "@/components/match-detail/factor-breakdown-card";
import {
  formatSchedule,
  playerSurname,
} from "@/components/match-detail/helpers";
import { MatchDetailHero } from "@/components/match-detail/match-detail-hero";
import { ModelCommentaryCard } from "@/components/match-detail/model-commentary-card";
import { PlayerComparisonCard } from "@/components/match-detail/player-comparison-card";
import { RecentFormSummaryCard } from "@/components/match-detail/recent-form-summary-card";
import { ResultContextCard } from "@/components/match-detail/result-context-card";
import { AppShell } from "@/components/layout/app-shell";
import { getMatchDetailViewModel } from "@/src/lib/app-view-models";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const detail = await getMatchDetailViewModel(matchId);

  if (!detail) {
    notFound();
  }

  const { match } = detail;
  const freshnessLabel = match.generatedAt
    ? `Prediction generated ${formatSchedule(match.generatedAt)}`
    : null;

  return (
    <AppShell
      breadcrumbs={[
        { label: "Matches", href: "/matches" },
        { label: match.tournamentName },
        { label: `${match.playerA.name} vs ${match.playerB.name}` },
      ]}
      freshnessLabel={freshnessLabel}
      freshnessTone="healthy"
    >
      <div className="space-y-6 pb-24 min-[768px]:pb-8">
        <div className="pt-4 min-[768px]:pt-10">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-inkMuted">
            <Link href="/matches" className="transition hover:text-ink">
              Matches
            </Link>
            <span>/</span>
            <span>{match.city ?? match.tournamentName}</span>
            <span>/</span>
            <span>
              {playerSurname(match.playerA.name)} vs {playerSurname(match.playerB.name)}
            </span>
          </div>
        </div>

        <MatchDetailHero detail={detail} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
          <FactorBreakdownCard detail={detail} />
          <ExpectedMatchCard detail={detail} />
        </div>

        <ModelCommentaryCard detail={detail} />

        <PlayerComparisonCard detail={detail} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)] xl:items-start">
          <RecentFormSummaryCard detail={detail} />
          <ResultContextCard detail={detail} />
        </div>
      </div>
    </AppShell>
  );
}
