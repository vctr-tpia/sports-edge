import { Card } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card className="rounded-hero p-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-inkMuted">No data</p>
      <h3 className="mt-3 text-xl font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-inkSecondary">{description}</p>
    </Card>
  );
}
