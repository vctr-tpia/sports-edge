import { Card } from "@/components/ui/card";

type ProjectionCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function ProjectionCard({ label, value, detail }: ProjectionCardProps) {
  return (
    <Card className="rounded-panel p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-inkMuted">{label}</p>
      <p className="numeric mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-inkSecondary">{detail}</p>
    </Card>
  );
}
