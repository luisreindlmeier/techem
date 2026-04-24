import { useRef, useEffect, useState, useMemo } from 'react'
import { Map, Layer, Source, type MapRef } from 'react-map-gl/maplibre'

import { Button } from '@/components/ui/button'
import { BRAND, MAP_BUILDING_STOPS } from '@/lib/chartColors'
import type { PropertyItem } from '@/lib/types'

import 'maplibre-gl/dist/maplibre-gl.css'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string

const MAP_STYLE = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

const GERMANY_CENTER = { longitude: 10.4515, latitude: 51.1657, zoom: 6, pitch: 0, bearing: 0 }

// ---------------------------------------------------------------------------
// Static map layers
// ---------------------------------------------------------------------------

const BUILDINGS_LAYER = {
  id:   'buildings-3d',
  type: 'fill-extrusion' as const,
  source: 'maptiler_planet',
  'source-layer': 'building',
  minzoom: 12,
  paint: {
    'fill-extrusion-color': [
      'interpolate', ['linear'],
      ['coalesce', ['get', 'render_height'], 0],
      ...MAP_BUILDING_STOPS.flatMap(([h, c]) => [h, c]),
    ],
    'fill-extrusion-height': [
      'interpolate', ['linear'], ['zoom'],
      12, 0,
      13, ['coalesce', ['get', 'render_height'], 4],
    ],
    'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
    'fill-extrusion-opacity': 0.88,
  },
}

const PORTFOLIO_BUILDINGS_LAYER = {
  id:   'portfolio-buildings',
  type: 'fill-extrusion' as const,
  source: 'portfolio-buildings',
  paint: {
    'fill-extrusion-color':   BRAND.DEFAULT,
    'fill-extrusion-height':  ['get', 'height'],
    'fill-extrusion-base':    ['get', 'base'],
    'fill-extrusion-opacity': 1.0,
  },
}

// ---------------------------------------------------------------------------
// Resize constants
// ---------------------------------------------------------------------------

const MIN_WIDTH     = 22
const MAX_WIDTH     = 78
const DEFAULT_WIDTH = 40

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HoverInfo = { x: number; y: number; propertyId: number }

