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


class ForecastTimelineResponse(BaseModel):
    property_id: int
    floor: int
    apt: str
    granularity: str
    model: str
    points: list[ForecastTimelinePoint]
    cutoff_label: str
