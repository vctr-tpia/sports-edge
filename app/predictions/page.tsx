import { AppShell } from "@/components/layout/app-shell";
import {
  AllPredictionsLedgerCard,
  ModelEdgesCard,
  PredictionsCommentaryCard,
  PredictionsConfidenceCard,
  PredictionsHeroCard,
  RankedRecommendationsCard,
  TopSignalsRow,
  YesterdayPerformanceCard,
} from "@/components/predictions/predictions-page-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { getPredictionsPageViewModel } from "@/src/lib/app-view-models";

export default async function PredictionsPage() {
  const viewModel = await getPredictionsPageViewModel();
  const hasLivePredictions = viewModel.hero.totalPredictions > 0;
  const hasLedgerEntries = viewModel.predictionLedger.length > 0;

  return (
    <AppShell
      breadcrumbs={[{ label: "Predictions" }]}
      freshnessLabel={viewModel.freshnessLabel}
      freshnessTone={viewModel.freshnessTone}
    >
      <div className="space-y-8 pb-6 pt-8">
        {hasLivePredictions ? (
          <>
            <PredictionsHeroCard hero={viewModel.hero} />

            <TopSignalsRow
              recommendations={viewModel.rankedRecommendations}
              edges={viewModel.biggestEdges}
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_370px]">
              <PredictionsCommentaryCard
                commentary={viewModel.commentary}
                hero={viewModel.hero}
                topSignals={viewModel.topSignals}
              />
              <PredictionsConfidenceCard distribution={viewModel.confidenceDistribution} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_370px]">
              <RankedRecommendationsCard recommendations={viewModel.rankedRecommendations} />
              <ModelEdgesCard edges={viewModel.biggestEdges} />
            </div>
            <YesterdayPerformanceCard performance={viewModel.yesterdayPerformance} />
            <AllPredictionsLedgerCard entries={viewModel.predictionLedger} />
          </>
        ) : hasLedgerEntries ? (
          <AllPredictionsLedgerCard entries={viewModel.predictionLedger} />
        ) : (
          <EmptyState
            title="No ATP predictions are currently available"
            description="The Predictions page will populate once the upcoming ATP slate has been refreshed and at least one match has a published pre-match probability."
          />
        )}
      </div>
    </AppShell>
  );
}
