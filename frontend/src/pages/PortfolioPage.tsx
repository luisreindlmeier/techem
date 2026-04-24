import { useEffect, useRef, useState } from 'react'

import type { PropertyItem } from '@/lib/types'
import { PropertyList } from '@/components/PropertyList'
import { MapSidebar } from '@/components/MapSidebar'
import { BuildingDetailPage } from './BuildingDetailPage'

export function PortfolioPage({
  selectedPropertyId,
  onSelectProperty,
  resetKey,
  properties,
  propertiesLoading,
  propertiesError,
}: {
  selectedPropertyId: number | null
  onSelectProperty?: (id: number | null) => void
  resetKey?: number
  properties: PropertyItem[]
  propertiesLoading: boolean
  propertiesError: string | null
}) {
  const [selectedIds, setSelectedIds]       = useState<Set<number>>(new Set())
  const [mapOpen, setMapOpen]               = useState(true)
  const [detailProperty, setDetailProperty] = useState<PropertyItem | null>(null)

  const prevSelectedRef = useRef<number | null>(selectedPropertyId)

  useEffect(() => {
    if (resetKey === undefined) return
    setDetailProperty(null)
  }, [resetKey])

  useEffect(() => {
    const prev = prevSelectedRef.current
    prevSelectedRef.current = selectedPropertyId
    setSelectedIds((ids) => {
      const next = new Set(ids)
      if (prev !== null) next.delete(prev)
      if (selectedPropertyId !== null) next.add(selectedPropertyId)
      return next
    })
  }, [selectedPropertyId])

  function handleOpenDetailById(id: number) {
    const property = properties.find((p) => p.id === id)
    if (property) { setDetailProperty(property); onSelectProperty?.(id) }
  }

  function handleToggleSelect(property: PropertyItem) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(property.id)) next.delete(property.id)
      else next.add(property.id)
      return next
    })
  }

  if (detailProperty) {
    return (
      <BuildingDetailPage
        property={detailProperty}
        onBack={() => setDetailProperty(null)}
      />
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PropertyList
          properties={properties}
          loading={propertiesLoading}
          error={propertiesError}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onDetails={(p) => { setDetailProperty(p); onSelectProperty?.(p.id) }}
          mapOpen={mapOpen}
          onToggleMap={() => setMapOpen((prev) => !prev)}
        />
      </div>

      <MapSidebar
        isOpen={mapOpen}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={onSelectProperty}
        onOpenDetails={handleOpenDetailById}
      />
    </div>
  )
}
