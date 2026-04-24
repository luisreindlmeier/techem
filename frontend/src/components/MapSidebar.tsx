import { useRef, useEffect, useState } from 'react'
import { Map, Layer } from 'react-map-gl/maplibre'
import type { Map as MaplibreGL } from 'maplibre-gl'
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

const INITIAL_VIEW_STATE = {
  longitude: 13.405,
  latitude:  52.52,
  zoom:      13.5,
  pitch:     60,
  bearing:   -20,
}

// The coordinate we want to highlight — Rotes Rathaus, Berlin
const HIGHLIGHT_TARGET: [number, number] = [13.4091, 52.5188]

// ---------------------------------------------------------------------------
// Buildings layer — color/opacity driven by MapLibre feature-state
// ---------------------------------------------------------------------------

const BUILDINGS_3D_LAYER = {
  id:   'buildings-3d',
  type: 'fill-extrusion' as const,
  source: 'maptiler_planet',
  'source-layer': 'building',
  minzoom: 12,
  paint: {
    'fill-extrusion-color': [
      'case',
      ['boolean', ['feature-state', 'highlighted'], false],
      '#E30613',
      [
        'interpolate', ['linear'],
        ['coalesce', ['get', 'render_height'], 0],
        0,  '#d4d0cb',
        20, '#dedad5',
        60, '#e8e5e0',
      ],
    ],
    'fill-extrusion-height': [
      'interpolate', ['linear'], ['zoom'],
      12, 0,
      13, ['coalesce', ['get', 'render_height'], 4],
    ],
    'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
    'fill-extrusion-opacity': [
      'case',
      ['boolean', ['feature-state', 'highlighted'], false],
      1.0,
      0.88,
    ],
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
// Highlight the first real tile building near HIGHLIGHT_TARGET
// ---------------------------------------------------------------------------

function highlightNearestBuilding(map: MaplibreGL) {
  const center = map.project(HIGHLIGHT_TARGET)
  const offsets: [number, number][] = [
    [0, 0],   [12, 0],  [-12, 0], [0, 12],  [0, -12],
    [20, 0],  [-20, 0], [0, 20],  [0, -20],
    [14, 14], [-14, 14],[14, -14],[-14, -14],
    [28, 0],  [-28, 0], [0, 28],  [0, -28],
    [35, 0],  [-35, 0], [0, 35],
  ]
  for (const [dx, dy] of offsets) {
    const feats = map.queryRenderedFeatures(
      [center.x + dx, center.y + dy],
      { layers: ['buildings-3d'] },
    )
    const bld = feats[0]
    if (bld?.id != null) {
      map.setFeatureState(
        { source: 'maptiler_planet', sourceLayer: 'building', id: bld.id },
        { highlighted: true },
      )
      return
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MapSidebar({ isOpen, onToggle }: MapSidebarProps) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const [hoverInfo, setHoverInfo]   = useState<HoverInfo | null>(null)
  const mapRef      = useRef<MaplibreGL | null>(null)
  const highlighted = useRef(false)

  // Retry highlight when panel first opens (canvas may be 0px during initial load)
  useEffect(() => {
    if (!isOpen || highlighted.current || !mapRef.current) return
    const map = mapRef.current
    const tryHighlight = () => {
      highlightNearestBuilding(map)
      highlighted.current = true
    }
    if (map.isStyleLoaded()) {
      map.once('idle', tryHighlight)
    }
  }, [isOpen])

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

  // --- Map load -------------------------------------------------------------
  function handleMapLoad(e: { target: MaplibreGL }) {
    mapRef.current = e.target
    e.target.once('idle', () => {
      highlightNearestBuilding(e.target)
      highlighted.current = true
    })
  }

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
      {/* Toggle tab — always fixed to the right edge of the viewport */}
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
        PANEL DIV
        ─────────
        • position: relative  → establishes a stacking/positioning context for
          the absolutely-positioned inner container
        • height: 100%        → explicit height so children can resolve their own
          heights. Without this, flex-stretch height is implicit and browsers may
          refuse to resolve percentage heights on descendants.
        • overflow: hidden    → clips the oversized inner container (80vw) to the
          panel's actual width during transitions
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
          INNER CONTAINER
          ───────────────
          • position: absolute; top:0; bottom:0  → fills parent height exactly,
            independent of any percentage-chain issues
          • width: 80vw   → intentionally wider than the panel so the MapLibre
            WebGL canvas has real pixel dimensions even while the panel is
            animating from 0 to its open width (overflow:hidden clips the rest)
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
          {/* Drag handle — left edge turns red on hover/active */}
          <div
            className="absolute left-0 top-0 z-20 h-full w-1.5 cursor-col-resize bg-transparent transition-colors hover:bg-[#E30613]/25 active:bg-[#E30613]/40"
            onMouseDown={handleDragStart}
          />

          {/* MapLibre map — width/height fill the inner container */}
          <Map
            initialViewState={INITIAL_VIEW_STATE}
            mapStyle={MAP_STYLE}
            style={{ width: '100%', height: '100%' }}
            interactiveLayerIds={MAPTILER_KEY ? ['buildings-3d'] : []}
            onLoad={handleMapLoad as never}
            onMouseMove={handleMouseMove as never}
            onMouseLeave={() => setHoverInfo(null)}
          >
            {MAPTILER_KEY && <Layer {...(BUILDINGS_3D_LAYER as never)} />}
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
                <p className="text-stone-300">{Math.round(Number(hoverInfo.height))} m Höhe</p>
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
