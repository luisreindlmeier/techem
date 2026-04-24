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
import type { GranularPoint } from '@/data/buildingData'

type Granularity = 'monthly' | 'weekly' | 'daily'

type ComparisonChartProps = {
  title: string
  unit: string
  monthlyData: GranularPoint[]
  weeklyData: GranularPoint[]
  dailyData: GranularPoint[]
  aptLabel: string
  accentColor?: string
}

const GRAN_LABELS: Record<Granularity, string> = {
  monthly: 'Monthly',
  weekly: 'Weekly',
  daily: 'Daily',
}

const GRAN_SUBTITLE: Record<Granularity, string> = {
  monthly: 'monthly',
  weekly: 'weekly',
  daily: 'daily · Jan',
}

export function ComparisonChart({
  title, unit, monthlyData, weeklyData, dailyData, aptLabel, accentColor = '#111111',
}: ComparisonChartProps) {
  const [gran, setGran] = useState<Granularity>('monthly')

  const data = gran === 'monthly' ? monthlyData : gran === 'weekly' ? weeklyData : dailyData

  const avgVal = useMemo(
    () => Math.round(data.reduce((s, d) => s + d.Apartment, 0) / data.length),
    [data],
  )

  const tickFormatter = gran === 'weekly'
    ? (_val: string, idx: number) => (idx % 4 === 0 ? `W${idx + 1}` : '')
    : undefined

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
          <p className="text-[11px] text-stone-400">
            {aptLabel} vs. building average · {GRAN_SUBTITLE[gran]} · {unit}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-md border border-stone-200 p-0.5">
          {(Object.keys(GRAN_LABELS) as Granularity[]).map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setGran(g)}
              className={cn(
                'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                gran === g ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-700',
              )}
            >
              {GRAN_LABELS[g]}
            </button>
          ))}
        </div>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={gran === 'weekly' ? '10%' : '32%'} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#78716c' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={tickFormatter}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#78716c' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e7e5e4', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
              formatter={((value: number) => [`${value} ${unit}`, '']) as any}
              cursor={{ fill: '#f5f5f4' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <ReferenceLine
              y={avgVal}
              stroke={accentColor}
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{ value: `avg ${avgVal} ${unit}`, position: 'insideTopRight', fontSize: 10, fill: accentColor, dy: -6 }}
            />
            <Bar dataKey="Apartment" name={aptLabel} fill={accentColor} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Average" name="Bldg. average" fill="#d6d3d1" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
