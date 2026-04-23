from datetime import date

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str


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
    date: date
    predicted_energy_kwh: float
    predicted_emission_kg_co2e: float


class ForecastResponse(BaseModel):
    model: str
    horizon_days: int
    points: list[ForecastPoint]
