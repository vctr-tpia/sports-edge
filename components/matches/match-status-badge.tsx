import type { MatchStatus } from "@/src/lib/app-view-models";
import { Badge } from "@/components/ui/badge";

const statusToneMap: Record<MatchStatus, "neutral" | "brand" | "positive" | "warning" | "danger"> =
  {
    prediction_ready: "brand",
    settled: "positive",
    cancelled: "danger",
    postponed: "warning",
    walkover: "warning",
    mapping_error: "danger",
    data_unavailable: "neutral",
  };

const statusLabelMap: Record<MatchStatus, string> = {
  prediction_ready: "Prediction ready",
  settled: "Settled",
  cancelled: "Cancelled",
  postponed: "Postponed",
  walkover: "Walkover",
  mapping_error: "Mapping issue",
  data_unavailable: "Data unavailable",
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  return <Badge tone={statusToneMap[status]}>{statusLabelMap[status]}</Badge>;
}
