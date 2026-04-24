import { PROPERTIES, type Property } from '@/data/properties'
import { PropertyCard } from './PropertyCard'

type PropertyListProps = {
  selectedId: number | null
  onSelect: (property: Property) => void
}

export function PropertyList({ selectedId, onSelect }: PropertyListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-stone-200 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">
          Portfolio · {PROPERTIES.length} Liegenschaften
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
          {PROPERTIES.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              selected={selectedId === property.id}
              onClick={() => onSelect(property)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
