import { useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { cn } from '@/lib/utils'
import { CHART, TOOLTIP_CONTENT_STYLE } from '@/lib/chartColors'
import type { PortfolioTrendPoint } from '@/lib/types'

type Metric = 'kwh' | 'co2' | 'cost'

const METRIC_LABELS: Record<Metric, string> = {
  kwh: 'kWh',
  co2: 'CO₂ kg',
  cost: '€',
}

type PortfolioTrendChartProps = {
  points: PortfolioTrendPoint[]
  loading: boolean
  error: string | null
}

const TEMP_COLOR = CHART.muted

function formatValue(metric: Metric, value: number): string {
  if (metric === 'cost') return `€${Math.round(value).toLocaleString()}`
  if (metric === 'co2') {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}t`
    return `${Math.round(value)} kg`
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} GWh`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} MWh`
  return `${Math.round(value)} kWh`
}

export function PortfolioTrendChart({ points, loading, error }: PortfolioTrendChartProps) {
  const [metric, setMetric] = useState<Metric>('kwh')

  const data = useMemo(() => points.map(p => ({
    label: p.label,
    value:
      metric === 'kwh' ? p.energy_kwh :
      metric === 'co2' ? p.co2_kg :
      p.cost_eur,
    temperature: p.avg_temp_c,
  })), [points, metric])

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">Portfolio consumption trend</h3>
          <p className="text-[11px] text-stone-400">Last 12 months · all properties · overlaid average outside temperature</p>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-md border border-stone-200 p-0.5">
          {(Object.keys(METRIC_LABELS) as Metric[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={cn(
                'rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
                metric === m ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-700',
              )}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="h-64 animate-pulse rounded-md bg-stone-50" />}
      {error && !loading && (
        <p className="py-16 text-center text-xs text-red-600">Couldn't load trend: {error}</p>
      )}

      {!loading && !error && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={CHART.primary} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: CHART.axisText }}
                axisLine={{ stroke: CHART.axisLine }}
                tickLine={{ stroke: CHART.axisLine }}
              />
              <YAxis
                yAxisId="value"
                tick={{ fontSize: 11, fill: CHART.axisText }}
                axisLine={{ stroke: CHART.axisLine }}
                tickLine={{ stroke: CHART.axisLine }}
                width={56}
                tickFormatter={(v: number) => formatValue(metric, v)}
              />
              <YAxis
                yAxisId="temp"
                orientation="right"
                tick={{ fontSize: 11, fill: TEMP_COLOR }}
                axisLine={{ stroke: CHART.axisLine }}
                tickLine={{ stroke: CHART.axisLine }}
                width={40}
                tickFormatter={(v: number) => `${v}°`}
                label={{ value: '°C', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: 10, fill: TEMP_COLOR } }}
              />
              <Tooltip
                contentStyle={TOOLTIP_CONTENT_STYLE}
                formatter={((value: number | null, name: string) => {
                  if (value == null) return [null, null]
                  if (name === 'temperature') return [`${value.toFixed(1)} °C`, 'Avg temperature']
                  return [formatValue(metric, value), `Portfolio ${METRIC_LABELS[metric]}`]
                }) as any}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                iconSize={10}
                formatter={(value: string) => {
                  if (value === 'value') return `Portfolio ${METRIC_LABELS[metric]}`
                  if (value === 'temperature') return 'Avg temperature'
                  return value
                }}
              />
              <Area
                yAxisId="value"
                type="monotone"
                dataKey="value"
                stroke={CHART.primary}
                strokeWidth={2}
                fill="url(#trendFill)"
                name="value"
                isAnimationActive={false}
              />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temperature"
                stroke={TEMP_COLOR}
                strokeWidth={1.5}
                strokeDasharray="2 3"
                dot={false}
                name="temperature"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
