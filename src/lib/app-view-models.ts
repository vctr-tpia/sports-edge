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
  getUpcomingPredictionSummary,
} from "@/src/lib/local-data";
import { getLatestModelHealthEvaluation } from "@/src/lib/model-health";
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
  generatedAt: string;
  metricCards: Array<{ label: string; value: string; detail: string }>;
  featuredMatch: MatchPredictionViewModel | null;
  featuredPrediction: MatchPrediction | null;
  featuredFactors: FactorInsightViewModel[];
  upcomingMatches: MatchPredictionViewModel[];
  confidenceDistribution: Array<{ label: string; count: number }>;
  performanceHighlights: Array<{ label: string; value: string; detail: string }>;
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
  const [playersById, upcomingRows, upcomingSummary, modelHealth] =
    await Promise.all([
      getLocalPlayersById(),
      getUpcomingPredictionSnapshots(),
      getUpcomingPredictionSummary(),
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

  const featuredMatch = [...upcomingMatches].sort(
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
    upcomingMatches.reduce((sum, row) => sum + (row.confidenceScore ?? 0), 0) /
    Math.max(1, upcomingMatches.length);
  const confidenceCounts = ["low", "moderate", "high", "very_high"].map((label) => ({
    label,
    count: upcomingMatches.filter((match) => match.confidenceLabel === label).length,
  }));

  return {
    freshnessLabel: formatRelativeMinutes(upcomingSummary.generatedAt),
    generatedAt: upcomingSummary.generatedAt,
    metricCards: [
      {
        label: "Upcoming matches",
        value: `${upcomingSummary.upcomingMatchCount}`,
        detail: "Matches currently mapped into the ATP prediction pipeline",
      },
      {
        label: "Predictions ready",
        value: `${upcomingMatches.length}`,
        detail: "Upcoming ATP matches with a generated pre-match probability",
      },
      {
        label: "Avg confidence",
        value: `${Math.round(averageConfidence * 100)}%`,
        detail: "Average confidence across the current upcoming ATP slate",
      },
      {
        label: "Primary model",
        value: modelHealth?.evaluation.primary_model_version ?? "baseline-v5",
        detail: "Current flagship explainable baseline shown across the MVP",
      },
    ],
    featuredMatch,
    featuredPrediction,
    featuredFactors,
    upcomingMatches: upcomingMatches.slice(0, 12),
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
  const [playersById, upcomingRows, upcomingSummary] = await Promise.all([
    getLocalPlayersById(),
    getUpcomingPredictionSnapshots(),
    getUpcomingPredictionSummary(),
  ]);
  const rankingByPlayerId = await loadRankingByPlayerId();

  let rows = upcomingRows.map((entry) =>
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

  return {
    freshnessLabel: formatRelativeMinutes(upcomingSummary.generatedAt),
    tournaments: [...new Set(upcomingRows.map((entry) => entry.match.tournament_name))].sort(),
    matches: rows,
  };
}

export async function getPredictionsDirectoryViewModel(filters: DirectoryFilters = {}) {
  const [playersById, tournamentsById, upcomingRows, historicalSnapshots, upcomingSummary] =
    await Promise.all([
      getLocalPlayersById(),
      getLocalTournamentsById(),
      getUpcomingPredictionSnapshots(),
      getHistoricalFeatureSnapshots(40),
      getUpcomingPredictionSummary(),
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

  return {
    freshnessLabel: formatRelativeMinutes(upcomingSummary.generatedAt),
    predictions: rows,
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
  const [detail, playersById, historicalDataset, modelHealth] = await Promise.all([
    getMatchDetailById(matchId),
    getLocalPlayersById(),
    loadActiveHistoricalDataset(),
    getLatestModelHealthEvaluation(),
  ]);

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
