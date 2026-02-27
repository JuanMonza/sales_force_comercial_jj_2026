type KpiCardProps = {
  title: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'good' | 'warn';
};

const toneStyles: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'border-cyan/20',
  good: 'border-mint/30',
  warn: 'border-amber/30'
};

export function KpiCard({ title, value, hint, tone = 'neutral' }: KpiCardProps) {
  return (
    <article className={`glass-card p-4 border ${toneStyles[tone]} fade-in`}>
      <p className="text-slate-400 text-xs uppercase tracking-[0.12em] mb-1">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {hint ? <p className="text-xs text-slate-400 mt-2">{hint}</p> : null}
    </article>
  );
}

