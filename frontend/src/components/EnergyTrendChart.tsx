import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { BRAND, CHART } from '@/lib/chartColors'

type TrendRow = {
  date: string
  energy_kwh: number
  emission_kg_co2e: number
}

type EnergyTrendChartProps = {
  data: TrendRow[]
}

export function EnergyTrendChart({ data }: EnergyTrendChartProps) {
  return (
    <div className="rounded-sm border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Energy & Emission Trend</h2>
      <p className="mb-4 text-sm text-stone-600">Historical daily values from Supabase or mock data</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART.axisText }} axisLine={{ stroke: CHART.axisLine }} tickLine={{ stroke: CHART.axisLine }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: CHART.axisText }} axisLine={{ stroke: CHART.axisLine }} tickLine={{ stroke: CHART.axisLine }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: CHART.axisText }} axisLine={{ stroke: CHART.axisLine }} tickLine={{ stroke: CHART.axisLine }} />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="energy_kwh"
              stroke={CHART.primary}
              strokeWidth={2}
              dot={false}
              name="Energy (kWh)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="emission_kg_co2e"
              stroke={BRAND.DEFAULT}
              strokeWidth={2}
              dot={false}
              name="Emission (kg CO2e)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
