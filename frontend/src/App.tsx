import { useEffect, useMemo, useState } from 'react'

import { EnergyTrendChart } from './components/EnergyTrendChart'
import { ForecastChart } from './components/ForecastChart'
import { KpiCard } from './components/KpiCard'
import { getForecast, getOverview } from './lib/api'
import { formatDecimal, formatNumber } from './lib/format'
import type { ForecastResponse, OverviewResponse } from './lib/types'

function App() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [forecast, setForecast] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [overviewResponse, forecastResponse] = await Promise.all([
          getOverview(),
          getForecast(30),
        ])
        setOverview(overviewResponse)
        setForecast(forecastResponse)
        setError(null)
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'Unknown error'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const trendData = useMemo(() => {
    return (overview?.records || []).map((row) => ({
      ...row,
      date: row.date.slice(5),
    }))
  }, [overview])

  const forecastData = useMemo(() => {
    return (forecast?.points || []).map((row) => ({
      ...row,
      date: row.date.slice(5),
    }))
  }, [forecast])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f0fdf4_0%,#ffffff_45%,#f5f5f4_100%)] px-4 py-8 text-stone-900">
      <section className="mx-auto max-w-6xl">
        <header className="mb-8 rounded-md border border-stone-300 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-800">Techem x Energz</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Energy & Emission Intelligence Dashboard</h1>
          <p className="mt-3 max-w-3xl text-sm text-stone-700 md:text-base">
            Hackathon-Prototyp fuer Analyse und Forecasting von Energieverbrauch und Emissionen.
            Die API liest Supabase-Daten und faellt bei Bedarf auf Mock-Daten zurueck.
          </p>
        </header>

        {loading ? (
          <div className="rounded-md border border-stone-300 bg-white p-6 text-sm text-stone-700">
            Lade Kennzahlen und Forecast ...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-rose-300 bg-rose-50 p-6 text-sm text-rose-700">
            API-Fehler: {error}
          </div>
        ) : null}

        {!loading && !error && overview ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total Energy"
              value={`${formatNumber(overview.total_energy_kwh)} kWh`}
              subtitle="Gesamtsumme im Analysefenster"
            />
            <KpiCard
              title="Total Emission"
              value={`${formatNumber(overview.total_emission_kg_co2e)} kg CO2e`}
              subtitle="Kumulierte Emissionen"
            />
            <KpiCard
              title="Avg Daily Energy"
              value={`${formatDecimal(overview.average_daily_energy_kwh)} kWh`}
              subtitle="Durchschnitt pro Tag"
            />
            <KpiCard
              title="Avg Daily Emission"
              value={`${formatDecimal(overview.average_daily_emission_kg_co2e)} kg`}
              subtitle="Durchschnitt pro Tag"
            />
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <EnergyTrendChart data={trendData} />
          <ForecastChart data={forecastData} />
        </div>

        <footer className="mt-6 rounded-md border border-stone-300 bg-white p-4 text-sm text-stone-600">
          Stack: React + Tailwind + Recharts/D3, FastAPI auf Railway, Supabase (Postgres).
        </footer>
      </section>
    </main>
  )
}

export default App
