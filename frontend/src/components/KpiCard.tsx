type KpiCardProps = {
  title: string
  value: string
  subtitle: string
}

export function KpiCard({ title, value, subtitle }: KpiCardProps) {
  return (
    <article className="rounded-md border border-stone-300 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      <p className="text-xs uppercase tracking-[0.12em] text-stone-600">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-stone-900">{value}</p>
      <p className="mt-1 text-sm text-stone-700">{subtitle}</p>
    </article>
  )
}
