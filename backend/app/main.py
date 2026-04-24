from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import (
    AISummaryResponse,
    BuildingOverview,
    CRREMSummaryResponse,
    DashboardAlertsResponse,
    DashboardKPIs,
    ForecastResponse,
    ForecastTimelineResponse,
    HealthResponse,
    OverviewResponse,
    PortfolioTrendResponse,
    PropertyItem,
    PropertyStats,
    UnitForecastResponse,
    UnitHistoryResponse,
)
from app.mcp.schemas import McpChatRequest, McpChatResponse
from app.mcp.service import run_chat as run_mcp_chat
from app.services.dashboard import (
    get_ai_summary,
    get_alerts,
    get_crrem_summary,
    get_kpis,
    get_portfolio_trend,
)
from app.services.forecast import forecast_from_history
from app.services.property_data import (
    get_all_property_stats,
    get_building_overview,
    get_property_stats,
    get_unit_forecast,
    get_unit_forecast_timeline,
    get_unit_history,
)
from app.services.supabase_data import load_metric_points, load_properties

app = FastAPI(title="Techem Energy API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
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


# ---------------------------------------------------------------------------
# Building data (property card KPIs + BuildingDetailPage)
# ---------------------------------------------------------------------------

@app.get("/api/v1/properties/stats", response_model=list[PropertyStats])
def all_property_stats() -> list[PropertyStats]:
    """Annual KPIs for every property (used by PropertyCard + ComparisonSheet)."""
    return get_all_property_stats()


@app.get("/api/v1/properties/{property_id}/stats", response_model=PropertyStats)
def property_stats(property_id: int) -> PropertyStats:
    stats = get_property_stats(property_id)
    if stats is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return stats


@app.get("/api/v1/properties/{property_id}/overview", response_model=BuildingOverview)
def property_overview(property_id: int) -> BuildingOverview:
    """All units with annual energy + rooms (pie chart, top/bottom tables)."""
    overview = get_building_overview(property_id)
    if overview is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return overview


@app.get(
    "/api/v1/properties/{property_id}/units/{floor}/{apt_idx}/history",
    response_model=UnitHistoryResponse,
)
def unit_history(property_id: int, floor: int, apt_idx: int) -> UnitHistoryResponse:
    if apt_idx < 1 or apt_idx > 4:
        raise HTTPException(status_code=400, detail="apt_idx must be 1..4")
    history = get_unit_history(property_id, floor, apt_idx)
    if history is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return history


@app.get(
    "/api/v1/properties/{property_id}/units/{floor}/{apt_idx}/forecast",
    response_model=UnitForecastResponse,
)
def unit_forecast(property_id: int, floor: int, apt_idx: int) -> UnitForecastResponse:
    if apt_idx < 1 or apt_idx > 4:
        raise HTTPException(status_code=400, detail="apt_idx must be 1..4")
    fc = get_unit_forecast(property_id, floor, apt_idx)
    if fc is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return fc


# ---------------------------------------------------------------------------
# Techem MCP (natural-language portfolio access)
# ---------------------------------------------------------------------------

@app.post("/api/v1/mcp/chat", response_model=McpChatResponse)
def mcp_chat(payload: McpChatRequest) -> McpChatResponse:
    prompt = (payload.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt must not be empty")
    return run_mcp_chat(prompt)


@app.get(
    "/api/v1/properties/{property_id}/units/{floor}/{apt_idx}/forecast-timeline",
    response_model=ForecastTimelineResponse,
)
def unit_forecast_timeline(
    property_id: int,
    floor: int,
    apt_idx: int,
    granularity: str = Query(default="monthly", pattern="^(monthly|weekly|daily)$"),
) -> ForecastTimelineResponse:
    if apt_idx < 1 or apt_idx > 4:
        raise HTTPException(status_code=400, detail="apt_idx must be 1..4")
    timeline = get_unit_forecast_timeline(property_id, floor, apt_idx, granularity)
    if timeline is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return timeline


# ---------------------------------------------------------------------------
# Dashboard (KPIs, alerts feed, CRREM snapshot, AI summary, portfolio trend)
# ---------------------------------------------------------------------------

@app.get("/api/v1/dashboard/kpis", response_model=DashboardKPIs)
def dashboard_kpis() -> DashboardKPIs:
    return get_kpis()


@app.get("/api/v1/dashboard/alerts", response_model=DashboardAlertsResponse)
def dashboard_alerts() -> DashboardAlertsResponse:
    return get_alerts()


@app.get("/api/v1/crrem/summary", response_model=CRREMSummaryResponse)
def crrem_summary() -> CRREMSummaryResponse:
    return get_crrem_summary()


@app.get("/api/v1/dashboard/ai-summary", response_model=AISummaryResponse)
def dashboard_ai_summary() -> AISummaryResponse:
    return get_ai_summary()


@app.get("/api/v1/dashboard/portfolio-trend", response_model=PortfolioTrendResponse)
def dashboard_portfolio_trend() -> PortfolioTrendResponse:
    return get_portfolio_trend()
