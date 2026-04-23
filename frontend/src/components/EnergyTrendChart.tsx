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
    <div className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Energy & Emission Trend</h2>
      <p className="mb-4 text-sm text-stone-600">Historische Tageswerte aus Supabase oder Mock-Daten</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="energy_kwh"
              stroke="#166534"
              strokeWidth={2}
              dot={false}
              name="Energy (kWh)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="emission_kg_co2e"
              stroke="#4ade80"
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
