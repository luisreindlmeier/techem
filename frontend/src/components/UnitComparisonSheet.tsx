import { useEffect, useMemo, useRef } from 'react'
import lottie, { type AnimationItem } from 'lottie-web'

import { cn } from '@/lib/utils'
import { heatColor, hexToRgba } from '@/lib/chartColors'
import type { UnitSummary } from '@/lib/types'

const X_FRAME = 45
const LABEL_W = 168
const UNIT_W  = 200

function formatNum(v: number): string {
  if (!isFinite(v)) return '—'
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(1)}k`
  return v.toFixed(0)
}

function totalSqm(unit: UnitSummary): number {
  return unit.rooms.reduce((s, r) => s + r.sqm, 0)
}

function intensity(unit: UnitSummary): number {
  const sqm = totalSqm(unit)
  return sqm > 0 ? unit.annual_energy_kwh / sqm : 0
}

function HeatCell({
  value,
  unit,
  avg,
  bold = true,
}: {
  value: number
  unit: string
  avg: number
  bold?: boolean
}) {
  const ratio = avg > 0 ? value / avg : 1
  const color = heatColor(ratio)
  return (
    <span
      className={cn('tabular-nums', bold ? 'font-semibold' : 'font-medium')}
      style={{ color }}
    >
      {formatNum(value)} {unit}
    </span>
  )
}

type UnitComparisonSheetProps = {
  units: UnitSummary[]
  costPerKwhEur: number
  emissionFactorKgPerKwh: number
  buildingAvgKwh: number
  onClose: () => void
}

export function UnitComparisonSheet({
  units,
  costPerKwhEur,
  emissionFactorKgPerKwh,
  buildingAvgKwh,
  onClose,
}: UnitComparisonSheetProps) {
  const n = units.length
  const scrollable = n > 4

  const closeHostRef = useRef<HTMLSpanElement | null>(null)
  const closeAnimRef = useRef<AnimationItem | null>(null)

  useEffect(() => {
    if (!closeHostRef.current) return
    const anim = lottie.loadAnimation({
      container: closeHostRef.current,
      renderer:  'svg',
      loop:      false,
      autoplay:  false,
      path:      '/animations/menu.json',
    })
    closeAnimRef.current = anim
    anim.addEventListener('DOMLoaded', () => anim.goToAndStop(X_FRAME, true))
    return () => { anim.destroy(); closeAnimRef.current = null }
  }, [])

  const gridCols = scrollable
    ? `${LABEL_W}px repeat(${n}, ${UNIT_W}px)`
    : `${LABEL_W}px repeat(${n}, minmax(0, 1fr))`

  const gridMinW = scrollable ? LABEL_W + n * UNIT_W : undefined

  // Derived aggregates used to compute cross-unit averages (for heat coloring).
  const avgEnergy = useMemo(
    () => (units.length > 0 ? units.reduce((s, u) => s + u.annual_energy_kwh, 0) / units.length : 0),
    [units],
  )
  const avgCost = avgEnergy * costPerKwhEur
  const avgCo2  = avgEnergy * emissionFactorKgPerKwh
  const avgSqm  = useMemo(
    () => (units.length > 0 ? units.reduce((s, u) => s + totalSqm(u), 0) / units.length : 0),
    [units],
  )
  const avgIntensity = useMemo(
    () => (units.length > 0 ? units.reduce((s, u) => s + intensity(u), 0) / units.length : 0),
    [units],
  )

  // Maximum room count across selected units — used to render uniform per-room rows.
  const maxRooms = useMemo(
    () => Math.max(0, ...units.map(u => u.rooms.length)),
    [units],
  )
  const roomLabels = useMemo(() => {
    return Array.from({ length: maxRooms }, (_, i) => {
      const fromUnit = units.find(u => u.rooms[i])?.rooms[i]?.name
      return fromUnit ?? `Room ${i + 1}`
    })
  }, [units, maxRooms])

  // Metric rows driven by the selected units — each row renders its own custom
  // coloring, so we store render functions rather than primitive strings.
  const metricRows: {
    label: string
    render: (u: UnitSummary) => React.ReactNode
  }[] = [
    { label: 'Floor',          render: (u) => <span className="text-stone-900">Floor {u.floor}</span> },
    { label: 'Position',       render: (u) => <span className="text-stone-900">{u.apt}</span> },
    { label: 'Rooms',          render: (u) => <span className="text-stone-900">{u.rooms.length}</span> },
    { label: 'Total Area',     render: (u) => {
        const sqm = totalSqm(u)
        const ratio = avgSqm > 0 ? sqm / avgSqm : 1
        return <span className="tabular-nums font-medium" style={{ color: heatColor(ratio) }}>{sqm} m²</span>
      } },
    { label: 'Annual Energy',  render: (u) => <HeatCell value={u.annual_energy_kwh} unit="kWh" avg={avgEnergy} /> },
    { label: 'Annual Cost',    render: (u) => <HeatCell value={u.annual_energy_kwh * costPerKwhEur} unit="€" avg={avgCost} /> },
    { label: 'Annual CO₂',     render: (u) => <HeatCell value={u.annual_energy_kwh * emissionFactorKgPerKwh} unit="kg" avg={avgCo2} /> },
    { label: 'Intensity',      render: (u) => <HeatCell value={intensity(u)} unit="kWh/m²" avg={avgIntensity} bold={false} /> },
    { label: 'vs. Bldg Avg',   render: (u) => {
        const ratio = buildingAvgKwh > 0 ? u.annual_energy_kwh / buildingAvgKwh : 1
        const pct = Math.round((ratio - 1) * 100)
        const color = heatColor(ratio)
        const sign = pct > 0 ? '+' : ''
        return <span className="font-semibold tabular-nums" style={{ color }}>{sign}{pct}%</span>
      } },
  ]

  const cells: React.ReactNode[] = []

  // Unit header row — sticky so it stays visible while scrolling the rows.
  cells.push(<div key="hdr-label" className="sticky top-0 z-10 bg-white" />)
  units.forEach((u, i) => {
    const ratio = avgEnergy > 0 ? u.annual_energy_kwh / avgEnergy : 1
    const heat  = heatColor(ratio)
    cells.push(
      <div
        key={`hdr-${u.label}`}
        className={cn(
          'sticky top-0 z-10 bg-white p-3 pb-4',
          i > 0 && 'border-l border-stone-200',
        )}
      >
        <div
          className="flex h-24 w-full items-center justify-center overflow-hidden rounded-md"
          style={{ backgroundColor: hexToRgba(heat, 0.10), border: `1px solid ${hexToRgba(heat, 0.35)}` }}
        >
          <span className="text-3xl font-bold tracking-tight" style={{ color: heat }}>
            {u.label}
          </span>
        </div>
        <p className="mt-2 truncate text-sm font-semibold text-stone-900">Unit {u.label}</p>
        <p className="text-xs text-stone-400">Floor {u.floor} · {u.rooms.length} rooms</p>
      </div>,
    )
  })

  // Metric rows.
  metricRows.forEach((row, rowIdx) => {
    cells.push(
      <div
        key={`metric-label-${rowIdx}`}
        className="border-t border-stone-100 px-4 py-3 text-xs font-medium uppercase tracking-wide text-stone-400"
      >
        {row.label}
      </div>,
    )
    units.forEach((u, colIdx) => {
      cells.push(
        <div
          key={`metric-${rowIdx}-${colIdx}`}
          className={cn(
            'border-t border-stone-100 px-4 py-3 text-sm',
            colIdx > 0 && 'border-l border-stone-200',
          )}
        >
          {row.render(u)}
        </div>,
      )
    })
  })

  // Room breakdown separator.
  if (maxRooms > 0) {
    cells.push(
      <div
        key="room-header-label"
        className="border-t-2 border-stone-200 bg-stone-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500"
      >
        Room Breakdown
      </div>,
    )
    units.forEach((_, colIdx) => {
      cells.push(
        <div
          key={`room-header-${colIdx}`}
          className={cn(
            'border-t-2 border-stone-200 bg-stone-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400',
            colIdx > 0 && 'border-l border-stone-200',
          )}
        >
          m² · kWh/yr
        </div>,
      )
    })

    roomLabels.forEach((roomLabel, ri) => {
      cells.push(
        <div
          key={`room-label-${ri}`}
          className="border-t border-stone-100 px-4 py-2 text-xs font-medium text-stone-600"
        >
          {roomLabel}
        </div>,
      )
      units.forEach((u, colIdx) => {
        const room = u.rooms[ri]
        cells.push(
          <div
            key={`room-${ri}-${colIdx}`}
            className={cn(
              'border-t border-stone-100 px-4 py-2 text-sm',
              colIdx > 0 && 'border-l border-stone-200',
            )}
          >
            {room ? (
              <div className="flex items-center justify-between gap-3">
                <span className="tabular-nums text-xs text-stone-400">{room.sqm} m²</span>
                <span
                  className="tabular-nums font-medium"
                  style={{ color: heatColor(room.building_avg_kwh > 0 ? room.annual_energy_kwh / room.building_avg_kwh : 1) }}
                >
                  {Math.round(room.annual_energy_kwh).toLocaleString()}
                </span>
              </div>
            ) : (
              <span className="text-stone-300">—</span>
            )}
          </div>,
        )
      })
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 animate-fade-in"
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-xl border-t border-stone-200 bg-white shadow-2xl animate-slide-up"
        style={{ height: '72vh' }}
      >
        {/* Drag handle */}
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-stone-300" />
        </div>

        {/* Sheet header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-950">Unit Comparison</h2>
            <p className="text-xs text-stone-400">{n} units selected</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comparison"
            className="flex h-8 w-8 items-center justify-center p-0 text-stone-900"
          >
            <span ref={closeHostRef} className="h-7 w-7" aria-hidden="true" />
          </button>
        </div>

        {/* Comparison table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              ...(gridMinW != null ? { minWidth: gridMinW } : {}),
            }}
          >
            {cells}
          </div>
        </div>
      </div>
    </>
  )
}
