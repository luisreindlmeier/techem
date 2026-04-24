export type PropertyItem = {
  id: number
  name: string | null
  street: string | null
  city: string
  zipcode: string
  energysource: string
  unit_count: number
  lat: number | null
  lng: number | null
  footprint_polygon: number[][][] | null
  building_height: number
}

export type MetricPoint = {
  date: string
  energy_kwh: number
  emission_kg_co2e: number
}

export type OverviewResponse = {
  total_energy_kwh: number
  total_emission_kg_co2e: number
  average_daily_energy_kwh: number
  average_daily_emission_kg_co2e: number
  records: MetricPoint[]
}

export type ForecastPoint = {
  date: string
  predicted_energy_kwh: number
  predicted_emission_kg_co2e: number
}

export type ForecastResponse = {
  model: string
  horizon_days: number
  points: ForecastPoint[]
}
