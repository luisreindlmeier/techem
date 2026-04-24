import { CheckCircleIcon } from '@heroicons/react/24/outline'

import type { DashboardAlert } from '@/lib/types'
import { AlertCard } from '@/components/AlertCard'

type AlertFeedProps = {
  alerts: DashboardAlert[]
  loading: boolean
  error: string | null
  onOpenAlert?: (alert: DashboardAlert) => void
}

function AlertSkeleton() {
  return (
    <div className="rounded-md border border-l-4 border-stone-200 border-l-stone-300 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="h-8 w-8 shrink-0 rounded-md bg-stone-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 animate-pulse rounded bg-stone-100" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-stone-100" />
          <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
        </div>
      </div>
    </div>
  )
}

export function AlertFeed({ alerts, loading, error, onOpenAlert }: AlertFeedProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => <AlertSkeleton key={i} />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-stone-200 bg-white p-4 text-xs text-red-600">
        Couldn't load alerts: {error}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-emerald-900">All systems normal</p>
          <p className="text-xs text-emerald-700">No active alerts across the portfolio.</p>
        </div>
      </div>
    )
  }

  const critical = alerts.filter(a => a.priority === 'critical').length
  const warning = alerts.filter(a => a.priority === 'warning').length
  const info = alerts.filter(a => a.priority === 'info').length

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-center gap-3 text-[11px] text-stone-500">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {critical} critical
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {warning} warning
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
          {info} info
        </span>
      </div>
      {alerts.map(alert => (
        <AlertCard key={alert.id} alert={alert} onOpen={onOpenAlert} />
      ))}
    </div>
  )
}
