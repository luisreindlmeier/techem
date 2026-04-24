type KpiCardProps = {
  title: string
  value: string
  subtitle: string
}

export function KpiCard({ title, value, subtitle }: KpiCardProps) {
  return (
    <article className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 h-1 w-12 rounded-full bg-[#E30613]" />
      <p className="text-xs uppercase tracking-[0.12em] text-stone-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-stone-950">{value}</p>
      <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
    </article>
  )
}
