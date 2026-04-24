import { useRef, useEffect, useState } from 'react'
import { Map, Layer, Source } from 'react-map-gl/maplibre'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

import { cn } from '@/lib/utils'

import 'maplibre-gl/dist/maplibre-gl.css'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string

const MAP_STYLE = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

// Centered on Westerbachstraße 47, 60489 Frankfurt am Main
const INITIAL_VIEW_STATE = {
  longitude: 8.6011537,
  latitude:  50.1218279,
  zoom:      17,
  pitch:     60,
  bearing:   -20,
}

// ---------------------------------------------------------------------------
// Gray buildings layer (all buildings, MapTiler source)
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
      0,  '#d4d0cb',
      20, '#dedad5',
      60, '#e8e5e0',
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

// ---------------------------------------------------------------------------
// Exact building footprint — OSM way 88689086
// Westerbachstraße 47, 60489 Frankfurt am Main
// ---------------------------------------------------------------------------

const TARGET_BUILDING_GEOJSON = {
  type: 'Feature' as const,
  properties: { height: 16, base: 0 },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [[
      [8.6010514, 50.1221653],
      [8.6009076, 50.1221578],
      [8.6009061, 50.1221268],
      [8.6005614, 50.1221337],
      [8.6005639, 50.1222149],
      [8.6005696, 50.1223134],
      [8.6006089, 50.1223159],
      [8.6017460, 50.1223882],
      [8.6017314, 50.1213376],
      [8.6014674, 50.1212676],
      [8.6014788, 50.1216462],
      [8.6006162, 50.1216603],
      [8.6006256, 50.1220455],
      [8.6008956, 50.1220437],
      [8.6008923, 50.1218260],
      [8.6014780, 50.1218081],
      [8.6014817, 50.1220626],
      [8.6013552, 50.1220634],
      [8.6013562, 50.1221345],
      [8.6014623, 50.1221338],
      [8.6014633, 50.1221970],
      [8.6012110, 50.1221774],
      [8.6012192, 50.1221326],
      [8.6010596, 50.1221205],
      [8.6010514, 50.1221653],
    ]],
  },
}

const HIGHLIGHT_LAYER = {
  id:   'building-highlight',
  type: 'fill-extrusion' as const,
  source: 'target-building',
  paint: {
    'fill-extrusion-color':   '#E30613',
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

type HoverInfo = { x: number; y: number; name?: string; height?: number }
type MapSidebarProps = { isOpen: boolean; onToggle: () => void }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MapSidebar({ isOpen, onToggle }: MapSidebarProps) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const [hoverInfo, setHoverInfo]   = useState<HoverInfo | null>(null)

  // --- drag-to-resize -------------------------------------------------------
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartW = useRef(0)

  function handleDragStart(e: React.MouseEvent) {
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartW.current = panelWidth
    e.preventDefault()
    document.body.style.userSelect = 'none'
    document.body.style.cursor     = 'col-resize'
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDragging.current) return
      const delta = ((dragStartX.current - e.clientX) / window.innerWidth) * 100
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStartW.current + delta)))
    }
    function onUp() {
      if (!isDragging.current) return
      isDragging.current             = false
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

  // --- Hover tooltip --------------------------------------------------------
  function handleMouseMove(e: {
    point:     { x: number; y: number }
    features?: { properties?: Record<string, unknown> }[]
  }) {
    const feat = e.features?.[0]
    if (feat) {
      setHoverInfo({
        x:      e.point.x,
        y:      e.point.y,
        name:   feat.properties?.name          as string | undefined,
        height: feat.properties?.render_height as number | undefined,
      })
    } else {
      setHoverInfo(null)
    }
  }

  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Toggle tab */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? 'Karte schließen' : 'Karte öffnen'}
        className={cn(
          'fixed right-0 top-1/2 z-50 flex h-16 w-7 -translate-y-1/2 flex-col items-center justify-center',
          'rounded-l-md border border-r-0 border-stone-200 bg-white shadow-md',
          'text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900',
        )}
      >
        {isOpen
          ? <ChevronRightIcon className="h-4 w-4" />
          : <ChevronLeftIcon  className="h-4 w-4" />}
      </button>

      {/*
        PANEL — position:relative + explicit height:100% so the absolutely-
        positioned inner container can resolve its own height reliably.
      */}
      <div
        className="flex-shrink-0 overflow-hidden border-l border-stone-200 transition-[width] duration-300 ease-in-out"
        style={{
          position: 'relative',
          width:    isOpen ? `${panelWidth}%` : 0,
          height:   '100%',
        }}
      >
        {/*
          INNER CONTAINER — absolute + top/bottom:0 guarantees full height.
          Width is intentionally oversized (80vw) so the canvas has real pixels
          even while the panel animates; overflow:hidden on the parent clips it.
        */}
        <div
          style={{
            position: 'absolute',
            top:      0,
            bottom:   0,
            left:     0,
            width:    '80vw',
            minWidth: '320px',
          }}
        >
          {/* Drag handle */}
          <div
            className="absolute left-0 top-0 z-20 h-full w-1.5 cursor-col-resize bg-transparent transition-colors hover:bg-[#E30613]/25 active:bg-[#E30613]/40"
            onMouseDown={handleDragStart}
          />

          <Map
            initialViewState={INITIAL_VIEW_STATE}
            mapStyle={MAP_STYLE}
            style={{ width: '100%', height: '100%' }}
            interactiveLayerIds={
              MAPTILER_KEY ? ['buildings-3d'] : []
            }
            onMouseMove={handleMouseMove as never}
            onMouseLeave={() => setHoverInfo(null)}
          >
            {MAPTILER_KEY && (
              <Layer {...(BUILDINGS_LAYER as never)} />
            )}

            {/* Exact building footprint — always shown, independent of tile source */}
            <Source id="target-building" type="geojson" data={TARGET_BUILDING_GEOJSON}>
              <Layer {...(HIGHLIGHT_LAYER as never)} />
            </Source>
          </Map>

          {/* Hover tooltip */}
          {hoverInfo && (
            <div
              style={{
                position:      'absolute',
                left:          hoverInfo.x + 14,
                top:           Math.max(8, hoverInfo.y - 52),
                pointerEvents: 'none',
                zIndex:        100,
              }}
              className="rounded-md bg-stone-950/85 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-sm"
            >
              {hoverInfo.name && (
                <p className="font-semibold text-white">{hoverInfo.name}</p>
              )}
              {hoverInfo.height != null && (
                <p className="text-stone-300">
                  {Math.round(Number(hoverInfo.height))} m Höhe
                </p>
              )}
              {!hoverInfo.name && hoverInfo.height == null && (
                <p className="text-stone-300">Gebäude</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
