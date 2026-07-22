import { Card } from "@/components/ui/card";
import type { ModelHealthEvaluation } from "@/src/lib/model-health";

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMetric(value: number) {
  return value.toFixed(4);
}

export function ModelComparisonTable({
  comparisons,
  evaluation,
}: Pick<ModelHealthEvaluation, "comparisons" | "evaluation">) {
  return (
    <Card className="rounded-hero p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
            Benchmark comparison
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Baseline-v5 versus simpler alternatives
          </h2>
        </div>
        <p className="text-sm text-inkSecondary">
          Lower is better for log loss, Brier, and calibration error.
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-inkMuted">
            <tr>
              <th className="px-4 py-2 font-semibold">Model</th>
              <th className="px-4 py-2 font-semibold">Accuracy</th>
              <th className="px-4 py-2 font-semibold">Log loss</th>
              <th className="px-4 py-2 font-semibold">Brier</th>
              <th className="px-4 py-2 font-semibold">Calibration</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((row) => (
              <tr key={row.model_version} className="bg-surface2">
                <td className="rounded-l-2xl px-4 py-3 font-medium text-ink">{row.model_version}</td>
                <td className="px-4 py-3 text-inkSecondary">{formatRate(row.accuracy)}</td>
                <td className="px-4 py-3 text-inkSecondary">
                  {formatMetric(row.log_loss)}
                  {row.model_version === evaluation.best_log_loss_model_version ? " best" : ""}
                </td>
                <td className="px-4 py-3 text-inkSecondary">
                  {formatMetric(row.brier_score)}
                  {row.model_version === evaluation.best_brier_model_version ? " best" : ""}
                </td>
                <td className="rounded-r-2xl px-4 py-3 text-inkSecondary">
                  {formatMetric(row.calibration_error)}
                  {row.model_version === evaluation.best_calibration_model_version ? " best" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
