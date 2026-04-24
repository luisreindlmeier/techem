import { useState, useMemo } from 'react'
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
import type { PropertyItem } from '@/lib/types'
import { ComparisonChart } from '@/components/ComparisonChart'
import { FloorPlanView } from '@/components/FloorPlanView'
import { ForecastChart } from '@/components/ForecastChart'
import { IsometricBuilding } from '@/components/IsometricBuilding'
import {
  APT_LABELS,
  floorsForProperty,
  getApartmentData,
  getBuildingAverage,
  getAllUnitsAnnualEnergy,
  getUnitForecast,
  getWeeklyComparison,
  getDailyComparison,
  type UnitSummary,
} from '@/data/buildingData'

type BuildingDetailPageProps = {
  property: PropertyItem
  onBack: () => void
}

const PIE_PALETTE = [
  '#1c1917', '#E30613', '#57534e', '#a8a29e',
  '#292524', '#78716c', '#c8c4c3', '#44403c',
  '#3d3533', '#9d9a99', '#6d6360', '#0c0a09',
  '#bcb8b7', '#8a8078', '#d6d3d1', '#e7e5e4',
]

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
  const total = units.reduce((s, u) => s + u.annualEnergy, 0)
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
              dataKey="annualEnergy"
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
              contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e7e5e4', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-0.5 text-center">
        <p className="text-sm font-semibold text-stone-900">{units.length} units</p>
        <p className="text-xs text-stone-400">{total.toLocaleString()} kWh/yr</p>
      </div>
    </div>
  )
}

const DIV = 'border-r border-stone-200'

