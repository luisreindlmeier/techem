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
    <div className="rounded-md border border-stone-300 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Forecast (Baseline)</h2>
      <p className="mb-4 text-sm text-stone-600">Lineare Projektion fuer die naechsten 30 Tage</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="predicted_energy_kwh"
              stroke="#14532d"
              fill="#86efac"
              fillOpacity={0.35}
              strokeWidth={2}
              name="Forecast Energy (kWh)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
