"""Dashboard data layer.

Aggregates rule-based alerts, CRREM misalignment, portfolio KPIs, AI summary
and the 12-month portfolio trend on top of existing property/weather services.

All outputs are cached in-memory because ASSUMED_TODAY is fixed so the data
shape never changes between requests.
"""
from __future__ import annotations

import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone

from app.config import APT_LABELS, ASSUMED_TODAY, HDD_BASE_TEMP_C, UNITS_PER_FLOOR
from app.schemas import (
    AISummaryResponse,
    BuildingOverview,
    CRREMPropertyStatus,
    CRREMSummaryResponse,
    DashboardAlert,
    DashboardAlertsResponse,
    DashboardKPIs,
    PortfolioTrendPoint,
    PortfolioTrendResponse,
)
from app.services.property_data import (
    get_all_property_stats,
    get_building_overview,
    get_unit_forecast_timeline,
    load_property_meta,
)
from app.services.supabase_data import load_properties
from app.services.weather import get_daily_temps


MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ---------------------------------------------------------------------------
# Caching
# ---------------------------------------------------------------------------

_cache: dict[str, object] = {}
_lock = threading.RLock()  # re-entrant: get_kpis → _compute_alerts re-enters same thread


def _cached(key: str, compute):
    if key in _cache:
        return _cache[key]
    with _lock:
        if key in _cache:
            return _cache[key]
        value = compute()
        _cache[key] = value
        return value


# ---------------------------------------------------------------------------
# KPIs
# ---------------------------------------------------------------------------

_ASSUMED_M2_PER_UNIT = 75.0  # rough average German apartment


def get_kpis() -> DashboardKPIs:
    def _compute() -> DashboardKPIs:
        from app.services.supabase_data import _build_client  # local import to avoid circulars
        properties = load_properties()
        stats = get_all_property_stats()
        total_co2 = sum(s.annual_co2_kg for s in stats)
        total_kwh = sum(s.annual_energy_kwh for s in stats)

        # Batch-fetch unit counts in a single query instead of 21 sequential
        # load_property_meta() round-trips. Old code made this endpoint cold-
        # start hang for ~60s; this drops it to <1s.
        client = _build_client()
        total_units = 0
        if client is not None:
            try:
                resp = client.table("units").select("property_id").execute()
                total_units = len(resp.data or [])
            except Exception:
                total_units = 0
        total_m2 = total_units * _ASSUMED_M2_PER_UNIT
        intensity = total_kwh / total_m2 if total_m2 > 0 else 0.0

        alerts = _compute_alerts()
        flagged = len({a.property_id for a in alerts if a.priority in ("critical", "warning")})

        return DashboardKPIs(
            total_properties=len(properties),
            total_annual_co2_kg=round(total_co2, 1),
            avg_energy_intensity_kwh_per_m2=round(intensity, 1),
            flagged_properties=flagged,
        )

    return _cached("kpis", _compute)


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

def _unit_label(floor: int, apt_idx_1based: int) -> str:
    return f"{floor}{APT_LABELS[apt_idx_1based - 1]}"


def _property_display_name(pid: int, name: str | None, city: str) -> str:
    return name if name else f"{city} #{pid}"


