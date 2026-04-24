from datetime import date

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str


class PropertyItem(BaseModel):
    id: int
    name: str | None = None
    street: str | None = None
    city: str
    zipcode: str
    energysource: str
    lat: float | None = None
    lng: float | None = None
    footprint_polygon: list[list[list[float]]] | None = None
    building_height: int = 12


class MetricPoint(BaseModel):
    date: date
    energy_kwh: float
    emission_kg_co2e: float


class OverviewResponse(BaseModel):
    total_energy_kwh: float
    total_emission_kg_co2e: float
    average_daily_energy_kwh: float
    average_daily_emission_kg_co2e: float
    records: list[MetricPoint]


class ForecastPoint(BaseModel):
    date: str  # month label ("Jan", ...) OR ISO date
    predicted_energy_kwh: float
    predicted_emission_kg_co2e: float


class ForecastResponse(BaseModel):
    model: str
    horizon_days: int
    points: list[ForecastPoint]


# ---------------------------------------------------------------------------
# Building-data domain (used by PropertyCard, ComparisonSheet, BuildingDetailPage)
# ---------------------------------------------------------------------------

class PropertyStats(BaseModel):
    property_id: int
    annual_energy_kwh: float
    annual_cost_eur: float
    annual_co2_kg: float


class RoomPoint(BaseModel):
    name: str
    sqm: float
    annual_energy_kwh: float
    building_avg_kwh: float = 0.0


class UnitSummary(BaseModel):
    label: str
    floor: int
    apt: str
    annual_energy_kwh: float
    rooms: list[RoomPoint]


class BuildingOverview(BaseModel):
    property_id: int
    units: list[UnitSummary]


class MonthlyPoint(BaseModel):
    month: str
    energy_kwh: float
    cost_eur: float
    co2_kg: float


class GranularPoint(BaseModel):
    label: str
    apartment: float
    average: float


class UnitHistoryResponse(BaseModel):
    property_id: int
    floor: int
    apt: str
    cost_per_kwh_eur: float
    emission_factor_kg_per_kwh: float
    monthly_apartment: list[MonthlyPoint]
    monthly_average: list[MonthlyPoint]
    weekly: list[GranularPoint]
    daily: list[GranularPoint]


class UnitForecastResponse(BaseModel):
    property_id: int
    floor: int
    apt: str
    model: str
    horizon_days: int
    points: list[ForecastPoint]


class ForecastTimelinePoint(BaseModel):
    label: str
    actual: float | None = None
    forecast: float | None = None
    average: float | None = None
    temperature: float | None = None


class ForecastTimelineResponse(BaseModel):
    property_id: int
    floor: int
    apt: str
    granularity: str
    model: str
    points: list[ForecastTimelinePoint]
    cutoff_label: str


# ---------------------------------------------------------------------------
# Dashboard domain (alerts feed, CRREM snapshot, AI summary, portfolio trend)
# ---------------------------------------------------------------------------

class DashboardAlert(BaseModel):
    id: str
    type: str            # machine-readable: "mold_risk", "overheating", "vacancy", "heating_failure", "forecast_spike"
    priority: str        # "critical" | "warning" | "info"
    property_id: int
    property_name: str
    unit_id: str | None  # e.g. "3B", or None for property-scoped alerts
    floor: int | None
    apt_idx: int | None  # 1-based within floor, when applicable
    title: str
    message: str
    timestamp: str       # ISO string


class DashboardAlertsResponse(BaseModel):
    alerts: list[DashboardAlert]
    generated_at: str


class DashboardKPIs(BaseModel):
    total_properties: int
    total_annual_co2_kg: float
    avg_energy_intensity_kwh_per_m2: float
    flagged_properties: int


class CRREMPropertyStatus(BaseModel):
    property_id: int
    property_name: str
    city: str
    misalignment_year: int     # 9999 means aligned through 2050
    status: str                # "critical" | "endangered" | "ok"
    per_unit_co2_kg: float


class CRREMSummaryResponse(BaseModel):
    critical_count: int
    endangered_count: int
    ok_count: int
    top_at_risk: list[CRREMPropertyStatus]  # sorted by earliest misalignment_year


class AISummaryRequest(BaseModel):
    pass


class AISummaryResponse(BaseModel):
    summary: str
    generated_at: str


class PortfolioTrendPoint(BaseModel):
    label: str           # month label e.g. "Jan"
    energy_kwh: float
    co2_kg: float
    cost_eur: float
    avg_temp_c: float | None = None


class PortfolioTrendResponse(BaseModel):
    points: list[PortfolioTrendPoint]
