import type { ForecastResponse, OverviewResponse } from './types'

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
