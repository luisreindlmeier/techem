import { useState } from 'react'

import type { Property } from '@/data/properties'
import { PropertyList } from '@/components/PropertyList'
import { MapSidebar } from '@/components/MapSidebar'

export function PortfolioPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mapOpen, setMapOpen] = useState(true)

  function handleSelect(property: Property) {
    setSelectedId((prev) => (prev === property.id ? null : property.id))
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Property list — grows to fill remaining space */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PropertyList selectedId={selectedId} onSelect={handleSelect} />
      </div>

      {/* Collapsible map panel + toggle button */}
      <MapSidebar isOpen={mapOpen} onToggle={() => setMapOpen((prev) => !prev)} />
    </div>
  )
}
