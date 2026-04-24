import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Sector,
  Tooltip as RechartsTooltip,
} from 'recharts'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type {
  BuildingOverview,
  ForecastGranularity,
  ForecastTimelineResponse,
  PropertyItem,
  UnitHistoryResponse,
  UnitSummary,
} from '@/lib/types'
import {
  getBuildingOverview,
  getUnitForecastTimeline,
  getUnitHistory,
} from '@/lib/api'
import { ComparisonChart } from '@/components/ComparisonChart'
import { FloorPlanView } from '@/components/FloorPlanView'
import { ForecastChart } from '@/components/ForecastChart'
import { IsometricBuilding } from '@/components/IsometricBuilding'
import { APT_LABELS, UNITS_PER_FLOOR } from '@/lib/layoutConfig'
import { BRAND, PIE_PALETTE, TOOLTIP_CONTENT_STYLE } from '@/lib/chartColors'

type BuildingDetailPageProps = {
  property: PropertyItem
  onBack: () => void
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      <div className="mt-2 h-px bg-stone-200" />
    </div>
  )
}

const DEG = Math.PI / 180

function explodedSlice(props: Record<string, number> & { fill: string }) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, midAngle, fill } = props
  const d = 4
  return (
    <Sector
      cx={cx + d * Math.cos(-midAngle * DEG)}
      cy={cy + d * Math.sin(-midAngle * DEG)}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 1}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  )
}

