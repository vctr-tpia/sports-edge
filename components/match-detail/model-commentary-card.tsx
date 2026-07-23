import { Card } from "@/components/ui/card";
import type { MatchDetailViewModel } from "@/src/lib/app-view-models";
import { playerSurname } from "@/components/match-detail/helpers";

function riskItems(detail: MatchDetailViewModel) {
  const items: Array<{ key: string; label: string; tone: string; description: string }> = [];
  const mainCounter = detail.counterFactors[0];

  if (mainCounter) {
    const supports = mainCounter.favoredPlayerName
      ? playerSurname(mainCounter.favoredPlayerName)
      : detail.underdogPlayerName;

    items.push({
      key: "counter",
      label: mainCounter.label.slice(0, 10).toUpperCase(),
      tone: "text-warning",
      description: `${supports} still holds the clearest counter-signal through ${mainCounter.label.toLowerCase()}.`,
    });
  }

  if (detail.playerASurfaceForm.length < 3 || detail.playerBSurfaceForm.length < 3) {
    items.push({
      key: "sample",
      label: "SAMPLE",
      tone: "text-[var(--accent-cyan)]",
      description: "Limited recent surface sample keeps this projection less settled than the headline probability suggests.",
    });
  }

  if (detail.headToHeadMatches.length === 0) {
    items.push({
      key: "h2h",
      label: "H2H",
      tone: "text-inkMuted",
      description: "No meaningful head-to-head history exists in the active ATP dataset for this matchup.",
    });
  }

  if (items.length < 3) {
    items.push({
      key: "confidence",
      label: "RANGE",
      tone: "text-[var(--accent-cyan)]",
      description: `Confidence is ${detail.match.confidenceLabel ?? "unrated"}, so visible disagreement still matters even with a clear favorite.`,
    });
  }

  return items.slice(0, 3);
}

export function ModelCommentaryCard({ detail }: { detail: MatchDetailViewModel }) {
  const items = riskItems(detail);

  return (
    <Card className="rounded-[24px] p-6 sm:p-7">
      <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-ink sm:text-[24px]">
        What could change this prediction
      </h2>
      <p className="mt-2 text-[14px] text-inkSecondary">
        Visible counter-signals keep the model accountable.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.key} className="rounded-[18px] bg-[var(--surface-inset)] px-5 py-4">
            <div className="inline-flex rounded-full bg-[rgba(255,255,255,0.03)] px-4 py-2">
              <span className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${item.tone}`}>
                {item.label}
              </span>
            </div>
            <p className="mt-4 text-[13px] leading-6 text-ink">{item.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