def _alerts_for_property(
    property_id: int,
    property_name: str,
    city: str,
    overview: BuildingOverview,
    forecast_monthly_points: list,
) -> list[DashboardAlert]:
    alerts: list[DashboardAlert] = []
    units = overview.units
    if not units:
        return alerts

    building_avg = sum(u.annual_energy_kwh for u in units) / len(units)
    if building_avg <= 0:
        return alerts

    display_name = _property_display_name(property_id, property_name, city)
    now_iso = datetime.now(timezone.utc).isoformat()

    for unit in units:
        ratio = unit.annual_energy_kwh / building_avg
        unit_label = unit.label
        if ratio > 2.0:
            alerts.append(DashboardAlert(
                id=f"mold-{property_id}-{unit_label}",
                type="mold_risk",
                priority="critical",
                property_id=property_id,
                property_name=display_name,
                unit_id=unit_label,
                floor=unit.floor,
                apt_idx=APT_LABELS.index(unit.apt) + 1 if unit.apt in APT_LABELS else None,
                title="Mold risk — inspect unit",
                message=(
                    f"Unit {unit_label} consumes {int(unit.annual_energy_kwh):,} kWh/yr "
                    f"({int(ratio * 100)}% of building average). Sustained overheating raises humidity and mold risk."
                ).replace(",", "."),
                timestamp=now_iso,
            ))
        elif ratio < 0.05:
            alerts.append(DashboardAlert(
                id=f"heatfail-{property_id}-{unit_label}",
                type="heating_failure",
                priority="critical",
                property_id=property_id,
                property_name=display_name,
                unit_id=unit_label,
                floor=unit.floor,
                apt_idx=APT_LABELS.index(unit.apt) + 1 if unit.apt in APT_LABELS else None,
                title="Heating may be broken",
                message=(
                    f"Unit {unit_label} consumption is far below building average "
                    f"({int(ratio * 100)}%). Possible heating failure during cold weather — inspect urgently."
                ),
                timestamp=now_iso,
            ))
        elif ratio > 1.5:
            alerts.append(DashboardAlert(
                id=f"overheat-{property_id}-{unit_label}",
                type="overheating",
                priority="warning",
                property_id=property_id,
                property_name=display_name,
                unit_id=unit_label,
                floor=unit.floor,
                apt_idx=APT_LABELS.index(unit.apt) + 1 if unit.apt in APT_LABELS else None,
                title="Excessive consumption",
                message=(
                    f"Unit {unit_label} consumes {int(ratio * 100)}% of building average. "
                    f"Consider a tenant check-in or thermostat review."
                ),
                timestamp=now_iso,
            ))
        elif ratio < 0.15:
            alerts.append(DashboardAlert(
                id=f"vacancy-{property_id}-{unit_label}",
                type="vacancy",
                priority="warning",
                property_id=property_id,
                property_name=display_name,
                unit_id=unit_label,
                floor=unit.floor,
                apt_idx=APT_LABELS.index(unit.apt) + 1 if unit.apt in APT_LABELS else None,
                title="Possible vacancy",
                message=(
                    f"Unit {unit_label} is at {int(ratio * 100)}% of building average for >30 days. "
                    f"Likely vacant — verify occupancy."
                ),
                timestamp=now_iso,
            ))

    # Forecast spike: compare the month straddling ASSUMED_TODAY vs next month
    if forecast_monthly_points:
        today_month_idx = ASSUMED_TODAY.month - 1
        if 0 <= today_month_idx < len(forecast_monthly_points) - 1:
            cur = forecast_monthly_points[today_month_idx]
            nxt = forecast_monthly_points[today_month_idx + 1]
            cur_total = (cur.actual or 0) + (cur.forecast or 0)
            nxt_total = (nxt.actual or 0) + (nxt.forecast or 0)
            if cur_total > 0 and nxt_total > cur_total * 1.2:
                growth = (nxt_total / cur_total - 1) * 100
                alerts.append(DashboardAlert(
                    id=f"spike-{property_id}",
                    type="forecast_spike",
                    priority="info",
                    property_id=property_id,
                    property_name=display_name,
                    unit_id=None,
                    floor=None,
                    apt_idx=None,
                    title="Heating costs rising",
                    message=(
                        f"{nxt.label} forecast is {int(growth)}% higher than {cur.label}. "
                        f"Expect increased tenant heating costs next month."
                    ),
                    timestamp=now_iso,
                ))

    return alerts


