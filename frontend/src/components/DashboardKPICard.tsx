import { cn } from '@/lib/utils'

type TrendDirection = 'up' | 'down' | 'flat'

type DashboardKPICardProps = {
  label: string
  value: string
  unit?: string
  icon: React.ElementType
  trend?: { direction: TrendDirection; label: string }
  tone?: 'neutral' | 'warning' | 'critical'
  loading?: boolean
}

const TONE_DOT: Record<NonNullable<DashboardKPICardProps['tone']>, string> = {
  neutral: 'bg-stone-300',
  warning: 'bg-amber-500',
  critical: 'bg-brand',
}

export function DashboardKPICard({
  label,
  value,
  unit,
  icon: Icon,
  trend,
  tone = 'neutral',
  loading = false,
}: DashboardKPICardProps) {
  return (
    <article className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-100">
          <Icon className="h-4 w-4 text-stone-600" />
        </div>
        <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[tone])} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">
        {label}
      </p>
      {loading ? (
        <div className="mt-2 h-7 w-20 animate-pulse rounded bg-stone-100" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">
          {value}
          {unit && <span className="ml-1 text-xs font-medium text-stone-400">{unit}</span>}
        </p>
      )}
      {trend && !loading && (
        <p
          className={cn(
            'mt-1 text-[11px] font-medium',
            trend.direction === 'up' && 'text-brand',
            trend.direction === 'down' && 'text-emerald-600',
            trend.direction === 'flat' && 'text-stone-400',
          )}
        >
          {trend.direction === 'up' && '▲ '}
          {trend.direction === 'down' && '▼ '}
          {trend.label}
        </p>
      )}
    </article>
  )
}
