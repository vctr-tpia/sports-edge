import {
  loadActiveHistoricalDataset,
  type ActivePlayer,
} from "@/src/lib/active-history";
import {
  getHistoricalFeatureSnapshots,
  getLocalPlayersById,
  getLocalTournamentsById,
  getMatchDetailById,
  getUpcomingPredictionSnapshots,
  getUpcomingRefreshHealth,
  getUpcomingPredictionSummary,
} from "@/src/lib/local-data";
import { getLatestModelHealthEvaluation } from "@/src/lib/model-health";
import {
  getArchivedPredictionMatchById,
  getPredictionLedgerEntries,
} from "@/src/lib/prediction-ledger";
import type { MatchPrediction, PredictionFactor } from "@/src/domain/predictions/explanation";
import type {
  HistoricalMatchFeatureSnapshot,
  PreMatchFeatureSnapshot,
} from "@/src/domain/predictions/feature-snapshot";
import type { MatchRound, Surface, TournamentLevel } from "@/src/domain/shared";
import { generatePredictionFromFeatureSnapshot } from "@/src/prediction/baseline-feature-model";

export type MatchStatus =
  | "prediction_ready"
  | "settled"
  | "cancelled"
  | "postponed"
  | "walkover"
  | "mapping_error"
  | "data_unavailable";

export type ConfidenceLabel = "low" | "moderate" | "high" | "very_high";
export type AdvantageStrength = "neutral" | "slight" | "moderate" | "strong";
export type FreshnessTone = "healthy" | "warning" | "neutral";

export interface PlayerSummary {
  id: string;
  name: string;
  countryCode?: string | null;
  ranking?: number | null;
}

export interface MatchPredictionViewModel {
  matchId: string;
  tournamentName: string;
  tournamentLevel?: TournamentLevel | null;
  round?: MatchRound | null;
  surface?: Surface | null;
  scheduledAt?: string | null;
  providerTimeLabel?: string | null;
  matchDate: string;
  city?: string | null;
  countryCode?: string | null;
  tournamentStartDate?: string | null;
  tournamentEndDate?: string | null;
  bestOf?: number | null;
  status: MatchStatus;
  playerA: PlayerSummary;
  playerB: PlayerSummary;
  playerAProbability?: number | null;
  playerBProbability?: number | null;
  favoredPlayerId?: string | null;
  confidenceScore?: number | null;
  confidenceLabel?: ConfidenceLabel | null;
  modelVersion?: string | null;
  generatedAt?: string | null;
  topFactorLabel?: string | null;
  topFactorFavoredPlayerId?: string | null;
  actualWinnerId?: string | null;
}

export interface FactorInsightViewModel {
  key: string;
  label: string;
  summary: string;
  favoredPlayerId: string | null;
  favoredPlayerName: string | null;
  strength: AdvantageStrength;
  edgeMagnitude: number;
  weight: number;
  playerAValue: number;
  playerBValue: number;
}

export interface ComparisonRowViewModel {
  label: string;
  playerAValue: string;
  playerBValue: string;
  favoredPlayerId: string | null;
  strength: AdvantageStrength;
  note?: string;
}

export interface RecentMatchViewModel {
  matchId: string;
  date: string;
  tournamentName: string;
  round: MatchRound;
  surface: Surface;
  result: "W" | "L";
  opponentName: string;
  opponentCountryCode?: string | null;
  playerRanking?: number | null;
  opponentRanking?: number | null;
  score?: string | null;
}

export interface SimilarContextViewModel {
  surfaceAccuracy?: number | null;
  surfaceSample?: number | null;
  confidenceBucket?: string | null;
  confidenceBucketAccuracy?: number | null;
  confidenceBucketSample?: number | null;
  primaryModelVersion?: string | null;
}

export interface MatchDetailViewModel {
  match: MatchPredictionViewModel;
  kind: "upcoming" | "historical";
  actualWinnerName?: string | null;
  favoredPlayerName: string;
  underdogPlayerName: string;
  favoriteWinProbability: number;
  projection: MatchPrediction["projection"];
  factors: FactorInsightViewModel[];
  supportingFactors: FactorInsightViewModel[];
  counterFactors: FactorInsightViewModel[];
  factorAgreement: {
    favoredPlayerCount: number;
    underdogCount: number;
    neutralCount: number;
  };
  comparisonRows: ComparisonRowViewModel[];
  playerARecentForm: RecentMatchViewModel[];
  playerBRecentForm: RecentMatchViewModel[];
  playerASurfaceForm: RecentMatchViewModel[];
  playerBSurfaceForm: RecentMatchViewModel[];
  headToHeadMatches: RecentMatchViewModel[];
  similarContext?: SimilarContextViewModel | null;
}

export interface OverviewViewModel {
  freshnessLabel: string;
  freshnessTone: FreshnessTone;
  generatedAt: string;
  allUpcomingMatchCount: number;
  averageConfidence: number;
  slateTitle: string;
  slateSubtitle: string;
  slateMatches: MatchPredictionViewModel[];
  metricCards: Array<{ label: string; value: string; detail: string }>;
  featuredMatch: MatchPredictionViewModel | null;
  featuredPrediction: MatchPrediction | null;
  featuredFactors: FactorInsightViewModel[];
  upcomingMatches: MatchPredictionViewModel[];
  confidenceDistribution: Array<{ label: string; count: number }>;
  performanceHighlights: Array<{ label: string; value: string; detail: string }>;
}

export interface RankedPredictionViewModel {
  match: MatchPredictionViewModel;
  favoriteName: string;
  favoriteProbability: number;
  confidenceScore: number | null;
  confidenceLabel: ConfidenceLabel | null;
  factors: FactorInsightViewModel[];
  supportingFactors: FactorInsightViewModel[];
  counterFactors: FactorInsightViewModel[];
  factorAgreement: {
    favoredPlayerCount: number;
    underdogCount: number;
    neutralCount: number;
  };
  topFactor: FactorInsightViewModel | null;
  topCounterFactor: FactorInsightViewModel | null;
  recommendationScore: number;
  stabilityScore: number;
  dataCompleteness: number;
}

export interface TopSignalViewModel {
  id: string;
  matchId: string;
  matchLabel: string;
  tournamentName: string;
  surface?: Surface | null;
  favoriteName: string;
  factor: FactorInsightViewModel;
}

export interface ModelEdgeViewModel {
  id: string;
  matchId: string;
  matchLabel: string;
  tournamentName: string;
  surface?: Surface | null;
  favoredPlayerName: string;
  factorLabel: string;
  strength: AdvantageStrength;
  magnitudeLabel: string;
  summary: string;
  stabilityLabel: string;
}

export interface YesterdayPerformanceViewModel {
  dateKey: string;
  label: string;
  predictionsMade: number;
  settledCount: number;
  unsettledCount: number;
  correctCount: number;
  accuracy: number;
  averageFavoriteProbability: number;
  averageConfidenceScore: number;
  brierScore: number;
  highConfidenceAccuracy: number | null;
  highConfidenceSample: number;
  mostConfidentCorrect:
    | { matchId: string; label: string; probability: number }
    | null;
  mostConfidentMiss:
    | { matchId: string; label: string; probability: number }
    | null;
}

export interface PredictionLedgerEntryViewModel {
  matchId: string;
  detailHref: string | null;
  matchLabel: string;
  tournamentLabel: string;
  favoriteName: string;
  favoriteProbability: number;
  confidenceScore: number | null;
  confidenceLabel: ConfidenceLabel | null;
  status: "upcoming" | "correct" | "incorrect" | "void";
  statusLabel: string;
  settledScore?: string | null;
  settledWinnerName?: string | null;
  generatedAt: string;
  modelVersion: string;
  topFactorLabel?: string | null;
  matchDate: string;
  scheduledAt?: string | null;
}

export interface PredictionsPageViewModel {
  freshnessLabel: string;
  freshnessTone: FreshnessTone;
  hero: {
    dateLabel: string;
    matchesAnalyzed: number;
    publishedPicks: number;
    totalPredictions: number;
    averageFavoriteProbability: number;
    averageConfidenceScore: number;
    highestConfidencePrediction: RankedPredictionViewModel | null;
    strongestSignal: TopSignalViewModel | null;
    topConfidence: number;
    bestAgreementLabel: string;
    primaryModelVersion: string;
    generatedAt: string;
    healthMessage: string | null;
  };
  commentary: {
    summary: string;
    stableNote: string;
    cautionNote: string;
    dataNote: string;
  };
  confidenceDistribution: {
    totalCount: number;
    averageConfidenceScore: number;
    highlightedBucket: ConfidenceLabel | null;
    buckets: Array<{ key: ConfidenceLabel; label: string; count: number }>;
  };
  topSignals: TopSignalViewModel[];
  rankedRecommendations: RankedPredictionViewModel[];
  biggestEdges: ModelEdgeViewModel[];
  yesterdayPerformance: YesterdayPerformanceViewModel | null;
  predictionLedger: PredictionLedgerEntryViewModel[];
}