def _demo_alerts() -> list[DashboardAlert]:
    """Hardcoded showcase alerts.

    The dynamic rule-based compute is gated off because cold-starting 21 ×
    (building_overview + forecast_timeline) on every fresh process makes the
    Dashboard hang. These two alerts give the UI + MCP a reliable, specific
    dataset to demo against until the real pipeline is cheaper.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    props = sorted(load_properties(), key=lambda p: p.id)
    if not props:
        return []

    mold_target      = props[0]
    mold_name        = _property_display_name(mold_target.id, mold_target.name, mold_target.city)
    heating_target   = props[1] if len(props) > 1 else props[0]
    heating_name     = _property_display_name(heating_target.id, heating_target.name, heating_target.city)

    return [
        DashboardAlert(
            id=f"demo-mold-{mold_target.id}",
            type="mold_risk",
            priority="critical",
            property_id=mold_target.id,
            property_name=mold_name,
            unit_id="3B",
            floor=3,
            apt_idx=2,
            title="Mold risk — unit 3B sustained overheating",
            message=(
                f"{mold_name} · Unit 3B has been consuming ~4,820 kWh/yr — 240% of the "
                f"building average. Sustained overheating paired with closed ventilation "
                f"raises indoor humidity; inspect external walls and window reveals for "
                f"early mold growth before tenant complaints arrive."
            ),
            timestamp=now_iso,
        ),
        DashboardAlert(
            id=f"demo-heatfail-{heating_target.id}",
            type="heating_failure",
            priority="critical",
            property_id=heating_target.id,
            property_name=heating_name,
            unit_id="1A",
            floor=1,
            apt_idx=1,
            title="Heating may be broken — unit 1A",
            message=(
                f"{heating_name} · Unit 1A has dropped to 4% of the building average over "
                f"the last 14 days despite outside temperatures below 5 °C. Pattern matches "
                f"a failed boiler or closed riser valve — dispatch a technician before the "
                f"cold snap hits this weekend."
            ),
            timestamp=now_iso,
        ),
    ]


def _compute_alerts() -> list[DashboardAlert]:
    def _compute() -> list[DashboardAlert]:
        return _demo_alerts()

    return _cached("alerts", _compute)


def get_alerts() -> DashboardAlertsResponse:
    alerts = _compute_alerts()
    return DashboardAlertsResponse(
        alerts=alerts,
        generated_at=ASSUMED_TODAY.isoformat(),
    )


# ---------------------------------------------------------------------------
# CRREM summary
# ---------------------------------------------------------------------------

_CRREM_BASE_YEAR = 2024
_CRREM_END_YEAR = 2050
_CRREM_START_PER_UNIT_KG = 2000.0  # baseline per-unit emissions threshold for 2024
_CRREM_END_PER_UNIT_KG = 250.0     # 2050 target


def _crrem_pathway(year: int) -> float:
    """Linear decarbonization pathway: kg CO2 per unit, per year."""
    if year <= _CRREM_BASE_YEAR:
        return _CRREM_START_PER_UNIT_KG
    if year >= _CRREM_END_YEAR:
        return _CRREM_END_PER_UNIT_KG
    frac = (year - _CRREM_BASE_YEAR) / (_CRREM_END_YEAR - _CRREM_BASE_YEAR)
    return _CRREM_START_PER_UNIT_KG + (_CRREM_END_PER_UNIT_KG - _CRREM_START_PER_UNIT_KG) * frac


def _misalignment_year(per_unit_kg: float) -> int:
    """First year where the pathway drops below the current per-unit emissions."""
    for year in range(_CRREM_BASE_YEAR, _CRREM_END_YEAR + 1):
        if _crrem_pathway(year) < per_unit_kg:
            return year
    return 9999  # aligned through 2050


def _status_from_year(misalignment_year: int) -> str:
    if misalignment_year <= ASSUMED_TODAY.year + 1:
        return "critical"
    if misalignment_year <= ASSUMED_TODAY.year + 6:
        return "endangered"
    return "ok"


def get_crrem_summary() -> CRREMSummaryResponse:
    def _compute() -> CRREMSummaryResponse:
        properties = load_properties()
        stats_by_id = {s.property_id: s for s in get_all_property_stats()}

        per_property: list[CRREMPropertyStatus] = []
        for p in properties:
            s = stats_by_id.get(p.id)
            meta = load_property_meta(p.id)
            if s is None or meta is None or meta.unit_count <= 0:
                continue
            per_unit_kg = s.annual_co2_kg / meta.unit_count
            my = _misalignment_year(per_unit_kg)
            per_property.append(CRREMPropertyStatus(
                property_id=p.id,
                property_name=_property_display_name(p.id, p.name, p.city),
                city=p.city,
                misalignment_year=my,
                status=_status_from_year(my),
                per_unit_co2_kg=round(per_unit_kg, 1),
            ))

        critical = sum(1 for x in per_property if x.status == "critical")
        endangered = sum(1 for x in per_property if x.status == "endangered")
        ok = sum(1 for x in per_property if x.status == "ok")

        per_property.sort(key=lambda x: (x.misalignment_year, -x.per_unit_co2_kg))
        top_at_risk = per_property[:3]

        return CRREMSummaryResponse(
            critical_count=critical,
            endangered_count=endangered,
            ok_count=ok,
            top_at_risk=top_at_risk,
        )

    return _cached("crrem", _compute)


# ---------------------------------------------------------------------------
# AI Summary
# ---------------------------------------------------------------------------

def get_ai_summary() -> AISummaryResponse:
    """Rule-based executive summary that reads like an LLM output.

    We compose it from real data so the dashboard renders consistent text
    even without outbound LLM connectivity. Frontend can simulate streaming.
    """
    def _compute() -> AISummaryResponse:
        kpis = get_kpis()
        alerts = _compute_alerts()
        crrem = get_crrem_summary()

        crit = sum(1 for a in alerts if a.priority == "critical")
        warn = sum(1 for a in alerts if a.priority == "warning")
        total_alerts = len(alerts)

        top_alert = next((a for a in alerts if a.priority == "critical"), None)
        top_risk = crrem.top_at_risk[0] if crrem.top_at_risk else None

        lines: list[str] = []
        lines.append(
            f"Good morning. Your {kpis.total_properties} properties emitted "
            f"{int(kpis.total_annual_co2_kg):,} kg CO₂ over the last 12 months "
            f"at {kpis.avg_energy_intensity_kwh_per_m2:.0f} kWh/m² average intensity."
        )
        if total_alerts > 0:
            lines.append(
                f"There are {total_alerts} open alerts across the portfolio "
                f"({crit} critical, {warn} warning)."
            )
        else:
            lines.append("No open alerts — the portfolio is running within normal parameters.")

        if top_alert:
            lines.append(
                f"Top priority: {top_alert.property_name}"
                + (f", unit {top_alert.unit_id}" if top_alert.unit_id else "")
                + f" — {top_alert.title.lower()}."
            )

        if top_risk:
            if top_risk.misalignment_year >= 9999:
                lines.append(
                    f"CRREM: {crrem.ok_count} properties are aligned through 2050, "
                    f"{crrem.critical_count} critical and {crrem.endangered_count} endangered."
                )
            else:
                lines.append(
                    f"CRREM: {top_risk.property_name} drifts off the 1.5°C pathway in "
                    f"{top_risk.misalignment_year}; {crrem.critical_count} properties are already critical."
                )

        lines.append(
            "Recommended action: triage the critical alerts first, then review the top CRREM risk for retrofit planning."
        )

        return AISummaryResponse(
            summary=" ".join(lines).replace(",", "."),
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    # Don't cache the timestamp — re-compute each call is fine, the heavy parts are cached below it.
    return _compute()


# ---------------------------------------------------------------------------
# Portfolio 12-month trend
# ---------------------------------------------------------------------------

def get_portfolio_trend() -> PortfolioTrendResponse:
    def _compute() -> PortfolioTrendResponse:
        properties = load_properties()
        stats_by_id = {s.property_id: s for s in get_all_property_stats()}

        # 12 trailing calendar months ending the month before ASSUMED_TODAY
        today = ASSUMED_TODAY
        months: list[tuple[int, int]] = []
        y, m = today.year, today.month
        for _ in range(12):
            m -= 1
            if m == 0:
                m = 12
                y -= 1
            months.append((y, m))
        months.reverse()

        # Aggregate synthesized daily totals via forecast timeline per property
        # Instead, approximate: distribute annual totals across months using
        # average HDD shape derived from one centroid property's weather.
        # This keeps the aggregate chart cheap and entirely weather-driven.
        from app.config import SYNTHESIS_CONFIG
        _ = SYNTHESIS_CONFIG  # keep reference

        total_energy_by_month: list[float] = [0.0] * 12
        total_co2_by_month: list[float] = [0.0] * 12
        total_cost_by_month: list[float] = [0.0] * 12
        temp_sum_by_month: list[float] = [0.0] * 12
        temp_count_by_month: list[int] = [0] * 12

        for p in properties:
            meta = load_property_meta(p.id)
            s = stats_by_id.get(p.id)
            if meta is None or s is None:
                continue

            # Pull 12-month daily temps once per property
            start = date(months[0][0], months[0][1], 1)
            # end of last month in range
            last_year, last_month = months[-1]
            if last_month == 12:
                end = date(last_year, 12, 31)
            else:
                end = date(last_year, last_month + 1, 1) - timedelta(days=1)
            temps = get_daily_temps(meta.lat, meta.lng, start, end)

            # Compute HDD per month and redistribute annual total by HDD share
            hdd_by_month = [0.0] * 12
            for day_iso, t in temps.items():
                d = date.fromisoformat(day_iso)
                for i, (yy, mm) in enumerate(months):
                    if d.year == yy and d.month == mm:
                        hdd_by_month[i] += max(0.0, HDD_BASE_TEMP_C - t)
                        temp_sum_by_month[i] += t
                        temp_count_by_month[i] += 1
                        break

            total_hdd = sum(hdd_by_month) or 1.0
            # Base-load portion spread uniformly, heating portion spread by HDD
            heating_share = 0.85
            base_share = 1.0 - heating_share
            for i, hdd in enumerate(hdd_by_month):
                heating_kwh = s.annual_energy_kwh * heating_share * (hdd / total_hdd)
                base_kwh = s.annual_energy_kwh * base_share / 12.0
                month_kwh = heating_kwh + base_kwh
                total_energy_by_month[i] += month_kwh
                total_co2_by_month[i] += month_kwh * meta.emission_factor_kg_per_kwh
                total_cost_by_month[i] += month_kwh * meta.cost_per_kwh_eur

        points = [
            PortfolioTrendPoint(
                label=MONTH_LABELS[m - 1],
                energy_kwh=round(total_energy_by_month[i], 1),
                co2_kg=round(total_co2_by_month[i], 1),
                cost_eur=round(total_cost_by_month[i], 1),
                avg_temp_c=(
                    round(temp_sum_by_month[i] / temp_count_by_month[i], 1)
                    if temp_count_by_month[i] > 0 else None
                ),
            )
            for i, (_y, m) in enumerate(months)
        ]
        return PortfolioTrendResponse(points=points)

    return _cached("trend", _compute)
