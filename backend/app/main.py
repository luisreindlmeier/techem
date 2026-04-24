from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import ForecastResponse, HealthResponse, OverviewResponse, PropertyItem
from app.services.forecast import forecast_from_history
from app.services.supabase_data import load_metric_points, load_properties

app = FastAPI(title="Techem Energy API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/api/v1/properties", response_model=list[PropertyItem])
def properties() -> list[PropertyItem]:
    return load_properties()


@app.get("/api/v1/metrics/overview", response_model=OverviewResponse)
def metrics_overview() -> OverviewResponse:
    points = load_metric_points(default_days=60)

    total_energy = sum(point.energy_kwh for point in points)
    total_emission = sum(point.emission_kg_co2e for point in points)
    count = len(points) or 1

    return OverviewResponse(
        total_energy_kwh=round(total_energy, 2),
        total_emission_kg_co2e=round(total_emission, 2),
        average_daily_energy_kwh=round(total_energy / count, 2),
        average_daily_emission_kg_co2e=round(total_emission / count, 2),
        records=points,
    )


@app.get("/api/v1/forecast", response_model=ForecastResponse)
def forecast(horizon_days: int = Query(default=30, ge=7, le=365)) -> ForecastResponse:
    points = load_metric_points(default_days=90)
    forecast_points = forecast_from_history(points, horizon_days)

    return ForecastResponse(
        model="linear_regression_baseline",
        horizon_days=horizon_days,
        points=forecast_points,
    )
