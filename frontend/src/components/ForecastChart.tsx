import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useMemo } from 'react'

import { cn } from '@/lib/utils'
import { CHART, TOOLTIP_CONTENT_STYLE, heatColor } from '@/lib/chartColors'
import type { ForecastGranularity, ForecastTimelinePoint } from '@/lib/types'

type ForecastChartProps = {
  points: ForecastTimelinePoint[]
  cutoffLabel: string
  granularity: ForecastGranularity
  onGranularityChange: (g: ForecastGranularity) => void
  subtitle: string
  aptLabel: string
  title?: string
  aggregated?: boolean
}

const GRAN_LABELS: Record<ForecastGranularity, string> = {
  monthly: 'Monthly',
  weekly: 'Weekly',
  daily: 'Daily',
}

const TEMP_COLOR = CHART.muted       // #78716c
const AVG_COLOR  = '#a8a29e'         // stone-400 — a touch lighter than temperature

export function ForecastChart({
  points,
  cutoffLabel,
  granularity,
  onGranularityChange,
  subtitle,
  aptLabel,
  title = 'Energy Forecast',
  aggregated = false,
}: ForecastChartProps) {
  const tickFormatter = granularity === 'daily'
    ? (val: string, idx: number) => (idx % 3 === 0 ? val : '')
    : undefined

  const accentColor = useMemo(() => {
    let aptSum = 0
    let avgSum = 0
    for (const p of points) {
      aptSum += (p.actual ?? 0) + (p.forecast ?? 0)
      avgSum += p.average ?? 0
    }
    return avgSum > 0 ? heatColor(aptSum / avgSum) : CHART.primary
  }, [points])

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
          <p className="text-[11px] text-stone-400">
            {aggregated ? (
              <><span className="font-medium text-stone-600">Whole building</span> · aggregated · {subtitle}</>
            ) : (
              <><span className="font-medium text-stone-600">{aptLabel}</span> vs. building average · {subtitle}</>
            )}
          </p>
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
          <ComposedChart data={points} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="fcActualFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.22} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="fcForecastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.12} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0.02} />
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
              yAxisId="kwh"
              tick={{ fontSize: 11, fill: CHART.axisText }}
              axisLine={{ stroke: CHART.axisLine }}
              tickLine={{ stroke: CHART.axisLine }}
              width={44}
              label={{ value: 'kWh', angle: -90, position: 'insideLeft', offset: 14, style: { fontSize: 10, fill: CHART.muted } }}
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
                if (name === 'average')     return [`${Math.round(value).toLocaleString()} kWh`, 'Bldg. average']
                if (name === 'actual')      return [`${Math.round(value).toLocaleString()} kWh`, `${aptLabel} actual`]
                if (name === 'forecast')    return [`${Math.round(value).toLocaleString()} kWh`, `${aptLabel} forecast`]
                return [String(value), name]
              }) as any}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
              iconSize={10}
              formatter={(value: string) => {
                const subject = aggregated ? 'Whole building' : aptLabel
                if (value === 'actual')      return `${subject} actual`
                if (value === 'forecast')    return `${subject} forecast`
                if (value === 'average')     return 'Bldg. average'
                if (value === 'temperature') return 'Avg temperature'
                return value
              }}
            />
            {cutoffLabel && (
              <ReferenceLine
                yAxisId="kwh"
                x={cutoffLabel}
                stroke={CHART.primary}
                strokeDasharray="4 3"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
                label={{ value: 'Now', position: 'top', fill: CHART.primary, fontSize: 10, fontWeight: 600 }}
              />
            )}
            <Area
              yAxisId="kwh"
              type="monotone"
              dataKey="actual"
              stroke={accentColor}
              strokeWidth={2}
              fill="url(#fcActualFill)"
              name="actual"
              connectNulls={false}
              isAnimationActive={false}
            />
            <Area
              yAxisId="kwh"
              type="monotone"
              dataKey="forecast"
              stroke={accentColor}
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="url(#fcForecastFill)"
              name="forecast"
              connectNulls={false}
              isAnimationActive={false}
            />
            {!aggregated && (
              <Line
                yAxisId="kwh"
                type="monotone"
                dataKey="average"
                stroke={AVG_COLOR}
                strokeWidth={1.5}
                dot={false}
                name="average"
                isAnimationActive={false}
              />
            )}
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
    </div>
  )
}
