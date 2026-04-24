// Building layout template used by FloorPlanView, IsometricBuilding and the
// unit/floor selectors in BuildingDetailPage. Intentionally fixed at 4 units
// per floor per product spec — the SVG geometry in FloorPlanView depends on it.
// Keep these values in sync with backend/app/config.py (UNITS_PER_FLOOR) and
// backend/app/services/property_data.py (APT_LABELS).

export const UNITS_PER_FLOOR = 4
export const APT_LABELS = ['A', 'B', 'C', 'D'] as const
export type AptLabel = typeof APT_LABELS[number]