function UnitPieChart({ units }: { units: UnitSummary[] }) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  const total = units.reduce((s, u) => s + u.annual_energy_kwh, 0)
  return (
    <div className="flex flex-col">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">
        Energy Distribution
      </p>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={units}
              dataKey="annual_energy_kwh"
              nameKey="label"
              cx="50%"
              cy="48%"
              innerRadius={42}
              outerRadius={67}
              stroke="none"
              strokeWidth={0}
              {...({ activeIndex, activeShape: explodedSlice, onMouseEnter: (_: unknown, index: number) => setActiveIndex(index), onMouseLeave: () => setActiveIndex(undefined) } as any)}
            >
              {units.map((unit, i) => (
                <Cell key={unit.label} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={((value: number, name: string) => [`${value.toLocaleString()} kWh`, `Unit ${name}`]) as any}
              contentStyle={TOOLTIP_CONTENT_STYLE}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-0.5 text-center">
        <p className="text-sm font-semibold text-stone-900">{units.length} units</p>
        <p className="text-xs text-stone-400">{Math.round(total).toLocaleString()} kWh/yr</p>
      </div>
    </div>
  )
}

const DIV = 'border-r border-stone-200'

function ConsumerTable({ title, units, highlight }: { title: string; units: UnitSummary[]; highlight: 'high' | 'low' }) {
  const maxRooms = Math.min(6, Math.max(0, ...units.map(u => u.rooms.length)))
  const headerNames = Array.from({ length: maxRooms }, (_, i) => {
    const fromUnit = units.find(u => u.rooms[i])?.rooms[i]?.name
    return fromUnit ?? `Room ${i + 1}`
  })
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-stone-200">
              <th className={cn('pb-1.5 pr-3 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-400', DIV)}>
                Unit
              </th>
              {headerNames.map((name, i) => (
                <th key={`${name}-${i}`} colSpan={2} className={cn('pb-1.5 px-2 text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-400 whitespace-nowrap', DIV)}>
                  {name}
                </th>
              ))}
              <th className="pb-1.5 pl-3 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-400 whitespace-nowrap">
                Total
              </th>
            </tr>
            <tr className="border-b border-stone-100">
              <th aria-label="unit" className={DIV} />
              {headerNames.map((name, i) => (
                <>
                  <th key={`${name}-${i}-sqm`} className="pb-1 pl-2 pr-1 text-right text-[9px] font-normal text-stone-300 whitespace-nowrap">m²</th>
                  <th key={`${name}-${i}-kwh`} className={cn('pb-1 pl-1 pr-2 text-right text-[9px] font-normal text-stone-300 whitespace-nowrap', DIV)}>kWh</th>
                </>
              ))}
              <th className="pb-1 pl-3 text-right text-[9px] font-normal text-stone-300 whitespace-nowrap">kWh/yr</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {units.map((unit) => (
              <tr key={unit.label}>
                <td className={cn('py-1.5 pr-3 font-semibold text-stone-900', DIV)}>{unit.label}</td>
                {Array.from({ length: maxRooms }, (_, i) => {
                  const room = unit.rooms[i]
                  return (
                    <>
                      <td key={`${unit.label}-${i}-sqm`} className="py-1.5 pl-2 pr-1 text-right tabular-nums text-[10px] text-stone-400 whitespace-nowrap">
                        {room ? room.sqm : '—'}
                      </td>
                      <td key={`${unit.label}-${i}-kwh`} className={cn('py-1.5 pl-1 pr-2 text-right tabular-nums text-stone-700 whitespace-nowrap', DIV)}>
                        {room ? Math.round(room.annual_energy_kwh).toLocaleString() : '—'}
                      </td>
                    </>
                  )
                })}
                <td className={cn(
                  'py-1.5 pl-3 text-right tabular-nums font-semibold whitespace-nowrap',
                  highlight === 'high' ? 'text-brand' : 'text-emerald-600',
                )}>
                  {Math.round(unit.annual_energy_kwh).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function BuildingDetailPage({ property, onBack }: BuildingDetailPageProps) {
  const totalFloors = Math.max(1, Math.ceil(property.unit_count / UNITS_PER_FLOOR))

  const [selectedFloor, setSelectedFloor] = useState(1)
  const [selectedAptIdx, setSelectedAptIdx] = useState(0)

  const [overview, setOverview]       = useState<BuildingOverview | null>(null)
  const [overviewError, setOvError]   = useState<string | null>(null)

  const [history, setHistory]         = useState<UnitHistoryResponse | null>(null)
  const [historyLoading, setHLoading] = useState(true)
  const [historyError, setHError]     = useState<string | null>(null)

  const [forecastTimeline, setForecastTimeline] = useState<ForecastTimelineResponse | null>(null)
  const [forecastError, setFError]              = useState<string | null>(null)
  const [forecastGran, setForecastGran]         = useState<ForecastGranularity>('monthly')

  // Load overview once per property
  useEffect(() => {
    setOverview(null); setOvError(null)
    getBuildingOverview(property.id)
      .then(setOverview)
      .catch((err: unknown) => setOvError(err instanceof Error ? err.message : 'Failed to load'))
  }, [property.id])

  // Load history whenever unit selection changes
  useEffect(() => {
    setHLoading(true); setHError(null)
    const aptIdx = selectedAptIdx + 1
    getUnitHistory(property.id, selectedFloor, aptIdx)
      .then(setHistory)
      .catch((err: unknown) => setHError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setHLoading(false))
  }, [property.id, selectedFloor, selectedAptIdx])

  // Load forecast timeline whenever unit selection OR granularity changes
  useEffect(() => {
    setForecastTimeline(null); setFError(null)
    const aptIdx = selectedAptIdx + 1
    getUnitForecastTimeline(property.id, selectedFloor, aptIdx, forecastGran)
      .then(setForecastTimeline)
      .catch((err: unknown) => setFError(err instanceof Error ? err.message : 'Failed to load'))
  }, [property.id, selectedFloor, selectedAptIdx, forecastGran])

  const allUnits = overview?.units ?? []

  const top5 = useMemo(
    () => [...allUnits].sort((a, b) => b.annual_energy_kwh - a.annual_energy_kwh).slice(0, 5),
    [allUnits],
  )
  const bottom5 = useMemo(
    () => [...allUnits].sort((a, b) => a.annual_energy_kwh - b.annual_energy_kwh).slice(0, 5),
    [allUnits],
  )

  const selectedUnit = allUnits.find(u => u.floor === selectedFloor && u.apt === APT_LABELS[selectedAptIdx])
  const selectedRooms = selectedUnit?.rooms ?? []
  const roomMaxEnergy = selectedRooms.length > 0
    ? Math.max(
        ...selectedRooms.map(r => r.annual_energy_kwh),
        ...selectedRooms.map(r => r.building_avg_kwh),
      )
    : 1

  const aptLabel = `${selectedFloor}${APT_LABELS[selectedAptIdx]}`

  // Chart data derived from history response
  const energyData = history?.monthly_apartment.map((d, i) => ({
    label: d.month, Apartment: d.energy_kwh, Average: history.monthly_average[i]?.energy_kwh ?? 0,
  })) ?? []
  const costData = history?.monthly_apartment.map((d, i) => ({
    label: d.month, Apartment: d.cost_eur, Average: history.monthly_average[i]?.cost_eur ?? 0,
  })) ?? []
  const co2Data = history?.monthly_apartment.map((d, i) => ({
    label: d.month, Apartment: d.co2_kg, Average: history.monthly_average[i]?.co2_kg ?? 0,
  })) ?? []

  const weeklyEnergyData = history?.weekly ?? []
  const weeklyCostData = (history?.weekly ?? []).map(d => ({
    ...d,
    apartment: Math.round(d.apartment * (history?.cost_per_kwh_eur ?? 0) * 10) / 10,
    average:   Math.round(d.average   * (history?.cost_per_kwh_eur ?? 0) * 10) / 10,
  }))
  const weeklyCo2Data = (history?.weekly ?? []).map(d => ({
    ...d,
    apartment: Math.round(d.apartment * (history?.emission_factor_kg_per_kwh ?? 0) * 10) / 10,
    average:   Math.round(d.average   * (history?.emission_factor_kg_per_kwh ?? 0) * 10) / 10,
  }))

  const dailyEnergyData = history?.daily ?? []
  const dailyCostData = (history?.daily ?? []).map(d => ({
    ...d,
    apartment: Math.round(d.apartment * (history?.cost_per_kwh_eur ?? 0) * 10) / 10,
    average:   Math.round(d.average   * (history?.cost_per_kwh_eur ?? 0) * 10) / 10,
  }))
  const dailyCo2Data = (history?.daily ?? []).map(d => ({
    ...d,
    apartment: Math.round(d.apartment * (history?.emission_factor_kg_per_kwh ?? 0) * 10) / 10,
    average:   Math.round(d.average   * (history?.emission_factor_kg_per_kwh ?? 0) * 10) / 10,
  }))

  // ComparisonChart currently expects { label, Apartment, Average } (capitalized).
  // Backend returns {label, apartment, average}. Remap once here.
  function toChart(points: { label: string; apartment: number; average: number }[]) {
    return points.map(p => ({ label: p.label, Apartment: p.apartment, Average: p.average }))
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center border-b border-stone-100 px-6 py-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-stone-500 hover:bg-transparent hover:text-brand">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back
        </Button>
        <span className="mx-3 h-4 w-px bg-stone-200" />
        <h1 className="text-sm font-semibold text-stone-900">{property.name ?? property.city}, {property.zipcode}</h1>
      </div>

      <div className="flex flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex-1 min-w-0">

          {/* ── Overview ──────────────────────────────────────────── */}
          <section className="px-6 py-6">
            <SectionHeader title="Overview" />
            {overviewError && (
              <p className="mt-3 text-xs text-red-600">Couldn't load overview: {overviewError}</p>
            )}
            <div className="mt-5 flex items-start gap-6">
              <div className="w-44 shrink-0">
                <UnitPieChart units={allUnits} />
              </div>
              <div className="flex min-w-0 flex-1 gap-6">
                <div className="min-w-0 flex-1">
                  <ConsumerTable title="Top 5 Consumers" units={top5} highlight="high" />
                </div>
                <div className="min-w-0 flex-1">
                  <ConsumerTable title="5 Lowest Consumers" units={bottom5} highlight="low" />
                </div>
              </div>
            </div>
          </section>

          {/* ── Historic Insights ─────────────────────────────────── */}
          <section className="px-6 py-6">
            <SectionHeader title="Historic Insights" />
            <div className="mt-5">
              <p className="mb-4 text-xs text-stone-400">
                Unit {aptLabel} vs. building average · last 12 months
                {historyLoading && ' · loading…'}
                {historyError && ` · ${historyError}`}
              </p>
              <div className="grid grid-cols-3 gap-4">
                <ComparisonChart
                  title="Energy Consumption"
                  unit="kWh"
                  monthlyData={energyData}
                  weeklyData={toChart(weeklyEnergyData)}
                  dailyData={toChart(dailyEnergyData)}
                  aptLabel={`Unit ${aptLabel}`}
                />
                <ComparisonChart
                  title="Heating Costs"
                  unit="€"
                  monthlyData={costData}
                  weeklyData={toChart(weeklyCostData)}
                  dailyData={toChart(dailyCostData)}
                  aptLabel={`Unit ${aptLabel}`}
                />
                <ComparisonChart
                  title="CO₂ Emissions"
                  unit="kg"
                  monthlyData={co2Data}
                  weeklyData={toChart(weeklyCo2Data)}
                  dailyData={toChart(dailyCo2Data)}
                  aptLabel={`Unit ${aptLabel}`}
                  accentColor={BRAND.DEFAULT}
                />
              </div>
            </div>
          </section>

          {/* ── Forecasts ─────────────────────────────────────────── */}
          <section className="px-6 py-6">
            <SectionHeader title="Forecasts" />
            <div className="mt-5">
              {forecastError && <p className="mb-2 text-xs text-red-600">Couldn't load forecast: {forecastError}</p>}
              <ForecastChart
                points={forecastTimeline?.points ?? []}
                cutoffLabel={forecastTimeline?.cutoff_label ?? ''}
                granularity={forecastGran}
                onGranularityChange={setForecastGran}
                subtitle={
                  forecastTimeline
                    ? `${forecastGran === 'monthly' ? 'This year' : 'This month'} · ${forecastTimeline.model} · actual to date + weather-driven forecast`
                    : 'Weather-driven energy forecast · loading…'
                }
              />
            </div>
          </section>

        </div>

        <div className="sticky top-0 self-start flex w-[420px] shrink-0 flex-col gap-3 max-h-screen overflow-y-auto py-5 pl-12 pr-14">

          {/* Floor + Unit dropdowns */}
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">Floor</span>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(Number(e.target.value))}
                className="h-8 w-full rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-800 shadow-sm outline-none transition focus:border-brand focus:ring-0"
              >
                {Array.from({ length: totalFloors }, (_, i) => i + 1).map(f => (
                  <option key={f} value={f}>Floor {f}</option>
                ))}
              </select>
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">Unit</span>
              <select
                value={selectedAptIdx}
                onChange={(e) => setSelectedAptIdx(Number(e.target.value))}
                className="h-8 w-full rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-800 shadow-sm outline-none transition focus:border-brand focus:ring-0"
              >
                {APT_LABELS.map((label, i) => (
                  <option key={i} value={i}>Unit {selectedFloor}{label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="h-px bg-stone-200" />

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">
              Building View
            </p>
            <IsometricBuilding
              totalFloors={totalFloors}
              selectedFloor={selectedFloor}
              onSelectFloor={setSelectedFloor}
            />
          </div>

          <div className="-mt-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">
              Floor {selectedFloor}
            </p>
            <FloorPlanView
              selectedAptIdx={selectedAptIdx}
              onSelectApt={setSelectedAptIdx}
              floor={selectedFloor}
            />

            <p className="mb-1.5 mt-6 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">
              Unit {aptLabel}
            </p>
            <div className="divide-y divide-stone-200">
              <div className="flex items-center py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-400">
                <span className="flex-1">Room</span>
                <span className="w-16 px-1 text-center">Usage</span>
                <span className="w-8 text-right">m²</span>
                <span className="w-14 text-right">kWh/yr</span>
                <span className="w-14 text-right">Avg</span>
              </div>
              {selectedRooms.map((room) => {
                const barW = `${Math.round((room.annual_energy_kwh / roomMaxEnergy) * 100)}%`
                const avgW = `${Math.round((room.building_avg_kwh / roomMaxEnergy) * 100)}%`
                return (
                  <div key={room.name} className="flex items-center py-1.5">
                    <span className="flex-1 text-[11px] font-medium text-stone-900">{room.name}</span>
                    <div className="w-16 px-1">
                      <div className="relative h-1 w-full overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-stone-300"
                          {...{ style: { width: avgW } as React.CSSProperties }}
                        />
                        <div
                          className="bar-fill absolute inset-y-0 left-0 rounded-full bg-brand"
                          {...{ style: { '--bar-w': barW } as React.CSSProperties }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-right text-[10px] tabular-nums text-stone-400">{room.sqm}</span>
                    <span className="w-14 text-right text-[11px] font-medium tabular-nums text-stone-700">
                      {Math.round(room.annual_energy_kwh).toLocaleString()}
                    </span>
                    <span className="w-14 text-right text-[10px] tabular-nums text-stone-400">
                      {Math.round(room.building_avg_kwh).toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
