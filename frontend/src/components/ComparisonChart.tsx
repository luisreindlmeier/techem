import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { cn } from '@/lib/utils'
import { CHART, TOOLTIP_CONTENT_STYLE, heatColor } from '@/lib/chartColors'

type GranularPoint = { label: string; Apartment: number; Average: number }

type Granularity = 'monthly' | 'weekly' | 'daily'

type ComparisonChartProps = {
  title: string
  unit: string
  monthlyData: GranularPoint[]
  weeklyData: GranularPoint[]
  dailyData: GranularPoint[]
  aptLabel: string
  aggregated?: boolean
}

const GRAN_LABELS: Record<Granularity, string> = {
  monthly: 'Monthly',
  weekly: 'Weekly',
  daily: 'Daily',
}

export function ComparisonChart({
  title, unit, monthlyData, weeklyData, dailyData, aptLabel, aggregated = false,
}: ComparisonChartProps) {
  const [gran, setGran] = useState<Granularity>('monthly')

  const data = gran === 'monthly' ? monthlyData : gran === 'weekly' ? weeklyData : dailyData

  const avgApt = useMemo(
    () => data.length === 0 ? 0 : Math.round(data.reduce((s, d) => s + d.Apartment, 0) / data.length),
    [data],
  )
  const avgBldg = useMemo(
    () => data.length === 0 ? 0 : Math.round(data.reduce((s, d) => s + d.Average, 0) / data.length),
    [data],
  )
  const accentColor = useMemo(
    () => avgBldg > 0 ? heatColor(avgApt / avgBldg) : CHART.primary,
    [avgApt, avgBldg],
  )
  const BLDG_AVG_COLOR = '#78716c'

  const tickFormatter = gran === 'weekly'
    ? (_val: string, idx: number) => (idx % 4 === 0 ? `W${idx + 1}` : '')
    : undefined

  return (
    <div className="rounded-md border border-stone-200 bg-white px-3 py-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
          <p className="text-[11px] text-stone-400">
            {aggregated ? 'Whole building · aggregated total' : `${aptLabel} vs. building average`}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-md border border-stone-200 p-0.5">
          {(Object.keys(GRAN_LABELS) as Granularity[]).map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setGran(g)}
              className={cn(
                'rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
                gran === g ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-700',
              )}
            >
              {GRAN_LABELS[g]}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-52">
        <div className="pointer-events-none absolute right-1 -top-3 z-10 flex flex-col items-end gap-0.5 text-[10px] font-medium tabular-nums leading-tight">
          <span style={{ color: accentColor }}>
            avg {avgApt} {unit}
          </span>
          {!aggregated && (
            <span style={{ color: BLDG_AVG_COLOR }}>
              bldg {avgBldg} {unit}
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={gran === 'weekly' ? '10%' : '32%'} barGap={2} margin={{ left: -4, right: 4, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: CHART.muted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={tickFormatter}
            />
            <YAxis
              tick={{ fontSize: 11, fill: CHART.muted }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{ ...TOOLTIP_CONTENT_STYLE, fontSize: 12 }}
              formatter={((value: number) => [`${value} ${unit}`, '']) as any}
              cursor={{ fill: CHART.cursor }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {!aggregated && (
              <ReferenceLine
                y={avgBldg}
                stroke={BLDG_AVG_COLOR}
                strokeDasharray="3 4"
                strokeWidth={1}
                strokeOpacity={0.7}
              />
            )}
            <ReferenceLine
              y={avgApt}
              stroke={accentColor}
              strokeDasharray="5 3"
              strokeWidth={1.5}
            />
            <Bar dataKey="Apartment" name={aggregated ? 'Whole building' : aptLabel} fill={accentColor} radius={[2, 2, 0, 0]} />
            {!aggregated && (
              <Bar dataKey="Average" name="Bldg. average" fill={CHART.secondary} radius={[2, 2, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