type MapSidebarProps = {
  isOpen: boolean
  properties: PropertyItem[]
  onSelectProperty?: (id: number | null) => void
  onOpenDetails?: (id: number) => void
  selectedPropertyId?: number | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MapSidebar({ isOpen, properties, onSelectProperty, onOpenDetails, selectedPropertyId }: MapSidebarProps) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const [dragging,  setDragging]   = useState(false)
  const [hoverInfo, setHoverInfo]   = useState<HoverInfo | null>(null)
  const mapRef = useRef<MapRef>(null)

  // --- Build portfolio GeoJSON from live properties data --------------------
  const portfolioGeojson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: properties
      .filter((p) => p.footprint_polygon != null)
      .map((p) => ({
        type: 'Feature' as const,
        properties: {
          id:     p.id,
          name:   p.name ?? p.city,
          height: p.building_height ?? 12,
          base:   0,
        },
        geometry: {
          type:        'Polygon' as const,
          coordinates: p.footprint_polygon!,
        },
      })),
  }), [properties])

  // --- Build fly targets from live properties data -------------------------
  const flyTargets = useMemo(() => {
    const map: Record<number, { lng: number; lat: number }> = {}
    for (const p of properties) {
      if (p.lat != null && p.lng != null) {
        map[p.id] = { lat: p.lat, lng: p.lng }
      }
    }
    return map
  }, [properties])

  // --- Fly to selected property (also re-fires when flyTargets populates) --
  useEffect(() => {
    if (!selectedPropertyId) return
    const target = flyTargets[selectedPropertyId]
    if (!target) return
    mapRef.current?.flyTo({
      center:   [target.lng, target.lat],
      zoom:     17,
      pitch:    60,
      bearing:  -20,
      duration: 2800,
      curve:    1.6,
      essential: true,
    })
  }, [selectedPropertyId, flyTargets])

  // --- Drag-to-resize -------------------------------------------------------
  const dragRef = useRef({ active: false, startX: 0, startW: 0 })

  function handleDragStart(e: React.MouseEvent) {
    dragRef.current = { active: true, startX: e.clientX, startW: panelWidth }
    setDragging(true)
    e.preventDefault()
    document.body.style.userSelect = 'none'
    document.body.style.cursor     = 'col-resize'
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current.active) return
      const delta = ((dragRef.current.startX - e.clientX) / window.innerWidth) * 100
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragRef.current.startW + delta)))
    }
    function onUp() {
      if (!dragRef.current.active) return
      dragRef.current.active         = false
      setDragging(false)
      document.body.style.userSelect = ''
      document.body.style.cursor     = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  // --- Tooltip hide delay ---------------------------------------------------
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function cancelHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }
  function scheduleHide() {
    cancelHide()
    hideTimer.current = setTimeout(() => setHoverInfo(null), 250)
  }

  // --- Hover tooltip --------------------------------------------------------
  function handleMouseMove(e: {
    point:     { x: number; y: number }
    features?: { layer?: { id?: string }; properties?: Record<string, unknown> }[]
  }) {
    const feat = e.features?.[0]
    if (feat?.layer?.id === 'portfolio-buildings') {
      const id = feat.properties?.id
      if (typeof id === 'number') {
        cancelHide()
        setHoverInfo({ x: e.point.x, y: e.point.y, propertyId: id })
        return
      }
    }
    scheduleHide()
  }

  // --- Map click — toggle selection ----------------------------------------
  function handleClick(e: {
    features?: { layer?: { id?: string }; properties?: Record<string, unknown> }[]
  }) {
    const feat = e.features?.[0]
    if (!feat || feat.layer?.id !== 'portfolio-buildings') return
    const raw = feat.properties?.id
    const clickedId = typeof raw === 'number' ? raw : null
    if (clickedId === null) return
    onSelectProperty?.(clickedId === selectedPropertyId ? null : clickedId)
  }

  // --- Look up hovered property for tooltip --------------------------------
  const hoveredProperty = hoverInfo
    ? (properties.find((p) => p.id === hoverInfo.propertyId) ?? null)
    : null

  // ---------------------------------------------------------------------------
  return (
    <>
      <div
        className="relative h-full flex-shrink-0 overflow-hidden"
        style={{
          width:      isOpen ? `${panelWidth}%` : 0,
          transition: dragging ? 'none' : 'width 300ms ease-in-out',
        }}
      >
        <div className="absolute inset-3 overflow-hidden rounded-lg shadow-xl">
          <div
            className="absolute left-0 top-0 z-10 h-full w-3 cursor-col-resize"
            onMouseDown={handleDragStart}
          />

          <Map
            ref={mapRef}
            initialViewState={GERMANY_CENTER}
            mapStyle={MAP_STYLE}
            style={{ width: '100%', height: '100%' }}
            interactiveLayerIds={[
              ...(MAPTILER_KEY ? ['buildings-3d'] : []),
              'portfolio-buildings',
            ]}
            onMouseMove={handleMouseMove as any}
            onMouseLeave={scheduleHide}
            onClick={handleClick as any}
          >
            {MAPTILER_KEY && (
              <Layer {...(BUILDINGS_LAYER as any)} />
            )}

            <Source id="portfolio-buildings" type="geojson" data={portfolioGeojson}>
              <Layer {...(PORTFOLIO_BUILDINGS_LAYER as any)} />
            </Source>
          </Map>

          {/* Building tooltip */}
          {hoverInfo && hoveredProperty && (
            <div
              className="absolute z-[100] w-56 rounded-md border border-stone-200 bg-white shadow-lg"
              style={{ left: hoverInfo.x + 16, top: Math.max(8, hoverInfo.y - 90) }}
              onMouseEnter={cancelHide}
              onMouseLeave={scheduleHide}
            >
              <div className="px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
                  Property
                </p>
                <p className="mt-0.5 text-sm font-semibold text-stone-900">
                  {hoveredProperty.name ?? hoveredProperty.city}
                </p>
                {hoveredProperty.street && (
                  <p className="mt-0.5 text-xs text-stone-500">{hoveredProperty.street}</p>
                )}
                <p className="text-xs text-stone-500">
                  {hoveredProperty.zipcode} {hoveredProperty.city}
                </p>
              </div>
              <div className="border-t border-stone-100 px-3.5 py-2.5">
                <Button
                  size="sm"
                  className="h-7 w-full bg-brand text-xs text-white hover:bg-brand-hover"
                  onClick={() => onOpenDetails?.(hoveredProperty.id)}
                >
                  More Details
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