function buildConfidenceLabel(value: number | null | undefined): ConfidenceLabel | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value >= 0.3) {
    return "very_high";
  }

  if (value >= 0.18) {
    return "high";
  }

  if (value >= 0.08) {
    return "moderate";
  }

  return "low";
}

export function confidenceLabelText(value: ConfidenceLabel | null | undefined) {
  switch (value) {
    case "very_high":
      return "Very high";
    case "high":
      return "High";
    case "moderate":
      return "Moderate";
    case "low":
      return "Low";
    default:
      return "Unavailable";
  }
}

function factorStrength(edgeMagnitude: number): AdvantageStrength {
  if (edgeMagnitude >= 0.12) {
    return "strong";
  }
  if (edgeMagnitude >= 0.05) {
    return "moderate";
  }
  if (edgeMagnitude >= 0.015) {
    return "slight";
  }
  return "neutral";
}

function findFavoredPlayerId(
  prediction: MatchPrediction,
  playerAId: string,
  playerBId: string,
) {
  return prediction.playerAWinProbability >= prediction.playerBWinProbability ? playerAId : playerBId;
}

function formatRelativeMinutes(fromIso: string) {
  const diffMs = Date.now() - new Date(fromIso).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  return `ATP data updated ${diffMinutes} min ago`;
}