function ConsumerTable({ title, units, highlight }: { title: string; units: UnitSummary[]; highlight: 'high' | 'low' }) {
  const roomNames = units[0]?.rooms.map(r => r.name) ?? []
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            {/* Row 1: group headers */}
            <tr className="border-b border-stone-200">
              <th className={cn('pb-1.5 pr-3 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-400', DIV)}>
                Unit
              </th>
              {roomNames.map(name => (
                <th key={name} colSpan={2} className={cn('pb-1.5 px-2 text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-400 whitespace-nowrap', DIV)}>
                  {name}
                </th>
              ))}
              <th className="pb-1.5 pl-3 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-400 whitespace-nowrap">
                Total
              </th>
            </tr>
            {/* Row 2: sub-column labels */}
            <tr className="border-b border-stone-100">
              <th aria-label="unit" className={DIV} />
              {roomNames.map(name => (
                <>
                  <th key={`${name}-sqm`} className="pb-1 pl-2 pr-1 text-right text-[9px] font-normal text-stone-300 whitespace-nowrap">m²</th>
                  <th key={`${name}-kwh`} className={cn('pb-1 pl-1 pr-2 text-right text-[9px] font-normal text-stone-300 whitespace-nowrap', DIV)}>kWh</th>
                </>
              ))}
              <th className="pb-1 pl-3 text-right text-[9px] font-normal text-stone-300 whitespace-nowrap">kWh/yr</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {units.map((unit) => (
              <tr key={unit.label}>
                <td className={cn('py-1.5 pr-3 font-semibold text-stone-900', DIV)}>{unit.label}</td>
                {unit.rooms.map(room => (
                  <>
                    <td key={`${room.name}-sqm`} className="py-1.5 pl-2 pr-1 text-right tabular-nums text-[10px] text-stone-400 whitespace-nowrap">
                      {room.sqm}
                    </td>
                    <td key={`${room.name}-kwh`} className={cn('py-1.5 pl-1 pr-2 text-right tabular-nums text-stone-700 whitespace-nowrap', DIV)}>
                      {room.annualEnergy.toLocaleString()}
                    </td>
                  </>
                ))}
                <td className={cn(
                  'py-1.5 pl-3 text-right tabular-nums font-semibold whitespace-nowrap',
                  highlight === 'high' ? 'text-[#E30613]' : 'text-emerald-600',
                )}>
                  {unit.annualEnergy.toLocaleString()}
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
  const totalFloors = floorsForProperty(property.unit_count)

  const [selectedFloor, setSelectedFloor] = useState(1)
  const [selectedAptIdx, setSelectedAptIdx] = useState(0)

  const aptData = useMemo(
    () => getApartmentData(property.id, selectedFloor, selectedAptIdx + 1),
    [property.id, selectedFloor, selectedAptIdx],
  )

  const avgData = useMemo(
    () => getBuildingAverage(property.id, property.unit_count),
    [property.id, property.unit_count],
  )

  const allUnits = useMemo(
    () => getAllUnitsAnnualEnergy(property.id, property.unit_count),
    [property.id, property.unit_count],
  )

  const top5 = useMemo(
    () => [...allUnits].sort((a, b) => b.annualEnergy - a.annualEnergy).slice(0, 5),
    [allUnits],
  )

  const selectedUnitData = allUnits.find(u => u.floor === selectedFloor && u.apt === APT_LABELS[selectedAptIdx])
  const selectedUnitRooms = selectedUnitData?.rooms ?? []
  const roomMaxEnergy = selectedUnitRooms.length > 0 ? Math.max(...selectedUnitRooms.map(r => r.annualEnergy)) : 1

  const bottom5 = useMemo(
    () => [...allUnits].sort((a, b) => a.annualEnergy - b.annualEnergy).slice(0, 5),
    [allUnits],
  )

  const aptLabel = `${selectedFloor}${APT_LABELS[selectedAptIdx]}`

  const energyData = aptData.map((d, i) => ({ label: d.month, Apartment: d.energy_kwh, Average: avgData[i].energy_kwh }))
  const costData   = aptData.map((d, i) => ({ label: d.month, Apartment: d.cost_eur,   Average: avgData[i].cost_eur   }))
  const co2Data    = aptData.map((d, i) => ({ label: d.month, Apartment: d.co2_kg,     Average: avgData[i].co2_kg     }))

  const weeklyRaw = useMemo(
    () => getWeeklyComparison(property.id, selectedFloor, selectedAptIdx + 1, property.unit_count),
    [property.id, property.unit_count, selectedFloor, selectedAptIdx],
  )
  const weeklyEnergyData = weeklyRaw
  const weeklyCostData   = weeklyRaw.map(d => ({ ...d, Apartment: Math.round(d.Apartment * 0.19 * 10) / 10, Average: Math.round(d.Average * 0.19 * 10) / 10 }))
  const weeklyCo2Data    = weeklyRaw.map(d => ({ ...d, Apartment: Math.round(d.Apartment * 0.21 * 10) / 10, Average: Math.round(d.Average * 0.21 * 10) / 10 }))

  const dailyRaw = useMemo(
    () => getDailyComparison(property.id, selectedFloor, selectedAptIdx + 1, property.unit_count),
    [property.id, property.unit_count, selectedFloor, selectedAptIdx],
  )
  const dailyEnergyData = dailyRaw
  const dailyCostData   = dailyRaw.map(d => ({ ...d, Apartment: Math.round(d.Apartment * 0.19 * 10) / 10, Average: Math.round(d.Average * 0.19 * 10) / 10 }))
  const dailyCo2Data    = dailyRaw.map(d => ({ ...d, Apartment: Math.round(d.Apartment * 0.21 * 10) / 10, Average: Math.round(d.Average * 0.21 * 10) / 10 }))

  const forecastData = useMemo(
    () => getUnitForecast(property.id, selectedFloor, selectedAptIdx + 1),
    [property.id, selectedFloor, selectedAptIdx],
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center border-b border-stone-100 px-6 py-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-stone-500 hover:bg-transparent hover:text-[#E30613]">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back
        </Button>
        <span className="mx-3 h-4 w-px bg-stone-200" />
        <h1 className="text-sm font-semibold text-stone-900">{property.city}, {property.zipcode}</h1>
      </div>

      {/* Body: single scroll container so scrollbar lands at screen edge */}
      <div className="flex flex-1 overflow-y-auto overflow-x-hidden">

        {/* Left: natural-height content drives overall scroll */}
        <div className="flex-1 min-w-0">

          {/* ── Overview ──────────────────────────────────────────── */}
          <section className="px-6 py-6">
            <SectionHeader title="Overview" />
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
              </p>
              <div className="grid grid-cols-3 gap-4">
                <ComparisonChart
                  title="Energy Consumption"
                  unit="kWh"
                  monthlyData={energyData}
                  weeklyData={weeklyEnergyData}
                  dailyData={dailyEnergyData}
                  aptLabel={`Unit ${aptLabel}`}
                />
                <ComparisonChart
                  title="Heating Costs"
                  unit="€"
                  monthlyData={costData}
                  weeklyData={weeklyCostData}
                  dailyData={dailyCostData}
                  aptLabel={`Unit ${aptLabel}`}
                />
                <ComparisonChart
                  title="CO₂ Emissions"
                  unit="kg"
                  monthlyData={co2Data}
                  weeklyData={weeklyCo2Data}
                  dailyData={dailyCo2Data}
                  aptLabel={`Unit ${aptLabel}`}
                  accentColor="#E30613"
                />
              </div>
            </div>
          </section>

          {/* ── Forecasts ─────────────────────────────────────────── */}
          <section className="px-6 py-6">
            <SectionHeader title="Forecasts" />
            <div className="mt-5">
              <ForecastChart data={forecastData} />
            </div>
          </section>

        </div>

        {/* Right: sticks to top while left content scrolls past */}
        <div className="sticky top-0 self-start flex w-[420px] shrink-0 flex-col gap-3 max-h-screen overflow-y-auto py-5 pl-12 pr-14">

          {/* Floor + Unit dropdowns */}
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">Floor</span>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(Number(e.target.value))}
                className="h-8 w-full rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-800 shadow-sm outline-none transition focus:border-[#E30613] focus:ring-0"
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
                className="h-8 w-full rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-800 shadow-sm outline-none transition focus:border-[#E30613] focus:ring-0"
              >
                {APT_LABELS.map((label, i) => (
                  <option key={i} value={i}>Unit {selectedFloor}{label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="h-px bg-stone-200" />

          {/* Building view — floor labels are clickable */}
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

          {/* Floor plan + room breakdown */}
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
                <span className="w-20 px-2 text-center">Usage</span>
                <span className="w-8 text-right">m²</span>
                <span className="w-16 text-right">kWh/yr</span>
              </div>
              {selectedUnitRooms.map((room) => {
                const barW = `${Math.round((room.annualEnergy / roomMaxEnergy) * 100)}%`
                return (
                  <div key={room.name} className="flex items-center py-1.5">
                    <span className="flex-1 text-[11px] font-medium text-stone-900">{room.name}</span>
                    <div className="w-20 px-2">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="bar-fill h-full rounded-full bg-[#E30613]"
                          {...{ style: { '--bar-w': barW } as React.CSSProperties }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-right text-[10px] tabular-nums text-stone-400">{room.sqm}</span>
                    <span className="w-16 text-right text-[11px] font-medium tabular-nums text-stone-700">
                      {room.annualEnergy.toLocaleString()}
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
