import { Card } from "@/components/ui/card";

type CalibrationChartRow = {
  bucketLabel: string;
  averagePredictedWinProbability: number;
  actualFavoriteWinRate: number;
  matchCount: number;
};

export function CalibrationChart({
  rows,
  title = "Calibration curve",
}: {
  rows: CalibrationChartRow[];
  title?: string;
}) {
  const width = 360;
  const height = 220;
  const padding = 28;
  const xFor = (index: number) =>
    padding + (index / Math.max(1, rows.length - 1)) * (width - padding * 2);
  const yFor = (value: number) => height - padding - value * (height - padding * 2);
  const actualPath = rows
    .map((row, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(row.actualFavoriteWinRate)}`)
    .join(" ");
  const predictedPath = rows
    .map((row, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(row.averagePredictedWinProbability)}`)
    .join(" ");

  return (
    <Card className="rounded-hero p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">{title}</p>
      <p className="mt-2 text-sm leading-6 text-inkSecondary">
        Lower separation between predicted and actual win rate means the model is better calibrated.
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-5 w-full">
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.12)" />
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={padding}
          stroke="rgba(255,255,255,0.08)"
          strokeDasharray="4 5"
        />
        <path d={predictedPath} fill="none" stroke="var(--brand-primary)" strokeWidth="2.5" />
        <path d={actualPath} fill="none" stroke="var(--positive)" strokeWidth="2.5" />
        {rows.map((row, index) => (
          <g key={row.bucketLabel}>
            <circle cx={xFor(index)} cy={yFor(row.actualFavoriteWinRate)} r="4" fill="var(--positive)" />
            <circle cx={xFor(index)} cy={yFor(row.averagePredictedWinProbability)} r="4" fill="var(--brand-primary)" />
          </g>
        ))}
      </svg>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-borderSubtle bg-surface2 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-inkMuted">Predicted</p>
          <p className="mt-2 text-sm text-inkSecondary">Purple line shows average favorite probability.</p>
        </div>
        <div className="rounded-2xl border border-borderSubtle bg-surface2 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-inkMuted">Observed</p>
          <p className="mt-2 text-sm text-inkSecondary">Green line shows actual favorite win rate.</p>
        </div>
      </div>
    </Card>
  );
}
