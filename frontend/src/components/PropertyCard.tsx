import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PropertyItem } from '@/lib/types'
import { buildingImageUrl } from '@/lib/buildingImages'
import { usePropertyStats, usePropertyStatsAverages } from '@/lib/propertyStats'
import { heatColor } from '@/lib/chartColors'

type PropertyCardProps = {
  property: PropertyItem
  selected: boolean
  onClick: () => void
  onDetails?: () => void
}

const SOURCE_COLORS: Record<string, string> = {
  'Natural Gas':     'bg-amber-50 text-amber-700 border-amber-200',
  'District Heating':'bg-blue-50 text-blue-700 border-blue-200',
  'Heat Pump':       'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Heating Oil':     'bg-stone-100 text-stone-600 border-stone-300',
  Pellets:           'bg-lime-50 text-lime-700 border-lime-200',
}

function formatKwh(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k`
  return v.toFixed(0)
}

function formatKg(v: number): string {
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}t`
  return v.toFixed(0)
}

export function PropertyCard({ property, selected, onClick, onDetails }: PropertyCardProps) {
  const badgeClass = SOURCE_COLORS[property.energysource] ?? 'bg-stone-100 text-stone-600 border-stone-300'
  const stats = usePropertyStats(property.id)
  const { avgEnergy, avgCo2 } = usePropertyStatsAverages()

  const energyHeat = stats && avgEnergy > 0 ? heatColor(stats.annual_energy_kwh / avgEnergy) : null
  const co2Heat    = stats && avgCo2    > 0 ? heatColor(stats.annual_co2_kg    / avgCo2)    : null
  const combinedRatio = stats && avgEnergy > 0 && avgCo2 > 0
    ? (stats.annual_energy_kwh / avgEnergy + stats.annual_co2_kg / avgCo2) / 2
    : null
  const selectionHeat = combinedRatio != null ? heatColor(combinedRatio) : '#111111'

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card
        className={cn(
          'overflow-hidden transition-all duration-150 hover:shadow-md rounded-md',
          selected
            ? 'ring-1 shadow-sm'
            : 'border-stone-200 shadow-sm hover:border-stone-300',
        )}
        {...(selected
          ? { style: { borderColor: selectionHeat, boxShadow: `0 0 0 1px ${selectionHeat}` } as React.CSSProperties }
          : {})}
      >
        {/* Cover image */}
        <div className="relative h-44 w-full overflow-hidden bg-stone-100">
          <img
            src={buildingImageUrl(property.id)}
            alt={`${property.city} property`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          {/* Energy source badge */}
          <span
            className={cn(
              'absolute left-2.5 top-2.5 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm',
              badgeClass,
            )}
          >
            {property.energysource}
          </span>
          {/* Unit count badge */}
          <span className="absolute right-2.5 top-2.5 rounded border border-stone-300 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-stone-700 backdrop-blur-sm">
            {property.unit_count} units
          </span>
        </div>

        <CardContent className="px-4 py-3">
          {/* Name / city + zipcode */}
          <p
            className="text-sm font-semibold leading-snug"
            {...(selected
              ? { style: { color: selectionHeat } as React.CSSProperties }
              : { style: { color: '#1c1917' } as React.CSSProperties })}
          >
            {property.name ?? property.city}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            <span className="font-medium text-stone-400">ZIP</span> {property.zipcode}
          </p>

          {/* Stats row — annual from real readings / weather model */}
          <div className="mt-3 flex gap-3 border-t border-stone-100 pt-3">
            <div className="flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">Annual</p>
              <p
                className="mt-0.5 text-sm font-semibold"
                {...{ style: { color: energyHeat ?? '#1c1917' } as React.CSSProperties }}
              >
                {stats ? formatKwh(stats.annual_energy_kwh) : '—'}
                <span className="text-xs font-normal text-stone-400"> kWh</span>
              </p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">CO₂</p>
              <p
                className="mt-0.5 text-sm font-semibold"
                {...{ style: { color: co2Heat ?? '#1c1917' } as React.CSSProperties }}
              >
                {stats ? formatKg(stats.annual_co2_kg) : '—'}
                <span className="text-xs font-normal text-stone-400"> kg</span>
              </p>
            </div>
          </div>

          <Button
            size="sm"
            className="mt-3 h-7 w-full rounded-md bg-stone-900 text-xs text-white hover:bg-stone-800"
            onClick={(e) => { e.stopPropagation(); onDetails?.() }}
          >
            View Object
          </Button>
        </CardContent>
      </Card>
    </button>
  )
}