function formatStaleMinutes(fromIso: string) {
  const diffMs = Date.now() - new Date(fromIso).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes >= 60) {
    const diffHours = Math.round(diffMinutes / 60);
    return `ATP data stale · updated ${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  }

  return `ATP data stale · updated ${diffMinutes} min ago`;
}

function favoriteProbabilityFromMatch(match: MatchPredictionViewModel) {
  return match.favoredPlayerId === match.playerA.id
    ? match.playerAProbability ?? 0.5
    : match.playerBProbability ?? 0.5;
}

const OVERVIEW_TIME_ZONE = "America/Los_Angeles";

function zonedDateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OVERVIEW_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function matchOverviewDateKey(match: MatchPredictionViewModel) {
  if (match.scheduledAt) {
    const parsed = new Date(match.scheduledAt);
    if (!Number.isNaN(parsed.getTime())) {
      return zonedDateKey(parsed);
    }
  }

  return match.matchDate;
}

function compareUpcomingMatchTime(left: MatchPredictionViewModel, right: MatchPredictionViewModel) {
  const leftStamp = left.scheduledAt ?? `${left.matchDate}T00:00:00Z`;
  const rightStamp = right.scheduledAt ?? `${right.matchDate}T00:00:00Z`;
  return leftStamp.localeCompare(rightStamp);
}

function buildUpcomingFreshnessStatus({
  generatedAt,
  futureMatchCount,
  healthStatus,
}: {
  generatedAt: string;
  futureMatchCount: number;
  healthStatus?: "healthy" | "warning" | "rate_limited" | null;
}): { label: string; tone: FreshnessTone } {
  const ageMinutes = Math.max(0, Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000));

  if (healthStatus === "rate_limited") {
    return {
      label: "ATP data stale · RapidAPI quota reached",
      tone: "warning",
    };
  }

  if (futureMatchCount === 0) {
    return {
      label: "ATP data stale · no future slate loaded",
      tone: "warning",
    };
  }

  if (healthStatus === "warning" || ageMinutes >= 12 * 60) {
    return {
      label: formatStaleMinutes(generatedAt),
      tone: "warning",
    };
  }

  return {
    label: formatRelativeMinutes(generatedAt),
    tone: "healthy",
  };
}

function formatDateKeyLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12)));
}

function formatCompactDateLabel(value: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: OVERVIEW_TIME_ZONE,
    weekday: "short",
  })
    .format(value)
    .toUpperCase();
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: OVERVIEW_TIME_ZONE,
    month: "short",
  })
    .format(value)
    .toUpperCase();
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: OVERVIEW_TIME_ZONE,
    day: "numeric",
  }).format(value);

  return `${weekday} · ${month} ${day}`;
}

function probabilityBucket(probability: number) {
  const bucketStart = Math.floor((probability - 0.5) / 0.05) * 5 + 50;
  const start = Math.max(50, Math.min(95, bucketStart));
  return `${start}-${start + 5}%`;
}

function formatMetricValue(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unavailable";
  }

  if (Number.isInteger(value)) {
    return `${value}`;
  }

  return value.toFixed(digits);
}

async function loadRankingByPlayerId() {
  const { matches, matchEntries } = await loadActiveHistoricalDataset();
  const matchDateById = new Map(matches.map((match) => [match.id, match.match_date]));
  const sortedEntries = [...matchEntries].sort((left, right) => {
    const leftDate = matchDateById.get(left.match_id) ?? "";
    const rightDate = matchDateById.get(right.match_id) ?? "";
    return rightDate.localeCompare(leftDate);
  });

  const rankingByPlayerId = new Map<string, number | null>();
  for (const entry of sortedEntries) {
    if (!rankingByPlayerId.has(entry.player_id)) {
      rankingByPlayerId.set(entry.player_id, entry.ranking_at_match);
    }
  }

  return rankingByPlayerId;
}

function buildFactorInsights(
  prediction: MatchPrediction,
  playerA: PlayerSummary,
  playerB: PlayerSummary,
): FactorInsightViewModel[] {
  return [...prediction.explanation]
    .map((factor) => {
      const edgeMagnitude = Math.abs(factor.edgeToPlayerA);
      const favoredPlayerId =
        edgeMagnitude < 0.005
          ? null
          : factor.edgeToPlayerA >= 0
            ? playerA.id
            : playerB.id;
      const favoredPlayerName =
        favoredPlayerId === playerA.id ? playerA.name : favoredPlayerId === playerB.id ? playerB.name : null;

      return {
        key: factor.key,
        label: factor.label,
        summary: factor.summary,
        favoredPlayerId,
        favoredPlayerName,
        strength: factorStrength(edgeMagnitude),
        edgeMagnitude,
        weight: factor.weight,
        playerAValue: factor.playerAValue,
        playerBValue: factor.playerBValue,
      } satisfies FactorInsightViewModel;
    })
    .sort((left, right) => right.edgeMagnitude - left.edgeMagnitude);
}

function mapUpcomingMatchViewModel(
  entry: Awaited<ReturnType<typeof getUpcomingPredictionSnapshots>>[number],
  playerA: PlayerSummary,
  playerB: PlayerSummary,
): MatchPredictionViewModel {
  const topFactor = [...entry.prediction.explanation].sort(
    (left, right) => Math.abs(right.edgeToPlayerA) - Math.abs(left.edgeToPlayerA),
  )[0];
  const favoredPlayerId = findFavoredPlayerId(entry.prediction, playerA.id, playerB.id);

  return {
    matchId: entry.snapshot.matchId,
    tournamentName: entry.match.tournament_name,
    tournamentLevel: entry.snapshot.tournamentLevel,
    round: entry.snapshot.round,
    surface: entry.snapshot.surface,
    scheduledAt: entry.match.scheduled_at,
    providerTimeLabel: entry.match.provider_time_label,
    matchDate: entry.snapshot.matchDate,
    city: entry.match.city,
    countryCode: entry.match.country_code,
    tournamentStartDate: entry.match.tournament_start_date,
    tournamentEndDate: entry.match.tournament_end_date,
    bestOf: entry.match.best_of,
    status: "prediction_ready",
    playerA,
    playerB,
    playerAProbability: entry.prediction.playerAWinProbability,
    playerBProbability: entry.prediction.playerBWinProbability,
    favoredPlayerId,
    confidenceScore: entry.prediction.confidence,
    confidenceLabel: buildConfidenceLabel(entry.prediction.confidence),
    modelVersion: entry.prediction.modelVersion,
    generatedAt: entry.prediction.generatedAt,
    topFactorLabel: topFactor?.label ?? null,
    topFactorFavoredPlayerId:
      topFactor && Math.abs(topFactor.edgeToPlayerA) >= 0.005
        ? topFactor.edgeToPlayerA >= 0
          ? playerA.id
          : playerB.id
        : null,
  };
}

function mapHistoricalMatchViewModel(
  snapshot: HistoricalMatchFeatureSnapshot,
  prediction: MatchPrediction,
  tournamentName: string,
  playerA: PlayerSummary,
  playerB: PlayerSummary,
): MatchPredictionViewModel {
  const topFactor = [...prediction.explanation].sort(
    (left, right) => Math.abs(right.edgeToPlayerA) - Math.abs(left.edgeToPlayerA),
  )[0];

  return {
    matchId: snapshot.matchId,
    tournamentName,
    tournamentLevel: snapshot.tournamentLevel,
    round: snapshot.round,
    surface: snapshot.surface,
    matchDate: snapshot.matchDate,
    bestOf: snapshot.bestOf,
    status: "settled",
    playerA,
    playerB,
    playerAProbability: prediction.playerAWinProbability,
    playerBProbability: prediction.playerBWinProbability,
    favoredPlayerId: prediction.favoritePlayerId,
    confidenceScore: prediction.confidence,
    confidenceLabel: buildConfidenceLabel(prediction.confidence),
    modelVersion: prediction.modelVersion,
    generatedAt: prediction.generatedAt,
    topFactorLabel: topFactor?.label ?? null,
    topFactorFavoredPlayerId:
      topFactor && Math.abs(topFactor.edgeToPlayerA) >= 0.005
        ? topFactor.edgeToPlayerA >= 0
          ? playerA.id
          : playerB.id
        : null,
    actualWinnerId: snapshot.actualWinnerId,
  };
}

export async function getOverviewViewModel(): Promise<OverviewViewModel> {
  const [playersById, upcomingRows, upcomingSummary, upcomingHealth, modelHealth] =
    await Promise.all([
      getLocalPlayersById(),
      getUpcomingPredictionSnapshots(),
      getUpcomingPredictionSummary(),
      getUpcomingRefreshHealth(),
      getLatestModelHealthEvaluation(),
    ]);

  const rankingByPlayerId = await loadRankingByPlayerId();
  const upcomingMatches = upcomingRows.map((entry) =>
    mapUpcomingMatchViewModel(
      entry,
      {
        id: entry.snapshot.playerAId,
        name: playersById.get(entry.snapshot.playerAId)?.full_name ?? entry.snapshot.playerAId,
        countryCode: playersById.get(entry.snapshot.playerAId)?.country_code,
        ranking: rankingByPlayerId.get(entry.snapshot.playerAId) ?? null,
      },
      {
        id: entry.snapshot.playerBId,
        name: playersById.get(entry.snapshot.playerBId)?.full_name ?? entry.snapshot.playerBId,
        countryCode: playersById.get(entry.snapshot.playerBId)?.country_code,
        ranking: rankingByPlayerId.get(entry.snapshot.playerBId) ?? null,
      },
    ),
  );

  const tomorrowKey = zonedDateKey(addDays(new Date(), 1));
  const todayKey = zonedDateKey(new Date());
  const futureDateKeys = [...new Set(upcomingMatches.map(matchOverviewDateKey))]
    .filter((dateKey) => dateKey > todayKey)
    .sort((left, right) => left.localeCompare(right));
  const preferredSlateDateKey =
    futureDateKeys.find((dateKey) => dateKey === tomorrowKey) ?? futureDateKeys[0] ?? null;
  const tomorrowFirstSlateMatches = preferredSlateDateKey
    ? upcomingMatches
        .filter((match) => matchOverviewDateKey(match) === preferredSlateDateKey)
        .sort(compareUpcomingMatchTime)
    : [];
  const usingTomorrowSlate = preferredSlateDateKey === tomorrowKey;
  const futureMatchCount = upcomingMatches.filter((match) => matchOverviewDateKey(match) > todayKey).length;
  const freshnessStatus = buildUpcomingFreshnessStatus({
    generatedAt: upcomingSummary.generatedAt,
    futureMatchCount,
    healthStatus: upcomingHealth?.status ?? null,
  });

  const featuredMatch = [...(tomorrowFirstSlateMatches.length > 0 ? tomorrowFirstSlateMatches : upcomingMatches)].sort(
    (left, right) => (right.confidenceScore ?? 0) - (left.confidenceScore ?? 0),
  )[0] ?? null;
  const featuredPrediction =
    featuredMatch
      ? upcomingRows.find((entry) => entry.snapshot.matchId === featuredMatch.matchId)?.prediction ?? null
      : null;
  const featuredFactors =
    featuredMatch && featuredPrediction
      ? buildFactorInsights(featuredPrediction, featuredMatch.playerA, featuredMatch.playerB).slice(0, 4)
      : [];

  const averageConfidence =
    upcomingMatches.reduce((sum, row) => sum + favoriteProbabilityFromMatch(row), 0) /
    Math.max(1, upcomingMatches.length);
  const confidenceCounts = ["low", "moderate", "high", "very_high"].map((label) => ({
    label,
    count: upcomingMatches.filter((match) => match.confidenceLabel === label).length,
  }));
  const publishedUpcomingMatches = upcomingMatches.slice(0, 12);
  const slateMatches = [...tomorrowFirstSlateMatches]
    .sort((left, right) => (right.confidenceScore ?? 0) - (left.confidenceScore ?? 0))
    .slice(0, 4);

  return {
    freshnessLabel: freshnessStatus.label,
    freshnessTone: freshnessStatus.tone,
    generatedAt: upcomingSummary.generatedAt,
    allUpcomingMatchCount: upcomingMatches.length,
    averageConfidence,
    slateTitle: usingTomorrowSlate ? "Tomorrow's slate" : "Next slate",
    slateSubtitle: usingTomorrowSlate
      ? "Highest-confidence matches scheduled for tomorrow"
      : preferredSlateDateKey
        ? `Highest-confidence matches scheduled for ${formatDateKeyLabel(preferredSlateDateKey)}`
        : "No upcoming slate is scheduled yet",
    slateMatches,
    metricCards: [
      {
        label: "Upcoming matches",
        value: `${upcomingSummary.upcomingMatchCount}`,
        detail: "Mapped into today's slate",
      },
      {
        label: "Predictions ready",
        value: `${upcomingMatches.length}`,
        detail: "Pre-match probabilities",
      },
      {
        label: "Avg confidence",
        value: `${Math.round(averageConfidence * 100)}%`,
        detail: "Across loaded upcoming picks",
      },
      {
        label: "Primary model",
        value: modelHealth?.evaluation.primary_model_version ?? "baseline-v5",
        detail: "Current explainable model",
      },
    ],
    featuredMatch,
    featuredPrediction,
    featuredFactors,
    upcomingMatches: publishedUpcomingMatches,
    confidenceDistribution: confidenceCounts,
    performanceHighlights: modelHealth
      ? [
          {
            label: "Backtest accuracy",
            value: `${(modelHealth.evaluation.overall_accuracy * 100).toFixed(1)}%`,
            detail: `Historical ATP sample of ${modelHealth.evaluation.sample_match_count} matches`,
          },
          {
            label: "Log loss",
            value: modelHealth.evaluation.overall_log_loss.toFixed(4),
            detail: `${modelHealth.evaluation.primary_model_version} is best current loss performer`,
          },
          {
            label: "Best surface",
            value:
              modelHealth.insights.strongestSurface?.segment_key.toUpperCase() ?? "Unavailable",
            detail:
              modelHealth.insights.strongestSurface
                ? `${(modelHealth.insights.strongestSurface.accuracy * 100).toFixed(1)}% accuracy`
                : "Surface split unavailable",
          },
        ]
      : [],
  };
}

type DirectoryFilters = {
  query?: string;
  surface?: string;
  confidence?: string;
  tournament?: string;
  sort?: string;
};

export async function getUpcomingDirectoryViewModel(filters: DirectoryFilters = {}) {
  const [playersById, upcomingRows, upcomingSummary, upcomingHealth] = await Promise.all([
    getLocalPlayersById(),
    getUpcomingPredictionSnapshots(),
    getUpcomingPredictionSummary(),
    getUpcomingRefreshHealth(),
  ]);
  const rankingByPlayerId = await loadRankingByPlayerId();

  const allUpcomingMatches = upcomingRows.map((entry) =>
    mapUpcomingMatchViewModel(
      entry,
      {
        id: entry.snapshot.playerAId,
        name: playersById.get(entry.snapshot.playerAId)?.full_name ?? entry.snapshot.playerAId,
        countryCode: playersById.get(entry.snapshot.playerAId)?.country_code,
        ranking: rankingByPlayerId.get(entry.snapshot.playerAId) ?? null,
      },
      {
        id: entry.snapshot.playerBId,
        name: playersById.get(entry.snapshot.playerBId)?.full_name ?? entry.snapshot.playerBId,
        countryCode: playersById.get(entry.snapshot.playerBId)?.country_code,
        ranking: rankingByPlayerId.get(entry.snapshot.playerBId) ?? null,
      },
    ),
  );
  let rows = [...allUpcomingMatches];

  const query = filters.query?.trim().toLowerCase();
  if (query) {
    rows = rows.filter((row) =>
      [
        row.playerA.name,
        row.playerB.name,
        row.tournamentName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }
  if (filters.surface && filters.surface !== "all") {
    rows = rows.filter((row) => row.surface === filters.surface);
  }
  if (filters.confidence && filters.confidence !== "all") {
    rows = rows.filter((row) => row.confidenceLabel === filters.confidence);
  }
  if (filters.tournament && filters.tournament !== "all") {
    rows = rows.filter((row) => row.tournamentName === filters.tournament);
  }

  switch (filters.sort) {
    case "confidence":
      rows = rows.sort((left, right) => (right.confidenceScore ?? 0) - (left.confidenceScore ?? 0));
      break;
    case "closest":
      rows = rows.sort((left, right) => {
        const leftGap = Math.abs((left.playerAProbability ?? 0.5) - 0.5);
        const rightGap = Math.abs((right.playerAProbability ?? 0.5) - 0.5);
        return leftGap - rightGap;
      });
      break;
    case "ranking":
      rows = rows.sort((left, right) => {
        const leftRank = Math.min(left.playerA.ranking ?? 9999, left.playerB.ranking ?? 9999);
        const rightRank = Math.min(right.playerA.ranking ?? 9999, right.playerB.ranking ?? 9999);
        return leftRank - rightRank;
      });
      break;
    case "tournament":
      rows = rows.sort((left, right) => left.tournamentName.localeCompare(right.tournamentName));
      break;
    default:
      rows = rows.sort((left, right) => {
        const leftStamp = left.scheduledAt ?? `${left.matchDate}T00:00:00Z`;
        const rightStamp = right.scheduledAt ?? `${right.matchDate}T00:00:00Z`;
        return leftStamp.localeCompare(rightStamp);
      });
  }

  const todayKey = zonedDateKey(new Date());
  const futureMatchCount = allUpcomingMatches.filter((match) => matchOverviewDateKey(match) > todayKey).length;
  const freshnessStatus = buildUpcomingFreshnessStatus({
    generatedAt: upcomingSummary.generatedAt,
    futureMatchCount,
    healthStatus: upcomingHealth?.status ?? null,
  });

  return {
    freshnessLabel: freshnessStatus.label,
    freshnessTone: freshnessStatus.tone,
    tournaments: [...new Set(upcomingRows.map((entry) => entry.match.tournament_name))].sort(),
    matches: rows,
  };
}

export async function getPredictionsDirectoryViewModel(filters: DirectoryFilters = {}) {
  const [playersById, tournamentsById, upcomingRows, historicalSnapshots, upcomingSummary, upcomingHealth] =
    await Promise.all([
      getLocalPlayersById(),
      getLocalTournamentsById(),
      getUpcomingPredictionSnapshots(),
      getHistoricalFeatureSnapshots(40),
      getUpcomingPredictionSummary(),
      getUpcomingRefreshHealth(),
    ]);
  const rankingByPlayerId = await loadRankingByPlayerId();

  const upcomingMatches = upcomingRows.map((entry) =>
    mapUpcomingMatchViewModel(
      entry,
      {
        id: entry.snapshot.playerAId,
        name: playersById.get(entry.snapshot.playerAId)?.full_name ?? entry.snapshot.playerAId,
        countryCode: playersById.get(entry.snapshot.playerAId)?.country_code,
        ranking: rankingByPlayerId.get(entry.snapshot.playerAId) ?? null,
      },
      {
        id: entry.snapshot.playerBId,
        name: playersById.get(entry.snapshot.playerBId)?.full_name ?? entry.snapshot.playerBId,
        countryCode: playersById.get(entry.snapshot.playerBId)?.country_code,
        ranking: rankingByPlayerId.get(entry.snapshot.playerBId) ?? null,
      },
    ),
  );

  const historicalMatches = historicalSnapshots.map((snapshot) =>
    mapHistoricalMatchViewModel(
      snapshot,
      generatePredictionFromFeatureSnapshot(snapshot),
      tournamentsById.get(snapshot.tournamentId)?.name ?? snapshot.tournamentId,
      {
        id: snapshot.playerAId,
        name: playersById.get(snapshot.playerAId)?.full_name ?? snapshot.playerAId,
        countryCode: playersById.get(snapshot.playerAId)?.country_code,
        ranking: rankingByPlayerId.get(snapshot.playerAId) ?? null,
      },
      {
        id: snapshot.playerBId,
        name: playersById.get(snapshot.playerBId)?.full_name ?? snapshot.playerBId,
        countryCode: playersById.get(snapshot.playerBId)?.country_code,
        ranking: rankingByPlayerId.get(snapshot.playerBId) ?? null,
      },
    ),
  );

  let rows = [...upcomingMatches, ...historicalMatches];
  const query = filters.query?.trim().toLowerCase();
  if (query) {
    rows = rows.filter((row) =>
      [row.playerA.name, row.playerB.name, row.tournamentName].join(" ").toLowerCase().includes(query),
    );
  }
  if (filters.surface && filters.surface !== "all") {
    rows = rows.filter((row) => row.surface === filters.surface);
  }
  if (filters.confidence && filters.confidence !== "all") {
    rows = rows.filter((row) => row.confidenceLabel === filters.confidence);
  }

  rows = rows.sort((left, right) => {
    const leftStamp = left.scheduledAt ?? `${left.matchDate}T00:00:00Z`;
    const rightStamp = right.scheduledAt ?? `${right.matchDate}T00:00:00Z`;
    return rightStamp.localeCompare(leftStamp);
  });

  const todayKey = zonedDateKey(new Date());
  const futureMatchCount = upcomingMatches.filter((match) => matchOverviewDateKey(match) > todayKey).length;
  const freshnessStatus = buildUpcomingFreshnessStatus({
    generatedAt: upcomingSummary.generatedAt,
    futureMatchCount,
    healthStatus: upcomingHealth?.status ?? null,
  });

  return {
    freshnessLabel: freshnessStatus.label,
    freshnessTone: freshnessStatus.tone,
    predictions: rows,
  };
}

function playerSummaryForId(
  playerId: string,
  playersById: Map<string, ActivePlayer>,
  rankingByPlayerId: Map<string, number | null>,
): PlayerSummary {
  return {
    id: playerId,
    name: playersById.get(playerId)?.full_name ?? playerId,
    countryCode: playersById.get(playerId)?.country_code,
    ranking: rankingByPlayerId.get(playerId) ?? null,
  };
}

function sentenceCase(value?: string | null) {
  if (!value) {
    return "Unavailable";
  }

  return value
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function matchLabel(match: MatchPredictionViewModel) {
  return `${match.playerA.name} vs ${match.playerB.name}`;
}

function factorAgreementSummary(
  factors: FactorInsightViewModel[],
  favoredPlayerId: string | null | undefined,
) {
  return factors.reduce(
    (summary, factor) => {
      if (!factor.favoredPlayerId || factor.strength === "neutral") {
        summary.neutralCount += 1;
      } else if (factor.favoredPlayerId === favoredPlayerId) {
        summary.favoredPlayerCount += 1;
      } else {
        summary.underdogCount += 1;
      }

      return summary;
    },
    {
      favoredPlayerCount: 0,
      underdogCount: 0,
      neutralCount: 0,
    },
  );
}

function favoriteNameFromMatch(match: MatchPredictionViewModel) {
  if (match.favoredPlayerId === match.playerA.id) {
    return match.playerA.name;
  }

  return match.playerB.name;
}

function topFactorForPrediction(
  factors: FactorInsightViewModel[],
  favoredPlayerId: string | null | undefined,
) {
  return (
    factors.find((factor) => factor.favoredPlayerId === favoredPlayerId) ??
    factors.find((factor) => factor.favoredPlayerId !== null) ??
    null
  );
}

function topCounterFactorForPrediction(
  factors: FactorInsightViewModel[],
  favoredPlayerId: string | null | undefined,
) {
  return (
    factors.find((factor) => factor.favoredPlayerId && factor.favoredPlayerId !== favoredPlayerId) ?? null
  );
}

function completenessScore(match: MatchPredictionViewModel, factors: FactorInsightViewModel[]) {
  let score = 0;

  if (match.playerA.ranking) score += 1;
  if (match.playerB.ranking) score += 1;
  if (match.scheduledAt) score += 1;
  if (match.confidenceScore !== null && match.confidenceScore !== undefined) score += 1;
  if (factors.length >= 4) score += 1;

  return score;
}

function recommendationScore(
  match: MatchPredictionViewModel,
  factors: FactorInsightViewModel[],
  agreement: { favoredPlayerCount: number; underdogCount: number; neutralCount: number },
) {
  const favoriteProbability = favoriteProbabilityFromMatch(match);
  const confidenceScore = match.confidenceScore ?? 0;
  const topFactor = topFactorForPrediction(factors, match.favoredPlayerId);
  const stability =
    agreement.favoredPlayerCount -
    agreement.underdogCount +
    Math.min(1, agreement.neutralCount * 0.15);

  return (
    confidenceScore * 1000 +
    favoriteProbability * 100 +
    stability * 12 +
    (topFactor?.edgeMagnitude ?? 0) * 80
  );
}

function makeRankedPredictionViewModel(
  match: MatchPredictionViewModel,
  prediction: MatchPrediction,
): RankedPredictionViewModel {
  const factors = buildFactorInsights(prediction, match.playerA, match.playerB);
  const supportingFactors = factors.filter((factor) => factor.favoredPlayerId === match.favoredPlayerId);
  const counterFactors = factors.filter(
    (factor) => factor.favoredPlayerId && factor.favoredPlayerId !== match.favoredPlayerId,
  );
  const factorAgreement = factorAgreementSummary(factors, match.favoredPlayerId);
  const favoriteProbability = favoriteProbabilityFromMatch(match);
  const dataCompleteness = completenessScore(match, factors);

  return {
    match,
    favoriteName: favoriteNameFromMatch(match),
    favoriteProbability,
    confidenceScore: match.confidenceScore ?? null,
    confidenceLabel: match.confidenceLabel ?? null,
    factors,
    supportingFactors,
    counterFactors,
    factorAgreement,
    topFactor: topFactorForPrediction(factors, match.favoredPlayerId),
    topCounterFactor: topCounterFactorForPrediction(factors, match.favoredPlayerId),
    recommendationScore: recommendationScore(match, factors, factorAgreement),
    stabilityScore: factorAgreement.favoredPlayerCount - factorAgreement.underdogCount,
    dataCompleteness,
  };
}

function factorMagnitudeLabel(factor: FactorInsightViewModel) {
  if (factor.label.toLowerCase().includes("elo")) {
    return `${factor.playerAValue > factor.playerBValue ? "+" : "+"}${Math.round(Math.abs(factor.playerAValue - factor.playerBValue))}`;
  }

  if (
    factor.label.toLowerCase().includes("rate") ||
    factor.label.toLowerCase().includes("form") ||
    factor.label.toLowerCase().includes("quality")
  ) {
    return `+${Math.round(Math.abs(factor.playerAValue - factor.playerBValue) * 10) / 10}`;
  }

  return `+${Math.round(factor.edgeMagnitude * 100)}%`;
}

function buildCommentary(
  rankedRecommendations: RankedPredictionViewModel[],
  topSignals: TopSignalViewModel[],
  healthMessage: string | null,
) {
  const strongest = rankedRecommendations[0] ?? null;
  const stablePick = rankedRecommendations.find((entry) => entry.stabilityScore >= 3) ?? strongest;
  const cautionPick = rankedRecommendations.find((entry) => entry.counterFactors.length > 0) ?? null;
  const strongestSignal = topSignals[0] ?? null;

  return {
    summary: strongest
      ? `${strongest.favoriteName} leads the current slate at ${Math.round(
          strongest.favoriteProbability * 100,
        )}% with ${strongest.factorAgreement.favoredPlayerCount} supporting factors.`
      : "No published ATP predictions are currently available.",
    stableNote: stablePick?.topFactor
      ? `${stablePick.match.playerA.name} vs ${stablePick.match.playerB.name} is the cleanest read because ${stablePick.topFactor.summary.toLowerCase()}.`
      : "Signal agreement is unavailable until the next prediction refresh.",
    cautionNote: cautionPick?.topCounterFactor
      ? `${cautionPick.match.playerA.name} vs ${cautionPick.match.playerB.name} still carries a counter-signal through ${cautionPick.topCounterFactor.label.toLowerCase()}.`
      : strongestSignal
        ? `${strongestSignal.factor.label} is driving the headline edge, but supporting signals remain more important than any single factor.`
        : "No meaningful counter-signals were available in the current slate snapshot.",
    dataNote:
      healthMessage ??
      "Predictions are generated from the latest stored ATP slate and remain explainable through the factor breakdown shown below.",
  };
}

function buildConfidenceDistribution(rankedRecommendations: RankedPredictionViewModel[]) {
  const buckets: Array<{ key: ConfidenceLabel; label: string; count: number }> = [
    { key: "low", label: "Low", count: 0 },
    { key: "moderate", label: "Moderate", count: 0 },
    { key: "high", label: "High", count: 0 },
    { key: "very_high", label: "Very High", count: 0 },
  ];

  for (const recommendation of rankedRecommendations) {
    const key = recommendation.confidenceLabel;
    const bucket = buckets.find((entry) => entry.key === key);
    if (bucket) {
      bucket.count += 1;
    }
  }

  const averageConfidenceScore =
    rankedRecommendations.reduce((sum, entry) => sum + (entry.confidenceScore ?? 0), 0) /
    Math.max(1, rankedRecommendations.length);

  return {
    totalCount: rankedRecommendations.length,
    averageConfidenceScore,
    highlightedBucket: buildConfidenceLabel(averageConfidenceScore),
    buckets,
  };
}

function buildPredictionLedgerStatus(
  result: "won" | "lost" | "void",
): Pick<PredictionLedgerEntryViewModel, "status" | "statusLabel"> {
  switch (result) {
    case "won":
      return {
        status: "correct",
        statusLabel: "Correct",
      };
    case "lost":
      return {
        status: "incorrect",
        statusLabel: "Incorrect",
      };
    default:
      return {
        status: "void",
        statusLabel: "Void",
      };
  }
}

function livePredictionLedgerEntry(
  entry: RankedPredictionViewModel,
): PredictionLedgerEntryViewModel {
  return {
    matchId: entry.match.matchId,
    detailHref: `/match/${entry.match.matchId}`,
    matchLabel: matchLabel(entry.match),
    tournamentLabel: `${entry.match.tournamentName} · ${entry.match.round ?? "Round unavailable"} · ${entry.match.surface ?? "Surface unavailable"}`,
    favoriteName: entry.favoriteName,
    favoriteProbability: entry.favoriteProbability,
    confidenceScore: entry.confidenceScore,
    confidenceLabel: entry.confidenceLabel,
    status: "upcoming",
    statusLabel: "Upcoming",
    settledScore: null,
    settledWinnerName: null,
    generatedAt: entry.match.generatedAt ?? entry.match.matchDate,
    modelVersion: entry.match.modelVersion ?? "baseline-v5",
    topFactorLabel: entry.topFactor?.label ?? null,
    matchDate: entry.match.matchDate,
    scheduledAt: entry.match.scheduledAt ?? null,
  };
}

function archivedPredictionLedgerEntry(
  entry: Awaited<ReturnType<typeof getPredictionLedgerEntries>>[number],
): PredictionLedgerEntryViewModel {
  const favoriteProbability =
    entry.favoritePlayerId === entry.playerAId
      ? entry.playerAWinProbability
      : entry.playerBWinProbability;
  const status = buildPredictionLedgerStatus(entry.predictionResult);

  return {
    matchId: entry.matchId,
    detailHref:
      entry.matchStatus === "completed" && entry.settledWinnerId ? `/match/${entry.matchId}` : null,
    matchLabel: `${entry.playerAName} vs ${entry.playerBName}`,
    tournamentLabel: `${entry.tournamentName} · ${entry.round} · ${entry.surface}`,
    favoriteName: entry.favoritePlayerName,
    favoriteProbability,
    confidenceScore: entry.confidence,
    confidenceLabel: buildConfidenceLabel(entry.confidence),
    status: status.status,
    statusLabel: status.statusLabel,
    settledScore: entry.settledScore,
    settledWinnerName: entry.settledWinnerName,
    generatedAt: entry.generatedAt,
    modelVersion: entry.modelVersion,
    topFactorLabel: null,
    matchDate: entry.matchDate,
    scheduledAt: entry.scheduledAt,
  };
}

function buildYesterdayPerformance(
  historicalSnapshots: HistoricalMatchFeatureSnapshot[],
  playersById: Map<string, ActivePlayer>,
  rankingByPlayerId: Map<string, number | null>,
  tournamentsById: Map<string, { name: string }>,
): YesterdayPerformanceViewModel | null {
  const yesterdayKey = zonedDateKey(addDays(new Date(), -1));
  const relevantSnapshots = historicalSnapshots.filter((snapshot) => snapshot.matchDate === yesterdayKey);

  if (relevantSnapshots.length === 0) {
    return null;
  }

  const ranked = relevantSnapshots.map((snapshot) => {
    const prediction = generatePredictionFromFeatureSnapshot(snapshot);
    const match = mapHistoricalMatchViewModel(
      snapshot,
      prediction,
      tournamentsById.get(snapshot.tournamentId)?.name ?? snapshot.tournamentId,
      playerSummaryForId(snapshot.playerAId, playersById, rankingByPlayerId),
      playerSummaryForId(snapshot.playerBId, playersById, rankingByPlayerId),
    );

    return {
      match,
      prediction,
      favoriteProbability: favoriteProbabilityFromMatch(match),
      predictionCorrect: prediction.favoritePlayerId === snapshot.actualWinnerId,
    };
  });

  const correct = ranked.filter((entry) => entry.predictionCorrect);
  const highConfidence = ranked.filter((entry) => entry.match.confidenceLabel === "high" || entry.match.confidenceLabel === "very_high");
  const brierScore =
    ranked.reduce((sum, entry) => {
      const actual = entry.predictionCorrect ? 1 : 0;
      return sum + (entry.favoriteProbability - actual) ** 2;
    }, 0) / Math.max(1, ranked.length);
  const mostConfidentCorrect = [...correct].sort((left, right) => right.favoriteProbability - left.favoriteProbability)[0];
  const misses = ranked.filter((entry) => !entry.predictionCorrect);
  const mostConfidentMiss = [...misses].sort((left, right) => right.favoriteProbability - left.favoriteProbability)[0];

  return {
    dateKey: yesterdayKey,
    label: `Yesterday · ${formatDateKeyLabel(yesterdayKey)}`,
    predictionsMade: ranked.length,
    settledCount: ranked.length,
    unsettledCount: 0,
    correctCount: correct.length,
    accuracy: correct.length / Math.max(1, ranked.length),
    averageFavoriteProbability:
      ranked.reduce((sum, entry) => sum + entry.favoriteProbability, 0) / Math.max(1, ranked.length),
    averageConfidenceScore:
      ranked.reduce((sum, entry) => sum + (entry.match.confidenceScore ?? 0), 0) / Math.max(1, ranked.length),
    brierScore,
    highConfidenceAccuracy:
      highConfidence.length > 0
        ? highConfidence.filter((entry) => entry.predictionCorrect).length / highConfidence.length
        : null,
    highConfidenceSample: highConfidence.length,
    mostConfidentCorrect: mostConfidentCorrect
      ? {
          matchId: mostConfidentCorrect.match.matchId,
          label: matchLabel(mostConfidentCorrect.match),
          probability: mostConfidentCorrect.favoriteProbability,
        }
      : null,
    mostConfidentMiss: mostConfidentMiss
      ? {
          matchId: mostConfidentMiss.match.matchId,
          label: matchLabel(mostConfidentMiss.match),
          probability: mostConfidentMiss.favoriteProbability,
        }
      : null,
  };
}

export async function getPredictionsPageViewModel(): Promise<PredictionsPageViewModel> {
  const [
    playersById,
    tournamentsById,
    upcomingRows,
    historicalSnapshots,
    upcomingSummary,
    upcomingHealth,
    modelHealth,
    archivedLedgerRows,
  ] = await Promise.all([
    getLocalPlayersById(),
    getLocalTournamentsById(),
    getUpcomingPredictionSnapshots(),
    getHistoricalFeatureSnapshots(),
    getUpcomingPredictionSummary(),
    getUpcomingRefreshHealth(),
    getLatestModelHealthEvaluation(),
    getPredictionLedgerEntries(),
  ]);

  const rankingByPlayerId = await loadRankingByPlayerId();

  const rankedRecommendations = upcomingRows
    .map((entry) => {
      const match = mapUpcomingMatchViewModel(
        entry,
        playerSummaryForId(entry.snapshot.playerAId, playersById, rankingByPlayerId),
        playerSummaryForId(entry.snapshot.playerBId, playersById, rankingByPlayerId),
      );

      return makeRankedPredictionViewModel(match, entry.prediction);
    })
    .sort((left, right) => {
      if (right.recommendationScore !== left.recommendationScore) {
        return right.recommendationScore - left.recommendationScore;
      }

      if ((right.confidenceScore ?? 0) !== (left.confidenceScore ?? 0)) {
        return (right.confidenceScore ?? 0) - (left.confidenceScore ?? 0);
      }

      return right.favoriteProbability - left.favoriteProbability;
    });

  const topSignals = rankedRecommendations
    .flatMap((entry) =>
      entry.supportingFactors.map((factor) => ({
        id: `${entry.match.matchId}-${factor.key}`,
        matchId: entry.match.matchId,
        matchLabel: matchLabel(entry.match),
        tournamentName: entry.match.tournamentName,
        surface: entry.match.surface,
        favoriteName: entry.favoriteName,
        factor,
      })),
    )
    .sort((left, right) => right.factor.edgeMagnitude - left.factor.edgeMagnitude)
    .slice(0, 6);

  const biggestEdges = rankedRecommendations
    .flatMap((entry) => {
      const strongest = entry.topFactor;
      if (!strongest) {
        return [];
      }

      return [
        {
          id: `edge-${entry.match.matchId}`,
          matchId: entry.match.matchId,
          matchLabel: matchLabel(entry.match),
          tournamentName: entry.match.tournamentName,
          surface: entry.match.surface,
          favoredPlayerName: entry.favoriteName,
          factorLabel: strongest.label,
          strength: strongest.strength,
          magnitudeLabel: factorMagnitudeLabel(strongest),
          summary: strongest.summary,
          stabilityLabel: `${entry.factorAgreement.favoredPlayerCount} of ${entry.factors.length} factors align`,
        } satisfies ModelEdgeViewModel,
      ];
    })
    .sort((left, right) => {
      const leftMagnitude = Number(left.magnitudeLabel.replace(/[^0-9.]/g, "")) || 0;
      const rightMagnitude = Number(right.magnitudeLabel.replace(/[^0-9.]/g, "")) || 0;
      return rightMagnitude - leftMagnitude;
    })
    .slice(0, 4);

  const confidenceDistribution = buildConfidenceDistribution(rankedRecommendations);
  const averageFavoriteProbability =
    rankedRecommendations.reduce((sum, entry) => sum + entry.favoriteProbability, 0) /
    Math.max(1, rankedRecommendations.length);

  const futureMatchCount = rankedRecommendations.filter((entry) => matchOverviewDateKey(entry.match) > zonedDateKey(new Date())).length;
  const freshnessStatus = buildUpcomingFreshnessStatus({
    generatedAt: upcomingSummary.generatedAt,
    futureMatchCount,
    healthStatus: upcomingHealth?.status ?? null,
  });
  const healthMessage =
    upcomingHealth?.status === "rate_limited"
      ? "RapidAPI quota is currently exhausted, so the page is showing the most recently stored ATP prediction slate."
      : upcomingHealth?.message ?? null;
  const archivedLedgerKeys = new Set(
    archivedLedgerRows.map((entry) => `${entry.matchId}::${entry.modelVersion}`),
  );
  const liveLedger = rankedRecommendations
    .filter(
      (entry) =>
        !archivedLedgerKeys.has(
          `${entry.match.matchId}::${entry.match.modelVersion ?? "baseline-v5"}`,
        ),
    )
    .sort((left, right) => compareUpcomingMatchTime(left.match, right.match))
    .map(livePredictionLedgerEntry);
  const archivedLedger = archivedLedgerRows.map(archivedPredictionLedgerEntry);

  return {
    freshnessLabel: freshnessStatus.label,
    freshnessTone: freshnessStatus.tone,
    hero: {
      dateLabel: formatCompactDateLabel(new Date()),
      matchesAnalyzed: upcomingRows.length,
      publishedPicks: rankedRecommendations.length,
      totalPredictions: rankedRecommendations.length,
      averageFavoriteProbability,
      averageConfidenceScore: confidenceDistribution.averageConfidenceScore,
      highestConfidencePrediction: rankedRecommendations[0] ?? null,
      strongestSignal: topSignals[0] ?? null,
      topConfidence: rankedRecommendations[0]?.favoriteProbability ?? 0,
      bestAgreementLabel: rankedRecommendations[0]
        ? `${rankedRecommendations[0].factorAgreement.favoredPlayerCount}/${rankedRecommendations[0].factors.length}`
        : "Unavailable",
      primaryModelVersion: modelHealth?.evaluation.primary_model_version ?? "baseline-v5",
      generatedAt: upcomingSummary.generatedAt,
      healthMessage,
    },
    commentary: buildCommentary(rankedRecommendations, topSignals, healthMessage),
    confidenceDistribution,
    topSignals,
    rankedRecommendations: rankedRecommendations.slice(0, 8),
    biggestEdges,
    yesterdayPerformance: buildYesterdayPerformance(
      historicalSnapshots,
      playersById,
      rankingByPlayerId,
      tournamentsById,
    ),
    predictionLedger: [...liveLedger, ...archivedLedger],
  };
}

function toRecentMatchViewModel(
  match: {
    id: string;
    match_date: string;
    round: MatchRound;
    surface: Surface;
    winner_id: string;
    loser_id: string;
    score: string | null;
    tournament_id: string;
  },
  playerId: string,
  playersById: Map<string, ActivePlayer>,
  tournamentNameById: Map<string, string>,
  rankingByMatchPlayerKey: Map<string, number | null>,
): RecentMatchViewModel {
  const won = match.winner_id === playerId;
  const opponentId = won ? match.loser_id : match.winner_id;

  return {
    matchId: match.id,
    date: match.match_date,
    tournamentName: tournamentNameById.get(match.tournament_id) ?? match.tournament_id,
    round: match.round,
    surface: match.surface,
    result: won ? "W" : "L",
    opponentName: playersById.get(opponentId)?.full_name ?? opponentId,
    opponentCountryCode: playersById.get(opponentId)?.country_code,
    playerRanking: rankingByMatchPlayerKey.get(`${match.id}:${playerId}`) ?? null,
    opponentRanking: rankingByMatchPlayerKey.get(`${match.id}:${opponentId}`) ?? null,
    score: match.score,
  };
}

export async function getMatchDetailViewModel(matchId: string): Promise<MatchDetailViewModel | null> {
  const [localDetail, playersById, historicalDataset, modelHealth] = await Promise.all([
    getMatchDetailById(matchId),
    getLocalPlayersById(),
    loadActiveHistoricalDataset(),
    getLatestModelHealthEvaluation(),
  ]);

  const detail = localDetail ?? (await getArchivedPredictionMatchById(matchId));

  if (!detail) {
    return null;
  }

  const rankingByPlayerId = await loadRankingByPlayerId();
  const playerA: PlayerSummary = {
    id: detail.snapshot.playerAId,
    name: playersById.get(detail.snapshot.playerAId)?.full_name ?? detail.snapshot.playerAId,
    countryCode: playersById.get(detail.snapshot.playerAId)?.country_code,
    ranking: rankingByPlayerId.get(detail.snapshot.playerAId) ?? null,
  };
  const playerB: PlayerSummary = {
    id: detail.snapshot.playerBId,
    name: playersById.get(detail.snapshot.playerBId)?.full_name ?? detail.snapshot.playerBId,
    countryCode: playersById.get(detail.snapshot.playerBId)?.country_code,
    ranking: rankingByPlayerId.get(detail.snapshot.playerBId) ?? null,
  };

  const matchVm: MatchPredictionViewModel = {
    matchId: detail.match.id,
    tournamentName: detail.match.tournamentName,
    tournamentLevel: detail.snapshot.tournamentLevel,
    round: detail.snapshot.round,
    surface: detail.snapshot.surface,
    scheduledAt: detail.match.scheduledAt ?? null,
    providerTimeLabel: detail.match.providerTimeLabel ?? null,
    matchDate: detail.match.matchDate,
    city: detail.match.city ?? null,
    countryCode: detail.match.countryCode ?? null,
    tournamentStartDate: detail.match.tournamentStartDate ?? null,
    tournamentEndDate: detail.match.tournamentEndDate ?? null,
    bestOf: detail.match.bestOf ?? detail.snapshot.bestOf ?? null,
    status: detail.kind === "upcoming" ? "prediction_ready" : "settled",
    playerA,
    playerB,
    playerAProbability: detail.prediction.playerAWinProbability,
    playerBProbability: detail.prediction.playerBWinProbability,
    favoredPlayerId: detail.prediction.favoritePlayerId,
    confidenceScore: detail.prediction.confidence,
    confidenceLabel: buildConfidenceLabel(detail.prediction.confidence),
    modelVersion: detail.prediction.modelVersion,
    generatedAt: detail.prediction.generatedAt,
    actualWinnerId:
      detail.kind === "historical" && "actualWinnerId" in detail.snapshot
        ? detail.snapshot.actualWinnerId
        : null,
  };

  const factors = buildFactorInsights(detail.prediction, playerA, playerB);
  const favoredPlayerName =
    matchVm.favoredPlayerId === playerA.id ? playerA.name : playerB.name;
  const underdogPlayerName =
    matchVm.favoredPlayerId === playerA.id ? playerB.name : playerA.name;
  const supportingFactors = factors.filter((factor) => factor.favoredPlayerId === matchVm.favoredPlayerId);
  const counterFactors = factors.filter(
    (factor) => factor.favoredPlayerId && factor.favoredPlayerId !== matchVm.favoredPlayerId,
  );

  const comparisonRows: ComparisonRowViewModel[] = [
    {
      label: "ATP ranking",
      playerAValue: playerA.ranking ? `${playerA.ranking}` : "Unavailable",
      playerBValue: playerB.ranking ? `${playerB.ranking}` : "Unavailable",
      favoredPlayerId:
        playerA.ranking && playerB.ranking
          ? playerA.ranking < playerB.ranking
            ? playerA.id
            : playerB.ranking < playerA.ranking
              ? playerB.id
              : null
          : null,
      strength: "slight",
    },
    {
      label: "Overall Elo",
      playerAValue: formatMetricValue(detail.snapshot.playerAOverallElo, 0),
      playerBValue: formatMetricValue(detail.snapshot.playerBOverallElo, 0),
      favoredPlayerId:
        detail.snapshot.playerAOverallElo === detail.snapshot.playerBOverallElo
          ? null
          : detail.snapshot.playerAOverallElo > detail.snapshot.playerBOverallElo
            ? playerA.id
            : playerB.id,
      strength: factorStrength(Math.abs(detail.snapshot.playerAOverallEloEdge / 400)),
    },
    {
      label: `${detail.snapshot.surface[0].toUpperCase()}${detail.snapshot.surface.slice(1)} Elo`,
      playerAValue: formatMetricValue(detail.snapshot.playerASurfaceElo, 0),
      playerBValue: formatMetricValue(detail.snapshot.playerBSurfaceElo, 0),
      favoredPlayerId:
        detail.snapshot.playerASurfaceElo === detail.snapshot.playerBSurfaceElo
          ? null
          : detail.snapshot.playerASurfaceElo > detail.snapshot.playerBSurfaceElo
            ? playerA.id
            : playerB.id,
      strength: factorStrength(Math.abs(detail.snapshot.playerASurfaceEloEdge / 400)),
    },
    {
      label: "Recent form",
      playerAValue: formatMetricValue(detail.snapshot.playerARecentForm),
      playerBValue: formatMetricValue(detail.snapshot.playerBRecentForm),
      favoredPlayerId:
        detail.snapshot.playerARecentForm === detail.snapshot.playerBRecentForm
          ? null
          : detail.snapshot.playerARecentForm > detail.snapshot.playerBRecentForm
            ? playerA.id
            : playerB.id,
      strength: factorStrength(Math.abs(detail.snapshot.playerARecentFormEdge / 100)),
    },
    {
      label: "Surface form",
      playerAValue: formatMetricValue(detail.snapshot.playerASurfaceRecentForm),
      playerBValue: formatMetricValue(detail.snapshot.playerBSurfaceRecentForm),
      favoredPlayerId:
        detail.snapshot.playerASurfaceRecentForm === undefined ||
        detail.snapshot.playerBSurfaceRecentForm === undefined
          ? null
          : detail.snapshot.playerASurfaceRecentForm > detail.snapshot.playerBSurfaceRecentForm
            ? playerA.id
            : detail.snapshot.playerBSurfaceRecentForm > detail.snapshot.playerASurfaceRecentForm
              ? playerB.id
              : null,
      strength: detail.snapshot.playerASurfaceRecentFormEdge
        ? factorStrength(Math.abs(detail.snapshot.playerASurfaceRecentFormEdge / 100))
        : "neutral",
    },
    {
      label: "Surface win rate",
      playerAValue: `${formatMetricValue(detail.snapshot.playerASurfaceWinRate)}%`,
      playerBValue: `${formatMetricValue(detail.snapshot.playerBSurfaceWinRate)}%`,
      favoredPlayerId:
        detail.snapshot.playerASurfaceWinRate === detail.snapshot.playerBSurfaceWinRate
          ? null
          : detail.snapshot.playerASurfaceWinRate > detail.snapshot.playerBSurfaceWinRate
            ? playerA.id
            : playerB.id,
      strength: factorStrength(Math.abs(detail.snapshot.playerASurfaceWinRateEdge / 100)),
    },
    {
      label: "Opponent quality",
      playerAValue: formatMetricValue(detail.snapshot.playerAOpponentQuality, 0),
      playerBValue: formatMetricValue(detail.snapshot.playerBOpponentQuality, 0),
      favoredPlayerId:
        detail.snapshot.playerAOpponentQuality === detail.snapshot.playerBOpponentQuality
          ? null
          : detail.snapshot.playerAOpponentQuality > detail.snapshot.playerBOpponentQuality
            ? playerA.id
            : playerB.id,
      strength: factorStrength(Math.abs(detail.snapshot.playerAOpponentQualityEdge / 400)),
    },
    {
      label: "Rest days",
      playerAValue: formatMetricValue(detail.snapshot.playerARestDays, 0),
      playerBValue: formatMetricValue(detail.snapshot.playerBRestDays, 0),
      favoredPlayerId:
        detail.snapshot.playerARestDays === null || detail.snapshot.playerBRestDays === null
          ? null
          : detail.snapshot.playerARestDays > detail.snapshot.playerBRestDays
            ? playerA.id
            : detail.snapshot.playerBRestDays > detail.snapshot.playerARestDays
              ? playerB.id
              : null,
      strength:
        detail.snapshot.playerARestDaysEdge === null
          ? "neutral"
          : factorStrength(Math.abs(detail.snapshot.playerARestDaysEdge / 14)),
      note:
        detail.prediction.modelVersion === "baseline-v5"
          ? "Tracked for context, not currently used in scoring"
          : undefined,
    },
    {
      label: "Head-to-head",
      playerAValue: formatMetricValue(detail.snapshot.playerAH2HWins, 0),
      playerBValue: formatMetricValue(detail.snapshot.playerBH2HWins, 0),
      favoredPlayerId:
        detail.snapshot.playerAH2HWins === detail.snapshot.playerBH2HWins
          ? null
          : detail.snapshot.playerAH2HWins > detail.snapshot.playerBH2HWins
            ? playerA.id
            : playerB.id,
      strength: factorStrength(Math.abs(detail.snapshot.playerAH2HEdge / 10)),
    },
    {
      label: "Serve strength proxy",
      playerAValue: `${formatMetricValue(detail.snapshot.playerASurfaceServicePointsWon)}%`,
      playerBValue: `${formatMetricValue(detail.snapshot.playerBSurfaceServicePointsWon)}%`,
      favoredPlayerId:
        detail.snapshot.playerASurfaceServicePointsWon === undefined ||
        detail.snapshot.playerBSurfaceServicePointsWon === undefined
          ? null
          : detail.snapshot.playerASurfaceServicePointsWon > detail.snapshot.playerBSurfaceServicePointsWon
            ? playerA.id
            : detail.snapshot.playerBSurfaceServicePointsWon > detail.snapshot.playerASurfaceServicePointsWon
              ? playerB.id
              : null,
      strength: detail.snapshot.playerASurfaceServicePointsWonEdge
        ? factorStrength(Math.abs(detail.snapshot.playerASurfaceServicePointsWonEdge / 100))
        : "neutral",
    },
    {
      label: "Return strength proxy",
      playerAValue: `${formatMetricValue(detail.snapshot.playerASurfaceReturnPointsWon)}%`,
      playerBValue: `${formatMetricValue(detail.snapshot.playerBSurfaceReturnPointsWon)}%`,
      favoredPlayerId:
        detail.snapshot.playerASurfaceReturnPointsWon === undefined ||
        detail.snapshot.playerBSurfaceReturnPointsWon === undefined
          ? null
          : detail.snapshot.playerASurfaceReturnPointsWon > detail.snapshot.playerBSurfaceReturnPointsWon
            ? playerA.id
            : detail.snapshot.playerBSurfaceReturnPointsWon > detail.snapshot.playerASurfaceReturnPointsWon
              ? playerB.id
              : null,
      strength: detail.snapshot.playerASurfaceReturnPointsWonEdge
        ? factorStrength(Math.abs(detail.snapshot.playerASurfaceReturnPointsWonEdge / 100))
        : "neutral",
    },
  ];

  const tournamentNameById = new Map(
    historicalDataset.tournaments.map((tournament) => [tournament.id, tournament.name]),
  );
  const rankingByMatchPlayerKey = new Map(
    historicalDataset.matchEntries.map((entry) => [
      `${entry.match_id}:${entry.player_id}`,
      entry.ranking_at_match,
    ]),
  );
  const relatedMatches = historicalDataset.matches
    .filter(
      (match) =>
        match.winner_id === playerA.id ||
        match.loser_id === playerA.id ||
        match.winner_id === playerB.id ||
        match.loser_id === playerB.id,
    )
    .sort((left, right) => right.match_date.localeCompare(left.match_date));

  const playerARecentForm = relatedMatches
    .filter((match) => match.winner_id === playerA.id || match.loser_id === playerA.id)
    .map((match) =>
      toRecentMatchViewModel(
        match,
        playerA.id,
        playersById,
        tournamentNameById,
        rankingByMatchPlayerKey,
      ),
    );

  const playerBRecentForm = relatedMatches
    .filter((match) => match.winner_id === playerB.id || match.loser_id === playerB.id)
    .map((match) =>
      toRecentMatchViewModel(
        match,
        playerB.id,
        playersById,
        tournamentNameById,
        rankingByMatchPlayerKey,
      ),
    );

  const playerASurfaceForm = playerARecentForm.filter(
    (match) => match.surface === detail.snapshot.surface,
  );
  const playerBSurfaceForm = playerBRecentForm.filter(
    (match) => match.surface === detail.snapshot.surface,
  );
  const headToHeadMatches = historicalDataset.matches
    .filter(
      (match) =>
        (match.winner_id === playerA.id && match.loser_id === playerB.id) ||
        (match.winner_id === playerB.id && match.loser_id === playerA.id),
    )
    .sort((left, right) => right.match_date.localeCompare(left.match_date))
    .map((match) =>
      toRecentMatchViewModel(
        match,
        playerA.id,
        playersById,
        tournamentNameById,
        rankingByMatchPlayerKey,
      ),
    );

  const favoriteWinProbability = Math.max(
    detail.prediction.playerAWinProbability,
    detail.prediction.playerBWinProbability,
  );
  const confidenceBucket = probabilityBucket(favoriteWinProbability);
  const surfaceContext = modelHealth?.segments.surface.find(
    (row) => row.segment_key === detail.snapshot.surface,
  );
  const bucketContext = modelHealth?.calibrationBuckets.find(
    (bucket) => bucket.bucket_label === confidenceBucket,
  );

  return {
    match: matchVm,
    kind: detail.kind,
    actualWinnerName: detail.actualWinnerName ?? null,
    favoredPlayerName,
    underdogPlayerName,
    favoriteWinProbability,
    projection: detail.prediction.projection,
    factors,
    supportingFactors,
    counterFactors,
    factorAgreement: {
      favoredPlayerCount: supportingFactors.filter((factor) => factor.strength !== "neutral").length,
      underdogCount: counterFactors.filter((factor) => factor.strength !== "neutral").length,
      neutralCount: factors.filter((factor) => factor.strength === "neutral").length,
    },
    comparisonRows,
    playerARecentForm: playerARecentForm.slice(0, 6),
    playerBRecentForm: playerBRecentForm.slice(0, 6),
    playerASurfaceForm: playerASurfaceForm.slice(0, 5),
    playerBSurfaceForm: playerBSurfaceForm.slice(0, 5),
    headToHeadMatches: headToHeadMatches.slice(0, 5),
    similarContext: modelHealth
      ? {
          surfaceAccuracy: surfaceContext?.accuracy ?? null,
          surfaceSample: surfaceContext?.match_count ?? null,
          confidenceBucket,
          confidenceBucketAccuracy: bucketContext?.actual_favorite_win_rate ?? null,
          confidenceBucketSample: bucketContext?.match_count ?? null,
          primaryModelVersion: modelHealth.evaluation.primary_model_version,
        }
      : null,
  };
}
