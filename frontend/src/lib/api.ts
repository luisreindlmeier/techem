import type { ForecastResponse, OverviewResponse, PropertyItem } from './types'
import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

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

export async function getProperties(): Promise<PropertyItem[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('id,city,zipcode,energysource')
    .order('id')

  if (error) throw new Error(error.message)
  return (data ?? []) as PropertyItem[]
}
