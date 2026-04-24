import { ArrowRightIcon } from '@heroicons/react/24/outline'

import { cn } from '@/lib/utils'
import type { CRREMSummaryResponse } from '@/lib/types'

type CRREMSnapshotProps = {
  summary: CRREMSummaryResponse | null
  loading: boolean
  error: string | null
  onOpenFull?: () => void
}

const STATUS_DOT: Record<string, string> = {
  critical: 'bg-brand',
  endangered: 'bg-amber-500',
  ok: 'bg-emerald-600',
}

export function CRREMSnapshot({ summary, loading, error, onOpenFull }: CRREMSnapshotProps) {
  return (
    <article className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">
            CRREM risk
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-stone-900">1.5°C pathway alignment</h3>
        </div>
      </div>

      {loading && (
        <div className="mt-4 space-y-3">
          <div className="h-2 w-full animate-pulse rounded-full bg-stone-100" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-stone-100" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-stone-100" />
        </div>
      )}

      {error && !loading && (
        <p className="mt-3 text-xs text-red-600">Couldn't load CRREM data: {error}</p>
      )}

      {summary && !loading && (
        <>
          {(() => {
            const total = summary.critical_count + summary.endangered_count + summary.ok_count
            const safe = total > 0 ? total : 1
            const critPct = (summary.critical_count / safe) * 100
            const endPct = (summary.endangered_count / safe) * 100
            const okPct = (summary.ok_count / safe) * 100
            return (
              <>
                <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full bg-brand" style={{ width: `${critPct}%` }} />
                  <div className="h-full bg-amber-500" style={{ width: `${endPct}%` }} />
                  <div className="h-full bg-emerald-600" style={{ width: `${okPct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    {summary.critical_count} critical
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {summary.endangered_count} endangered
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    {summary.ok_count} aligned
                  </span>
                </div>
              </>
            )
          })()}

          <div className="mt-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">
              Top 3 at risk
            </p>
            {summary.top_at_risk.length === 0 ? (
              <p className="text-xs text-stone-500">All properties aligned through 2050.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {summary.top_at_risk.map(p => (
                  <li key={p.property_id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[p.status] ?? 'bg-stone-300')} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-stone-900">{p.property_name}</p>
                        <p className="truncate text-[10px] text-stone-400">{p.city}</p>
                      </div>
                    </div>
                    <span className="ml-3 shrink-0 tabular-nums text-xs font-semibold text-stone-700">
                      {p.misalignment_year >= 9999 ? '2050+' : p.misalignment_year}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenFull}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-brand"
          >
            Full CRREM Analysis
            <ArrowRightIcon className="h-3 w-3" />
          </button>
        </>
      )}
    </article>
  )
}
