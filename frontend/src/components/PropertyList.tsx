import { useState } from 'react'

import type { PropertyItem } from '@/lib/types'
import { PropertyCard } from './PropertyCard'
import { Button } from '@/components/ui/button'
import { ComparisonSheet } from './ComparisonSheet'

type PropertyListProps = {
  properties: PropertyItem[]
  loading: boolean
  error: string | null
  selectedIds: Set<number>
  onToggleSelect: (property: PropertyItem) => void
  onDetails: (property: PropertyItem) => void
  mapOpen: boolean
  onToggleMap: () => void
}

export function PropertyList({ properties, loading, error, selectedIds, onToggleSelect, onDetails, mapOpen, onToggleMap }: PropertyListProps) {
  const [compareOpen, setCompareOpen] = useState(false)

  const canCompare    = selectedIds.size >= 2
  const selectedProps = properties.filter((p) => selectedIds.has(p.id))

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end justify-between px-5 pb-3 pt-5">
        <div>
          <h1 className="text-xl font-semibold text-stone-950">Portfolio</h1>
          <p className="mt-0.5 text-sm text-stone-400">
            {loading ? 'Loading properties…' : error ? 'Failed to load' : `${properties.length} properties in portfolio`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={!canCompare}
            onClick={() => setCompareOpen(true)}
            className="rounded-md bg-stone-950 text-xs text-white hover:bg-stone-800 disabled:opacity-40"
          >
            Compare{canCompare ? ` (${selectedIds.size})` : ''}
          </Button>
          <Button
            size="sm"
            onClick={onToggleMap}
            className="rounded-md border border-stone-950 bg-transparent text-xs text-stone-950 shadow-none hover:bg-stone-100"
          >
            {mapOpen ? 'Close map' : 'Open map'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex h-32 items-center justify-center text-sm text-stone-400">
            Loading properties…
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                selected={selectedIds.has(property.id)}
                onClick={() => onToggleSelect(property)}
                onDetails={() => onDetails(property)}
              />
            ))}
          </div>
        )}
      </div>

      {compareOpen && (
        <ComparisonSheet
          properties={selectedProps}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  )
}
