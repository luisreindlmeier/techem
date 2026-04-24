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

// ---------- Building-data domain (mirrors backend schemas) ----------

export type PropertyStats = {
  property_id: number
  annual_energy_kwh: number
  annual_cost_eur: number
  annual_co2_kg: number
}

export type RoomPoint = {
  name: string
  sqm: number
  annual_energy_kwh: number
  building_avg_kwh: number
}

export type UnitSummary = {
  label: string
  floor: number
  apt: string
  annual_energy_kwh: number
  rooms: RoomPoint[]
}

export type BuildingOverview = {
  property_id: number
  units: UnitSummary[]
}

export type MonthlyPoint = {
  month: string
  energy_kwh: number
  cost_eur: number
  co2_kg: number
}

export type GranularPoint = {
  label: string
  apartment: number
  average: number
}

export type UnitHistoryResponse = {
  property_id: number
  floor: number
  apt: string
  cost_per_kwh_eur: number
  emission_factor_kg_per_kwh: number
  monthly_apartment: MonthlyPoint[]
  monthly_average: MonthlyPoint[]
  weekly: GranularPoint[]
  daily: GranularPoint[]
}

export type UnitForecastResponse = {
  property_id: number
  floor: number
  apt: string
  model: string
  horizon_days: number
  points: ForecastPoint[]
}

export type ForecastGranularity = 'monthly' | 'weekly' | 'daily'

export type ForecastTimelinePoint = {
  label: string
  actual: number | null
  forecast: number | null
  average: number | null
  temperature: number | null
}

export type ForecastTimelineResponse = {
  property_id: number
  floor: number
  apt: string
  granularity: ForecastGranularity
  model: string
  points: ForecastTimelinePoint[]
  cutoff_label: string
}

// ---------- Dashboard domain ----------

export type AlertPriority = 'critical' | 'warning' | 'info'
export type AlertType =
  | 'mold_risk'
  | 'overheating'
  | 'vacancy'
  | 'heating_failure'
  | 'forecast_spike'

export type DashboardAlert = {
  id: string
  type: AlertType
  priority: AlertPriority
  property_id: number
  property_name: string
  unit_id: string | null
  floor: number | null
  apt_idx: number | null
  title: string
  message: string
  timestamp: string
}

export type DashboardAlertsResponse = {
  alerts: DashboardAlert[]
  generated_at: string
}

export type DashboardKPIs = {
  total_properties: number
  total_annual_co2_kg: number
  avg_energy_intensity_kwh_per_m2: number
  flagged_properties: number
}

export type CRREMStatus = 'critical' | 'endangered' | 'ok'

export type CRREMPropertyStatus = {
  property_id: number
  property_name: string
  city: string
  misalignment_year: number
  status: CRREMStatus
  per_unit_co2_kg: number
}

export type CRREMSummaryResponse = {
  critical_count: number
  endangered_count: number
  ok_count: number
  top_at_risk: CRREMPropertyStatus[]
}

export type AISummaryResponse = {
  summary: string
  generated_at: string
}

export type PortfolioTrendPoint = {
  label: string
  energy_kwh: number
  co2_kg: number
  cost_eur: number
  avg_temp_c: number | null
}

export type PortfolioTrendResponse = {
  points: PortfolioTrendPoint[]
}
