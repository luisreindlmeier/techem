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

// FloorPlanView SVG fills.
export const FLOORPLAN = {
  fillSelected: 'rgba(227,6,19,0.10)',
  fillHover:    '#f5f5f4',  // stone-100
  fillIdle:     '#fafaf9',  // stone-50
  strokeIdle:   CHART.axisLine,
  labelIdle:    '#a8a29e',  // stone-400
  labelSelected: BRAND.DEFAULT,
} as const
