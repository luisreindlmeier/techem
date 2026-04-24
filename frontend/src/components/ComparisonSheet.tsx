import { useEffect, useRef } from 'react'
import lottie, { type AnimationItem } from 'lottie-web'
import { cn } from '@/lib/utils'
import type { PropertyItem, PropertyStats } from '@/lib/types'
import { buildingImageUrl } from '@/lib/buildingImages'
import { usePropertyStatsMap } from '@/lib/propertyStats'

const X_FRAME = 45

function formatNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k`
  return v.toFixed(0)
}

function statValue(stats: PropertyStats | undefined, key: 'kwh' | 'eur' | 'co2'): string {
  if (!stats) return '—'
  if (key === 'kwh') return `${formatNum(stats.annual_energy_kwh)} kWh`
  if (key === 'eur') return `€${formatNum(stats.annual_cost_eur)}`
  return `${formatNum(stats.annual_co2_kg)} kg`
}

const ROWS: {
  label: string
  value: (p: PropertyItem, statsById: Record<number, PropertyStats>) => string
}[] = [
  { label: 'City',          value: (p) => p.city },
  { label: 'ZIP',           value: (p) => p.zipcode },
  { label: 'Energy Source', value: (p) => p.energysource },
  { label: 'Units',         value: (p) => String(p.unit_count) },
  { label: 'Annual Energy', value: (p, s) => statValue(s[p.id], 'kwh') },
  { label: 'Annual Cost',   value: (p, s) => statValue(s[p.id], 'eur') },
  { label: 'Annual CO₂',    value: (p, s) => statValue(s[p.id], 'co2') },
]


const LABEL_W = 152
const PROP_W  = 220

type Props = { properties: PropertyItem[]; onClose: () => void }

export function ComparisonSheet({ properties, onClose }: Props) {
  const n          = properties.length
  const scrollable = n > 4
  const statsById  = usePropertyStatsMap()

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
    ? `${LABEL_W}px repeat(${n}, ${PROP_W}px)`
    : `${LABEL_W}px repeat(${n}, minmax(0, 1fr))`

  const gridMinW = scrollable ? LABEL_W + n * PROP_W : undefined

  const cells: React.ReactNode[] = []

  // Image header row — sticky so it stays visible while scrolling rows
  cells.push(<div key="img-label" className="sticky top-0 z-10 bg-white" />)
  properties.forEach((p, i) => {
    cells.push(
      <div
        key={`img-${p.id}`}
        className={cn(
          'sticky top-0 z-10 bg-white p-3 pb-4',
          i > 0 && 'border-l border-stone-200',
        )}
      >
        <div className="h-24 w-full overflow-hidden rounded-md bg-stone-100">
          <img
            src={buildingImageUrl(p.id)}
            alt={p.city}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <p className="mt-2 truncate text-sm font-semibold text-stone-900">{p.city}</p>
        <p className="text-xs text-stone-400">ZIP {p.zipcode}</p>
      </div>,
    )
  })

  // Data rows — dividers between rows (not above first), dividers between prop cols (not left of first)
  ROWS.forEach((row, rowIdx) => {
    cells.push(
      <div
        key={`label-${rowIdx}`}
        className="border-t border-stone-100 px-4 py-3 text-xs font-medium uppercase tracking-wide text-stone-400"
      >
        {row.label}
      </div>,
    )
    properties.forEach((p, colIdx) => {
      cells.push(
        <div
          key={`${rowIdx}-${colIdx}`}
          className={cn(
            'border-t border-stone-100 px-4 py-3 text-sm font-medium text-stone-900',
            colIdx > 0 && 'border-l border-stone-200',
          )}
        >
          {row.value(p, statsById)}
        </div>,
      )
    })
  })

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 animate-fade-in"
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-xl border-t border-stone-200 bg-white shadow-2xl animate-slide-up"
        style={{ height: '60vh' }}
      >
        {/* Drag handle */}
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-stone-300" />
        </div>

        {/* Sheet header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-950">Comparison</h2>
            <p className="text-xs text-stone-400">{n} properties selected</p>
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

        {/* Comparison table — always overflow-x-auto; horizontal scroll only triggers when scrollable */}
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
