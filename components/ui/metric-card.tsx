import { Card } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <Card className="rounded-panel p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">
        {label}
      </p>
      <p className="numeric mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-ink">
        {value}
      </p>
      {detail ? <p className="mt-2 text-sm leading-6 text-inkSecondary">{detail}</p> : null}
    </Card>
  );
}
