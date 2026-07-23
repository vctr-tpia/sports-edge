import { Card } from "@/components/ui/card";
import type { MatchDetailViewModel } from "@/src/lib/app-view-models";
import { formatPercent, resultState, sentenceCase } from "@/components/match-detail/helpers";
import { cn } from "@/src/lib/cn";

export function ResultContextCard({ detail }: { detail: MatchDetailViewModel }) {
  const settled = resultState(detail);
  const confidenceBucketAccuracy =
    detail.similarContext?.confidenceBucketAccuracy !== null &&
    detail.similarContext?.confidenceBucketAccuracy !== undefined
      ? formatPercent(detail.similarContext.confidenceBucketAccuracy)
      : "Unavailable";
  const surfaceAccuracy =
    detail.similarContext?.surfaceAccuracy !== null &&
    detail.similarContext?.surfaceAccuracy !== undefined
      ? formatPercent(detail.similarContext.surfaceAccuracy)
      : "Unavailable";
  const hasEvaluation =
    confidenceBucketAccuracy !== "Unavailable" || surfaceAccuracy !== "Unavailable";

  return (
    <Card className="rounded-[24px] p-6 sm:p-7">
      <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-ink sm:text-[24px]">
        Model context
      </h2>
      <p className="mt-2 text-[14px] text-inkSecondary">
        Accountability is part of the product.
      </p>

      {hasEvaluation ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-[18px] bg-[var(--surface-inset)] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inkMuted">
              Similar-match evaluation
            </p>
            <p className="mt-2 text-[15px] font-medium text-ink">
              Confidence bucket {detail.similarContext?.confidenceBucket ?? "Unavailable"} has returned{" "}
              {confidenceBucketAccuracy} across {detail.similarContext?.confidenceBucketSample ?? "Unavailable"} matches.
            </p>
          </div>

          <div className="rounded-[18px] bg-[var(--surface-inset)] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inkMuted">
              Surface performance
            </p>
            <p className="mt-2 text-[15px] font-medium text-ink">
              {sentenceCase(detail.match.surface)} accuracy is {surfaceAccuracy} across{" "}
              {detail.similarContext?.surfaceSample ?? "Unavailable"} matches.
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-[14px] leading-7 text-inkSecondary">
          Similar-match evaluation will appear here once the calibration pipeline is complete.
        </p>
      )}

      <div className="mt-6 rounded-[18px] bg-[var(--surface-inset)] px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inkMuted">Status</p>
        <p
          className={cn(
            "mt-2 text-[15px] font-medium",
            settled
              ? settled.predictionCorrect
                ? "text-[var(--accent-lime)]"
                : "text-warning"
              : "text-ink",
          )}
        >
          {settled ? `${settled.label} · ${settled.winnerName}` : sentenceCase(detail.match.status)}
        </p>
      </div>
    </Card>
  );
}
