import type { ForecastResponse, OverviewResponse, PropertyItem } from './types'
import { supabase } from './supabase'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function getOverview(): Promise<OverviewResponse> {
  return fetchJson<OverviewResponse>('/api/v1/metrics/overview')
}

export function getForecast(days = 30): Promise<ForecastResponse> {
  return fetchJson<ForecastResponse>(`/api/v1/forecast?horizon_days=${days}`)
}

function mapPropertyRow(row: Record<string, unknown>, hasGeometry: boolean): PropertyItem {
  return {
    id:                row.id as number,
    name:              hasGeometry ? ((row.name as string | null) ?? null) : null,
    street:            hasGeometry ? ((row.street as string | null) ?? null) : null,
    city:              row.city as string,
    zipcode:           row.zipcode as string,
    energysource:      row.energysource as string,
    unit_count:        (row.units as { count: number }[])[0]?.count ?? 0,
    lat:               hasGeometry ? ((row.lat as number | null) ?? null) : null,
    lng:               hasGeometry ? ((row.lng as number | null) ?? null) : null,
    footprint_polygon: hasGeometry ? ((row.footprint_polygon as number[][][] | null) ?? null) : null,
    building_height:   hasGeometry ? ((row.building_height as number | null) ?? 12) : 12,
  }
}

export async function getProperties(): Promise<PropertyItem[]> {
  if (!supabase) return []

  // Try full query including geometry columns (requires migration 001 to be applied).
  const { data, error } = await supabase
    .from('properties')
    .select('id,name,street,city,zipcode,energysource,lat,lng,footprint_polygon,building_height,units(count)')
    .order('id')

  if (!error) {
    return (data ?? []).map((row) => mapPropertyRow(row as Record<string, unknown>, true))
  }

  // Migration not yet applied — fall back to baseline columns so properties still load.
  const { data: basicData, error: basicError } = await supabase
    .from('properties')
    .select('id,city,zipcode,energysource,units(count)')
    .order('id')

  if (basicError) throw new Error(basicError.message)

  return (basicData ?? []).map((row) => mapPropertyRow(row as Record<string, unknown>, false))
}
