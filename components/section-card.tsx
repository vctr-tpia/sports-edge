type SectionCardProps = {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
};

export function SectionCard({ title, eyebrow, children }: SectionCardProps) {
  return (
    <section className="rounded-[2rem] border border-ink/10 bg-white/85 p-8 shadow-card backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-5 text-sm leading-7 text-ink/75">{children}</div>
    </section>
  );
}
