import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export default function MatchDetailLoading() {
  return (
    <AppShell breadcrumbs={[{ label: "Matches", href: "/matches" }, { label: "Loading match" }]} freshnessTone="neutral">
      <div className="space-y-6 pb-24 pt-3 min-[768px]:pb-8 min-[768px]:pt-10">
        <div className="h-10 w-40 rounded-full bg-white/[0.05]" />
        <Card className="rounded-[28px] p-6 sm:p-7 lg:p-8">
          <div className="h-4 w-32 rounded-full bg-white/[0.06]" />
          <div className="mt-4 h-3 w-72 rounded-full bg-white/[0.05]" />
          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            <div className="h-28 rounded-[24px] bg-white/[0.04]" />
            <div className="h-36 rounded-[24px] bg-white/[0.04]" />
            <div className="h-28 rounded-[24px] bg-white/[0.04]" />
          </div>
          <div className="mt-8 h-3 rounded-full bg-white/[0.05]" />
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="h-[420px] rounded-[24px] p-6" />
          <Card className="h-[420px] rounded-[24px] p-6" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="h-[320px] rounded-[24px] p-6" />
          <Card className="h-[320px] rounded-[24px] p-6" />
        </div>
      </div>
    </AppShell>
  );
}
