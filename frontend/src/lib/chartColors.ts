// Chart & SVG color palette.
// Recharts and inline SVG don't accept Tailwind classes for stroke/fill, so we
// expose the design tokens here as hex literals. Keep values aligned with
// tailwind.config.cjs (brand tokens) and the Tailwind `stone` palette.

export const CHART = {
  // Axis + grid
  axisText: '#57534e',   // stone-600
  axisLine: '#d6d3d1',   // stone-300
  grid:     '#e7e5e4',   // stone-200
  border:   '#e7e5e4',   // stone-200
  cursor:   '#f5f5f4',   // stone-100

  // Data series
  primary:   '#111111',  // near-black for main series / strokes
  secondary: '#d6d3d1',  // stone-300 for the "average" comparison bar
  muted:     '#78716c',  // stone-500
} as const

export const BRAND = {
  // Matches tailwind.config.cjs `brand` tokens
  DEFAULT: '#E30613',
  hover:   '#c00510',
  dark:    '#E2001A',
} as const

// Discrete palette for the per-unit pie chart. 16 stone/neutral tones + brand.
export const PIE_PALETTE = [
  '#1c1917', BRAND.DEFAULT, '#57534e', '#a8a29e',
  '#292524', '#78716c',     '#c8c4c3', '#44403c',
  '#3d3533', '#9d9a99',     '#6d6360', '#0c0a09',
  '#bcb8b7', '#8a8078',     '#d6d3d1', '#e7e5e4',
] as const

// Tooltip styling shared across Recharts tooltips.
export const TOOLTIP_CONTENT_STYLE = {
  fontSize:     11,
  borderRadius: 6,
  border:       `1px solid ${CHART.border}`,
  boxShadow:    '0 1px 4px rgba(0,0,0,.06)',
} as const

// Subtle step shading used by IsometricBuilding — derived from BRAND.dark when
// selected, or stone-neutral when inactive/hovered.
export const ISO_BUILDING = {
  selected: {
    top:   BRAND.dark,   // '#E2001A'
    front: '#B80016',
    step:  '#A50013',
    side:  '#900010',
    deep:  '#7A000D',
    stroke:'#6A000B',
  },
  hovered: {
    top:   '#C8C8C8',
    front: '#B8B8B8',
    step:  '#ABABAB',
    side:  '#A0A0A0',
    deep:  '#929292',
    stroke:'#BBBBBB',
  },
  idle: {
    top:   '#EAEAEA',
    front: '#D2D2D2',
    step:  '#C8C8C8',
    side:  '#BCBCBC',
    deep:  '#ADADAD',
    stroke:'#BBBBBB',
  },
} as const

// Shading stops for the 3D buildings layer in MapLibre.
export const MAP_BUILDING_STOPS = [
  [0,  '#d4d0cb'],
  [20, '#dedad5'],
  [60, '#e8e5e0'],
] as const

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Darken a hex color by a factor (0..1). 0.25 → 25% darker.
export function darkenHex(hex: string, factor: number): string {
  const h = hex.replace('#', '')
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - factor))
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - factor))
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - factor))
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Build an iso-building face palette from a heat color (same shape as ISO_BUILDING.selected).
export function isoPaletteFromHeat(heat: string) {
  return {
    top:    heat,
    front:  darkenHex(heat, 0.12),
    step:   darkenHex(heat, 0.20),
    side:   darkenHex(heat, 0.28),
    deep:   darkenHex(heat, 0.36),
    stroke: darkenHex(heat, 0.45),
  }
}

// Analytics heatmap: color encodes "value vs average".
// ratio = value / average. < 1 → better (green shades, darker = further below).
// > 1 → worse (amber/red shades, darker = further above). ~1 → neutral stone.
export function heatColor(ratio: number): string {
  if (!isFinite(ratio) || ratio <= 0) return '#57534e'
  const d = ratio - 1
  if (d < -0.25) return '#047857' // emerald-700  (much better)
  if (d < -0.15) return '#059669' // emerald-600
  if (d < -0.07) return '#10b981' // emerald-500
  if (d < -0.03) return '#34d399' // emerald-400
  if (d <  0.03) return '#78716c' // stone-500    (near average)
  if (d <  0.07) return '#f59e0b' // amber-500
  if (d <  0.15) return '#d97706' // amber-600
  if (d <  0.25) return '#b45309' // amber-700
  return '#9a3412'                // orange-800    (much worse)
}

// FloorPlanView SVG fills.
export const FLOORPLAN = {
  fillSelected: 'rgba(227,6,19,0.10)',
  fillHover:    '#f5f5f4',  // stone-100
  fillIdle:     '#fafaf9',  // stone-50
  strokeIdle:   CHART.axisLine,
  labelIdle:    '#a8a29e',  // stone-400
  labelSelected: BRAND.DEFAULT,
} as const
