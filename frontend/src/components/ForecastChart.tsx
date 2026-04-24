import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type ForecastRow = {
  date: string
  predicted_energy_kwh: number
  predicted_emission_kg_co2e: number
}

type ForecastChartProps = {
  data: ForecastRow[]
}

export function ForecastChart({ data }: ForecastChartProps) {
  return (
    <div className="rounded-sm border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Forecast (Baseline)</h2>
      <p className="mb-4 text-sm text-stone-600">Lineare Projektion fuer die naechsten 30 Tage</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#57534e' }} axisLine={{ stroke: '#d6d3d1' }} tickLine={{ stroke: '#d6d3d1' }} />
            <YAxis tick={{ fontSize: 11, fill: '#57534e' }} axisLine={{ stroke: '#d6d3d1' }} tickLine={{ stroke: '#d6d3d1' }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="predicted_energy_kwh"
              stroke="#111111"
              fill="#E30613"
              fillOpacity={0.18}
              strokeWidth={2}
              name="Forecast Energy (kWh)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
