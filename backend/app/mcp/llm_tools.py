"""Data-returning tools for the LLM agent loop.

These wrap the existing services but return plain JSON-serializable dicts so
the LLM can read them. Kept separate from tools.py (which renders McpBlocks
for the deterministic keyword router) so each path is clean and focused.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from statistics import mean, pstdev

from app.config import APT_LABELS, ASSUMED_TODAY
from app.mcp.tools import (
    _unit_counts,
    tool_generate_report as _tool_generate_report,
)
from app.services.property_data import (
    get_all_property_stats,
    get_property_stats,
    get_unit_forecast,
    load_property_meta,
)
from app.services.supabase_data import load_properties


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def list_properties(
    city: str | None = None,
    energy_source: str | None = None,
    min_units: int | None = None,
    limit: int = 50,
) -> dict:
    """Return a filtered list of properties with unit counts and location."""
    props = load_properties()
    unit_counts = _unit_counts()

    filtered = []
    for p in props:
        uc = unit_counts.get(p.id, 0)
        if city and (p.city or "").lower() != city.lower():
            continue
        if energy_source and (p.energysource or "").lower() != energy_source.lower():
            continue
        if min_units is not None and uc < min_units:
            continue
        filtered.append({
            "id": p.id,
            "name": p.name,
            "street": p.street,
            "city": p.city,
            "zipcode": p.zipcode,
            "energy_source": p.energysource,
            "unit_count": uc,
        })

    return {
        "count": len(filtered),
        "properties": filtered[:limit],
        "truncated": len(filtered) > limit,
    }


def get_property_detail(property_id: int) -> dict:
    """Full detail for one property: metadata + annual stats."""
    meta = load_property_meta(property_id)
    if meta is None:
        return {"error": f"property {property_id} not found"}
    stats = get_property_stats(property_id)
    return {
        "id": meta.id,
        "name": meta.name,
        "city": meta.city,
        "zipcode": meta.zipcode,
        "energy_source": meta.energysource,
        "unit_count": meta.unit_count,
        "emission_factor_kg_per_kwh": round(meta.emission_factor_kg_per_kwh, 4),
        "cost_per_kwh_eur": round(meta.cost_per_kwh_eur, 4),
        "annual_energy_kwh": stats.annual_energy_kwh if stats else None,
        "annual_cost_eur": stats.annual_cost_eur if stats else None,
        "annual_co2_kg": stats.annual_co2_kg if stats else None,
        "kwh_per_unit_year": (
            round(stats.annual_energy_kwh / meta.unit_count, 1)
            if stats and meta.unit_count else None
        ),
    }


def portfolio_stats() -> dict:
    """Portfolio-wide aggregate: totals, averages, energy mix."""
    props = load_properties()
    stats = get_all_property_stats()
    unit_counts = _unit_counts()

    total_kwh = sum(s.annual_energy_kwh for s in stats)
    total_cost = sum(s.annual_cost_eur for s in stats)
    total_co2 = sum(s.annual_co2_kg for s in stats)
    total_units = sum(unit_counts.values())

    by_source_kwh: dict[str, float] = defaultdict(float)
    by_source_count: dict[str, int] = defaultdict(int)
    by_source_co2: dict[str, float] = defaultdict(float)
    by_id = {s.property_id: s for s in stats}
    for p in props:
        src = p.energysource or "Unknown"
        by_source_count[src] += 1
        s = by_id.get(p.id)
        if s is not None:
            by_source_kwh[src] += s.annual_energy_kwh
            by_source_co2[src] += s.annual_co2_kg

    mix = [
        {
            "energy_source": src,
            "property_count": by_source_count[src],
            "annual_kwh": round(kwh, 1),
            "annual_co2_kg": round(by_source_co2[src], 1),
            "share_pct": round(kwh / total_kwh * 100, 1) if total_kwh else 0.0,
        }
        for src, kwh in sorted(by_source_kwh.items(), key=lambda kv: kv[1], reverse=True)
    ]

    return {
        "property_count": len(props),
        "unit_count": total_units,
        "annual_energy_kwh": round(total_kwh, 1),
        "annual_cost_eur": round(total_cost, 1),
        "annual_co2_kg": round(total_co2, 1),
        "avg_kwh_per_unit": round(total_kwh / total_units, 1) if total_units else None,
        "energy_mix": mix,
    }


def rank_properties(
    by: str = "annual_energy_kwh",
    order: str = "desc",
    per_unit: bool = False,
    limit: int = 10,
) -> dict:
    """Rank properties by a metric. by ∈ {annual_energy_kwh, annual_cost_eur, annual_co2_kg}."""
    if by not in {"annual_energy_kwh", "annual_cost_eur", "annual_co2_kg"}:
        return {"error": f"invalid metric: {by}"}

    stats = get_all_property_stats()
    props = {p.id: p for p in load_properties()}
    unit_counts = _unit_counts()

    rows = []
    for s in stats:
        uc = unit_counts.get(s.property_id, 0)
        value = getattr(s, by)
        if per_unit:
            if uc <= 0:
                continue
            value = value / uc
        meta = props.get(s.property_id)
        rows.append({
            "id": s.property_id,
            "name": meta.name if meta else None,
            "city": meta.city if meta else None,
            "energy_source": meta.energysource if meta else None,
            "unit_count": uc,
            "metric": by + ("_per_unit" if per_unit else ""),
            "value": round(value, 1),
        })
    rows.sort(key=lambda r: r["value"], reverse=(order == "desc"))
    return {"results": rows[:limit]}


def anomaly_scan() -> dict:
    """Find properties with unusual annual kWh/unit (|z| > 1.0)."""
    props = load_properties()
    stats = {s.property_id: s for s in get_all_property_stats()}
    unit_counts = _unit_counts()

    per_unit = []
    for p in props:
        uc = unit_counts.get(p.id, 0)
        s = stats.get(p.id)
        if s is None or uc <= 0:
            continue
        per_unit.append((p.id, s.annual_energy_kwh / uc))

    if len(per_unit) < 3:
        return {"error": "not enough comparable properties"}

    values = [v for _, v in per_unit]
    mu = mean(values)
    sigma = pstdev(values) or 1.0

    results = []
    for pid, v in per_unit:
        z = (v - mu) / sigma
        if abs(z) < 1.0:
            continue
        p = next((x for x in props if x.id == pid), None)
        results.append({
            "id": pid,
            "name": p.name if p else None,
            "city": p.city if p else None,
            "kwh_per_unit_year": round(v, 1),
            "z_score": round(z, 2),
            "severity": "high" if z > 0 else "low",
        })
    results.sort(key=lambda r: abs(r["z_score"]), reverse=True)
    return {
        "baseline_kwh_per_unit": round(mu, 1),
        "sigma_kwh_per_unit": round(sigma, 1),
        "outliers": results,
    }


def get_forecast(property_id: int, months: int = 12) -> dict:
    """12-month forecast for a representative unit (floor 1, apt A). HDD × linear."""
    fc = get_unit_forecast(property_id, 1, 1)
    if fc is None:
        return {"error": f"property {property_id} has no forecast"}
    points = fc.points[: max(1, min(12, months))]
    return {
        "property_id": property_id,
        "unit_label": f"1{APT_LABELS[0]}",
        "model": fc.model,
        "points": [
            {
                "month": pt.date,
                "predicted_kwh": pt.predicted_energy_kwh,
                "predicted_co2_kg": pt.predicted_emission_kg_co2e,
            }
            for pt in points
        ],
    }


def generate_portfolio_report() -> dict:
    """Generate the full portfolio intelligence report for the sidebar panel.

    Returns a handle the caller should pass through to the final response; the
    LLM receives a short confirmation, not the full report body.
    """
    payload = _tool_generate_report()
    report = payload["report"]
    return {
        "_report": report,
        "title": payload["title"],
        "section_headings": [s.heading for s in report.sections] if report else [],
    }


def get_today() -> dict:
    """Return the demo 'today' date used by the forecasting pipeline."""
    return {
        "today": ASSUMED_TODAY.isoformat(),
        "note": "Demo calendar fixed to 2024-10-15 so forecast window always spans Nov–Dec.",
    }


# ---------------------------------------------------------------------------
# Tool registry (name → callable) + OpenAI function schemas
# ---------------------------------------------------------------------------

TOOL_FUNCTIONS = {
    "list_properties": list_properties,
    "get_property_detail": get_property_detail,
    "portfolio_stats": portfolio_stats,
    "rank_properties": rank_properties,
    "anomaly_scan": anomaly_scan,
    "get_forecast": get_forecast,
    "generate_portfolio_report": generate_portfolio_report,
    "get_today": get_today,
}

TOOL_SOURCE_LABELS = {
    "list_properties":           "Supabase · properties",
    "get_property_detail":       "Supabase · properties + readings",
    "portfolio_stats":           "Portfolio aggregate",
    "rank_properties":           "Portfolio aggregate",
    "anomaly_scan":              "Z-score · kWh/unit",
    "get_forecast":              "HDD × linear forecast",
    "generate_portfolio_report": "Portfolio intelligence report",
    "get_today":                 "Demo calendar",
}


OPENAI_TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "list_properties",
            "description": "List properties in the portfolio. Optionally filter by city, energy source, or minimum unit count.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city":          {"type": "string",  "description": "Exact city name (case-insensitive)."},
                    "energy_source": {"type": "string",  "description": "One of: Natural Gas, District Heating, Heat Pump, Heating Oil, Pellets."},
                    "min_units":     {"type": "integer", "description": "Minimum number of units."},
                    "limit":         {"type": "integer", "default": 50},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_property_detail",
            "description": "Get full detail for one property including annual energy, cost, CO2, and per-unit metrics.",
            "parameters": {
                "type": "object",
                "properties": {"property_id": {"type": "integer"}},
                "required": ["property_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "portfolio_stats",
            "description": "Portfolio-wide totals (annual kWh, cost, CO2), unit count, and energy-mix breakdown.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "rank_properties",
            "description": "Rank properties by a metric. Use per_unit=true to normalize by unit count for fair comparison.",
            "parameters": {
                "type": "object",
                "properties": {
                    "by":       {"type": "string", "enum": ["annual_energy_kwh", "annual_cost_eur", "annual_co2_kg"]},
                    "order":    {"type": "string", "enum": ["asc", "desc"], "default": "desc"},
                    "per_unit": {"type": "boolean", "default": False},
                    "limit":    {"type": "integer", "default": 10},
                },
                "required": ["by"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "anomaly_scan",
            "description": "Find properties with unusual annual kWh/unit (z-score > 1 or < -1). Good for spotting outliers.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_forecast",
            "description": "12-month forward kWh + CO2 forecast for a single property (representative unit).",
            "parameters": {
                "type": "object",
                "properties": {
                    "property_id": {"type": "integer"},
                    "months":      {"type": "integer", "default": 12},
                },
                "required": ["property_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_portfolio_report",
            "description": "Generate the full portfolio intelligence report (executive summary, energy mix, retrofit candidates, recommendations). This renders in the right-side panel — only call when the user explicitly asks for a report or full overview.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_today",
            "description": "Return the fixed 'today' date used by the forecasting pipeline. Useful for time-relative questions.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
]
