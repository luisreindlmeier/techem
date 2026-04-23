from datetime import date

from app.config import settings
from app.schemas import MetricPoint
from app.services.mock_data import generate_mock_points


try:
    from supabase import Client, create_client
except ImportError:
    Client = None  # type: ignore[assignment]
    create_client = None  # type: ignore[assignment]


def _build_client() -> Client | None:
    if not settings.supabase_url or not settings.supabase_key or create_client is None:
        return None
    return create_client(settings.supabase_url, settings.supabase_key)


def _safe_float(value: object) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0


def _safe_date(value: object) -> date | None:
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def load_metric_points(default_days: int = 60) -> list[MetricPoint]:
    client = _build_client()
    if client is None:
        return generate_mock_points(default_days)

    try:
        response = (
            client.table(settings.supabase_table)
            .select(
                f"{settings.supabase_time_column},{settings.supabase_energy_column},{settings.supabase_emission_column}"
            )
            .order(settings.supabase_time_column)
            .execute()
        )
    except Exception:
        return generate_mock_points(default_days)

    rows = response.data or []
    points: list[MetricPoint] = []

    for row in rows:
        row_date = _safe_date(row.get(settings.supabase_time_column))
        if row_date is None:
            continue

        points.append(
            MetricPoint(
                date=row_date,
                energy_kwh=_safe_float(row.get(settings.supabase_energy_column)),
                emission_kg_co2e=_safe_float(row.get(settings.supabase_emission_column)),
            )
        )

    return points or generate_mock_points(default_days)
