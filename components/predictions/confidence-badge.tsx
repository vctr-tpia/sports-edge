import type { ConfidenceLabel } from "@/src/lib/app-view-models";
import { Badge } from "@/components/ui/badge";
import { confidenceLabelText } from "@/src/lib/app-view-models";

const toneByLabel: Record<ConfidenceLabel, "neutral" | "brand" | "positive" | "warning"> = {
  low: "neutral",
  moderate: "warning",
  high: "brand",
  very_high: "positive",
};

export function ConfidenceBadge({
  label,
  score,
}: {
  label: ConfidenceLabel | null | undefined;
  score?: number | null;
}) {
  if (!label) {
    return <Badge tone="neutral">Confidence unavailable</Badge>;
  }

  return (
    <Badge tone={toneByLabel[label]}>
      {confidenceLabelText(label)}
      {typeof score === "number" ? ` ${Math.round(score * 100)}%` : ""}
    </Badge>
  );
}
