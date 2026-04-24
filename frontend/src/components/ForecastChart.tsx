import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { cn } from '@/lib/utils'
import { BRAND, CHART, TOOLTIP_CONTENT_STYLE } from '@/lib/chartColors'
import type { ForecastGranularity, ForecastTimelinePoint } from '@/lib/types'

type ForecastChartProps = {
  points: ForecastTimelinePoint[]
  cutoffLabel: string
  granularity: ForecastGranularity
  onGranularityChange: (g: ForecastGranularity) => void
  subtitle: string
  title?: string
}

const GRAN_LABELS: Record<ForecastGranularity, string> = {
  monthly: 'Monthly',
  weekly: 'Weekly',
  daily: 'Daily',
}

export function ForecastChart({
  points,
  cutoffLabel,
  granularity,
  onGranularityChange,
  subtitle,
  title = 'Energy Forecast',
}: ForecastChartProps) {
  const tickFormatter = granularity === 'daily'
    ? (val: string, idx: number) => (idx % 3 === 0 ? val : '')
    : undefined

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
          <p className="text-[11px] text-stone-400">{subtitle}</p>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-md border border-stone-200 p-0.5">
          {(Object.keys(GRAN_LABELS) as ForecastGranularity[]).map(g => (
            <button
              key={g}
              type="button"
              onClick={() => onGranularityChange(g)}
              className={cn(
                'rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
                granularity === g ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-700',
              )}
            >
              {GRAN_LABELS[g]}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="fcActualFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND.DEFAULT} stopOpacity={0.22} />
                <stop offset="100%" stopColor={BRAND.DEFAULT} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="fcForecastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND.DEFAULT} stopOpacity={0.12} />
                <stop offset="100%" stopColor={BRAND.DEFAULT} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: CHART.axisText }}
              axisLine={{ stroke: CHART.axisLine }}
              tickLine={{ stroke: CHART.axisLine }}
              interval={0}
              tickFormatter={tickFormatter}
            />
            <YAxis
              tick={{ fontSize: 11, fill: CHART.axisText }}
              axisLine={{ stroke: CHART.axisLine }}
              tickLine={{ stroke: CHART.axisLine }}
              width={44}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              formatter={((value: number | null, name: string) => {
                if (value == null) return [null, null]
                const label = name === 'actual' ? 'Actual' : 'Forecast'
                return [`${Math.round(value).toLocaleString()} kWh`, label]
              }) as any}
            />
            {cutoffLabel && (
              <ReferenceLine
                x={cutoffLabel}
                stroke={CHART.primary}
                strokeDasharray="4 3"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
                label={{ value: 'Now', position: 'top', fill: CHART.primary, fontSize: 10, fontWeight: 600 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="actual"
              stroke={CHART.primary}
              strokeWidth={2}
              fill="url(#fcActualFill)"
              name="actual"
              connectNulls={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke={CHART.primary}
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="url(#fcForecastFill)"
              name="forecast"
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
