import { BuildingOffice2Icon, BoltIcon, HomeIcon } from '@heroicons/react/24/outline'

import { cn } from '@/lib/utils'
import type { Property } from '@/data/properties'

type PropertyCardProps = {
  property: Property
  selected: boolean
  onClick: () => void
}

const SOURCE_COLORS: Record<string, string> = {
  Erdgas:      'bg-amber-50 text-amber-700 border-amber-200',
  Fernwärme:   'bg-blue-50 text-blue-700 border-blue-200',
  Wärmepumpe:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Heizöl:      'bg-stone-100 text-stone-600 border-stone-300',
  Pellets:     'bg-lime-50 text-lime-700 border-lime-200',
}

export function PropertyCard({ property, selected, onClick }: PropertyCardProps) {
  const badgeClass = SOURCE_COLORS[property.energysource] ?? 'bg-stone-100 text-stone-600 border-stone-300'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-md border bg-white p-4 text-left shadow-sm transition-all duration-150',
        'hover:shadow-md hover:border-stone-300',
        selected
          ? 'border-[#E30613] ring-1 ring-[#E30613]'
          : 'border-stone-200',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <BuildingOffice2Icon
              className={cn('h-4 w-4 shrink-0', selected ? 'text-[#E30613]' : 'text-stone-400')}
            />
            <span className={cn('truncate text-sm font-semibold', selected ? 'text-[#E30613]' : 'text-stone-950')}>
              {property.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pl-6">
            <HomeIcon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
            <span className="text-xs text-stone-500">
              {property.city} · {property.zipcode}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
              badgeClass,
            )}
          >
            <BoltIcon className="h-3 w-3" />
            {property.energysource}
          </span>
          <span className="text-xs text-stone-400">
            {property.units} Einh.
          </span>
        </div>
      </div>
    </button>
  )
}
