import {
  ArrowRightIcon,
  ExclamationTriangleIcon,
  FireIcon,
  HomeModernIcon,
  InformationCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

import { cn } from '@/lib/utils'
import type { DashboardAlert } from '@/lib/types'

type AlertCardProps = {
  alert: DashboardAlert
  onOpen?: (alert: DashboardAlert) => void
}

const PRIORITY_STYLES: Record<DashboardAlert['priority'], { dot: string; label: string; border: string }> = {
  critical: { dot: 'bg-brand', label: 'text-brand', border: 'border-l-brand' },
  warning:  { dot: 'bg-amber-500', label: 'text-amber-600', border: 'border-l-amber-500' },
  info:     { dot: 'bg-sky-500',   label: 'text-sky-600',   border: 'border-l-sky-500' },
}

const TYPE_ICONS: Record<DashboardAlert['type'], React.ElementType> = {
  mold_risk:       HomeModernIcon,
  overheating:     FireIcon,
  vacancy:         ExclamationTriangleIcon,
  heating_failure: FireIcon,
  forecast_spike:  SparklesIcon,
}

const PRIORITY_LABEL: Record<DashboardAlert['priority'], string> = {
  critical: 'Critical',
  warning:  'Warning',
  info:     'Info',
}

function formatRelative(iso: string): string {
  try {
    const then = new Date(iso)
    const diffMs = Date.now() - then.getTime()
    const minutes = Math.round(diffMs / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.round(hours / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}

export function AlertCard({ alert, onOpen }: AlertCardProps) {
  const styles = PRIORITY_STYLES[alert.priority]
  const Icon = TYPE_ICONS[alert.type] ?? InformationCircleIcon

  return (
    <div
      className={cn(
        'group relative rounded-md border border-stone-200 bg-white p-4 shadow-sm transition-colors',
        'border-l-4',
        styles.border,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100">
          <Icon className="h-4 w-4 text-stone-700" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} />
            <span className={cn('text-[10px] font-semibold uppercase tracking-[0.08em]', styles.label)}>
              {PRIORITY_LABEL[alert.priority]}
            </span>
            <span className="text-[10px] text-stone-400">·</span>
            <span className="text-[11px] font-medium text-stone-600">
              {alert.property_name}
              {alert.unit_id && <> · Unit {alert.unit_id}</>}
            </span>
          </div>

          <h3 className="mt-1 text-sm font-semibold text-stone-900">{alert.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">{alert.message}</p>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-stone-400">{formatRelative(alert.timestamp)}</span>
            {onOpen && (
              <button
                type="button"
                onClick={() => onOpen(alert)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-700 transition-colors hover:text-brand"
              >
                View in Analytics
                <ArrowRightIcon className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
