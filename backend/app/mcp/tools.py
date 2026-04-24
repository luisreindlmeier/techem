"""Tools that operate on the live portfolio data.

Each tool is a pure function that pulls from existing services and returns a
dict that the router converts into a McpChatResponse. Keeping the tools free
of protocol concerns makes them easy to reuse from a real MCP server later.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from statistics import mean, pstdev

from app.config import ASSUMED_TODAY
from app.mcp.schemas import McpBlock, McpCard, McpReport, McpReportSection, McpStat
from app.services.property_data import get_all_property_stats, load_property_meta
from app.services.supabase_data import _build_client, load_properties


SOURCES = ["Supabase · properties", "Supabase · readings", "Open-Meteo weather", "HDD × linear forecast"]


def _unit_counts() -> dict[int, int]:
    """Single-query property_id → unit count map."""
    client = _build_client()
    if client is None:
        return {}
    try:
        resp = client.table("units").select("property_id").execute()
    except Exception:
        return {}
    counts: dict[int, int] = {}
    for row in resp.data or []:
        pid = row.get("property_id")
        if pid is None:
            continue
        counts[int(pid)] = counts.get(int(pid), 0) + 1
    return counts


def _fmt_kwh(v: float) -> str:
    if v >= 1_000_000:
        return f"{v / 1_000_000:.2f} GWh"
    if v >= 1_000:
        return f"{v / 1_000:.1f} MWh"
    return f"{v:.0f} kWh"


def _fmt_eur(v: float) -> str:
    if v >= 1_000_000:
        return f"€{v / 1_000_000:.2f}M"
    if v >= 1_000:
        return f"€{v / 1_000:.1f}k"
    return f"€{v:.0f}"


def _fmt_tons(kg: float) -> str:
    if kg >= 1_000:
        return f"{kg / 1_000:.1f} t CO₂e"
    return f"{kg:.0f} kg CO₂e"


def _tone_for_delta(pct: float) -> str:
    if pct < -2:
        return "positive"
    if pct > 2:
        return "negative"
    return "neutral"


# ---------------------------------------------------------------------------
# Tool 1: portfolio summary (inline answer)
# ---------------------------------------------------------------------------

def tool_portfolio_summary() -> dict:
    properties = load_properties()
    stats = get_all_property_stats()
    stats_by_id = {s.property_id: s for s in stats}

    total_kwh = sum(s.annual_energy_kwh for s in stats)
    total_cost = sum(s.annual_cost_eur for s in stats)
    total_co2 = sum(s.annual_co2_kg for s in stats)

    by_source: dict[str, float] = defaultdict(float)
    for p in properties:
        s = stats_by_id.get(p.id)
        if s is None:
            continue
        by_source[p.energysource or "Unknown"] += s.annual_energy_kwh

    dominant = max(by_source.items(), key=lambda kv: kv[1]) if by_source else ("n/a", 0.0)
    dominant_pct = (dominant[1] / total_kwh * 100) if total_kwh else 0.0

    # Highest consumers (absolute)
    ranked = sorted(stats, key=lambda s: s.annual_energy_kwh, reverse=True)
    top3 = ranked[:3]
    top_lines = []
    for s in top3:
        meta = next((p for p in properties if p.id == s.property_id), None)
        name = (meta.name if meta and meta.name else f"{meta.city} #{s.property_id}") if meta else f"#{s.property_id}"
        top_lines.append(f"{name} — {_fmt_kwh(s.annual_energy_kwh)} / yr")

    blocks = [
        McpBlock(
            kind="paragraph",
            text=(
                f"Portfolio spans {len(properties)} properties. Annual load is "
                f"{_fmt_kwh(total_kwh)} at {_fmt_eur(total_cost)} in energy cost and "
                f"{_fmt_tons(total_co2)} in emissions. "
                f"{dominant[0]} dominates the mix at {dominant_pct:.0f}%."
            ),
        ),
        McpBlock(
            kind="stats",
            stats=[
                McpStat(label="Annual energy", value=_fmt_kwh(total_kwh), tone="neutral"),
                McpStat(label="Annual cost", value=_fmt_eur(total_cost), tone="neutral"),
                McpStat(label="Emissions", value=_fmt_tons(total_co2), tone="neutral"),
                McpStat(label="Properties", value=str(len(properties)), tone="neutral"),
            ],
        ),
        McpBlock(
            kind="list",
            text="Highest consumers",
            items=top_lines,
        ),
    ]

    return {
        "tool": "portfolio_summary",
        "title": "Portfolio summary",
        "blocks": blocks,
        "report": None,
        "stages": [
            "Reading portfolio index…",
            "Aggregating annual stats…",
            "Ranking consumers…",
        ],
    }


# ---------------------------------------------------------------------------
# Tool 2: detect anomalies (inline answer)
# ---------------------------------------------------------------------------

def tool_detect_anomalies() -> dict:
    properties = load_properties()
    stats = get_all_property_stats()
    by_id = {s.property_id: s for s in stats}
    unit_counts = _unit_counts()

    # kWh per unit — normalize by unit_count so small/large buildings are comparable.
    per_unit: list[tuple[int, float]] = []
    for p in properties:
        s = by_id.get(p.id)
        uc = unit_counts.get(p.id, 0)
        if s is None or uc <= 0:
            continue
        per_unit.append((p.id, s.annual_energy_kwh / uc))

    if len(per_unit) < 3:
        return {
            "tool": "detect_anomalies",
            "title": "Anomaly scan",
            "blocks": [
                McpBlock(
                    kind="note",
                    text="Not enough comparable properties to compute anomalies. Add more properties with unit counts to enable this scan.",
                ),
            ],
            "report": None,
            "stages": ["Loading portfolio…", "Computing baselines…"],
        }

    values = [v for _, v in per_unit]
    mu = mean(values)
    sigma = pstdev(values) or 1.0

    scored = [
        (pid, v, (v - mu) / sigma) for pid, v in per_unit
    ]
    high = sorted([x for x in scored if x[2] > 1.0], key=lambda x: x[2], reverse=True)[:3]
    low  = sorted([x for x in scored if x[2] < -1.0], key=lambda x: x[2])[:3]

    def _label(pid: int) -> str:
        meta = next((p for p in properties if p.id == pid), None)
        if meta is None:
            return f"#{pid}"
        return meta.name or f"{meta.city} #{pid}"

    high_items = [
        f"{_label(pid)} — {_fmt_kwh(v)}/unit · {z:+.1f}σ above baseline"
        for pid, v, z in high
    ]
    low_items = [
        f"{_label(pid)} — {_fmt_kwh(v)}/unit · {z:+.1f}σ below baseline"
        for pid, v, z in low
    ]

    blocks: list[McpBlock] = [
        McpBlock(
            kind="paragraph",
            text=(
                f"Scanned {len(per_unit)} properties on annual kWh/unit. Portfolio baseline is "
                f"{_fmt_kwh(mu)}/unit with σ = {_fmt_kwh(sigma)}. "
                f"Flagged {len(high)} high outliers and {len(low)} low outliers (|z| > 1.0)."
            ),
        ),
    ]
    if high_items:
        blocks.append(McpBlock(kind="list", text="High consumption — review first", items=high_items))
    if low_items:
        blocks.append(McpBlock(kind="list", text="Low consumption — verify data quality", items=low_items))
    if not high_items and not low_items:
        blocks.append(McpBlock(kind="note", text="No significant outliers detected. Portfolio is tightly clustered around the baseline."))

    return {
        "tool": "detect_anomalies",
        "title": "Anomaly scan",
        "blocks": blocks,
        "report": None,
        "stages": [
            "Loading per-property stats…",
            "Normalizing by unit count…",
            "Computing z-scores…",
            "Flagging outliers…",
        ],
    }


# ---------------------------------------------------------------------------
# Tool 3: generate portfolio report (sidebar report)
# ---------------------------------------------------------------------------

def tool_generate_report() -> dict:
    properties = load_properties()
    stats = get_all_property_stats()
    by_id = {s.property_id: s for s in stats}
    unit_counts = _unit_counts()

    total_kwh = sum(s.annual_energy_kwh for s in stats)
    total_cost = sum(s.annual_cost_eur for s in stats)
    total_co2 = sum(s.annual_co2_kg for s in stats)
    total_units = sum(unit_counts.values()) or 1

    by_source: dict[str, float] = defaultdict(float)
    count_by_source: dict[str, int] = defaultdict(int)
    for p in properties:
        s = by_id.get(p.id)
        src = p.energysource or "Unknown"
        count_by_source[src] += 1
        if s is not None:
            by_source[src] += s.annual_energy_kwh

    # Per-property efficiency: CO2 per unit
    efficiency: list[tuple[int, float]] = []
    for p in properties:
        s = by_id.get(p.id)
        uc = unit_counts.get(p.id, 0)
        if s is None or uc <= 0:
            continue
        efficiency.append((p.id, s.annual_co2_kg / uc))
    efficiency.sort(key=lambda x: x[1])

    best3 = efficiency[:3]
    worst3 = efficiency[-3:][::-1] if efficiency else []

    def _name_of(pid: int) -> str:
        meta = next((p for p in properties if p.id == pid), None)
        if meta is None:
            return f"#{pid}"
        return meta.name or f"{meta.city} #{pid}"

    # Retrofit candidates — worst-emission buildings on carbon-heavy fuels.
    carbon_heavy = {"Heating Oil", "Natural Gas"}
    retrofit_cards: list[McpCard] = []
    for pid, kg_per_unit in worst3:
        meta = next((p for p in properties if p.id == pid), None)
        fuel = meta.energysource if meta else "Unknown"
        s = by_id.get(pid)
        potential_pct = 35 if fuel in carbon_heavy else 20
        potential_kg = (s.annual_co2_kg * potential_pct / 100) if s else 0
        tone = "negative" if fuel in carbon_heavy else "warning"
        retrofit_cards.append(McpCard(
            title=_name_of(pid),
            description=f"{fuel} · {_fmt_kwh(s.annual_energy_kwh) if s else 'n/a'}/yr. Heat-pump retrofit could cut ~{potential_pct}% of emissions.",
            metric=f"-{_fmt_tons(potential_kg)}",
            tone=tone,
        ))

    mix_stats = [
        McpStat(
            label=src,
            value=_fmt_kwh(kwh),
            delta=f"{count_by_source[src]} {'property' if count_by_source[src] == 1 else 'properties'}",
            tone="negative" if src in carbon_heavy else "positive" if src in {"Heat Pump", "Pellets"} else "neutral",
        )
        for src, kwh in sorted(by_source.items(), key=lambda kv: kv[1], reverse=True)
    ]

    headline_stats = [
        McpStat(label="Annual energy", value=_fmt_kwh(total_kwh), tone="neutral"),
        McpStat(label="Annual cost", value=_fmt_eur(total_cost), tone="neutral"),
        McpStat(label="Emissions", value=_fmt_tons(total_co2), tone="neutral"),
        McpStat(
            label="Avg kWh / unit",
            value=_fmt_kwh(total_kwh / total_units),
            tone="neutral",
        ),
    ]

    leaders = [
        f"{_name_of(pid)} — {_fmt_tons(kg)}/unit"
        for pid, kg in best3
    ]

    recommendations = [
        "Prioritize heat-pump retrofits on the top-3 carbon-heavy buildings — single biggest CO₂ lever.",
        "Roll out weekly anomaly alerts on kWh/unit to catch sensor faults and tenant-behaviour spikes early.",
        "Bundle District Heating properties for a joint tariff renegotiation — concentrated supplier exposure.",
        "Run a building-level HDD × kWh baseline every quarter to separate weather effects from true efficiency gains.",
    ]

    sections = [
        McpReportSection(
            heading="Executive summary",
            kind="paragraph",
            paragraph=(
                f"As of {ASSUMED_TODAY.isoformat()}, the Techem portfolio covers {len(properties)} "
                f"properties totaling {_fmt_kwh(total_kwh)} per year. Energy cost is {_fmt_eur(total_cost)}, "
                f"emissions are {_fmt_tons(total_co2)}. The biggest structural risk is supplier concentration "
                f"in carbon-heavy fuels — three retrofit candidates below can remove a material share of the emissions footprint."
            ),
        ),
        McpReportSection(
            heading="Headline metrics",
            kind="stats",
            stats=headline_stats,
        ),
        McpReportSection(
            heading="Energy mix",
            kind="stats",
            stats=mix_stats,
        ),
        McpReportSection(
            heading="Efficiency leaders",
            kind="list",
            items=leaders,
        ),
        McpReportSection(
            heading="Retrofit candidates",
            kind="cards",
            cards=retrofit_cards,
        ),
        McpReportSection(
            heading="Recommendations",
            kind="list",
            items=recommendations,
        ),
    ]

    report = McpReport(
        title="Portfolio intelligence report",
        subtitle=f"Techem MCP · generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        generated_at=datetime.now(timezone.utc).isoformat(),
        sections=sections,
    )

    blocks = [
        McpBlock(
            kind="paragraph",
            text=(
                f"Generated a full portfolio intelligence report covering {len(properties)} properties, "
                f"{_fmt_kwh(total_kwh)} annual load and {_fmt_tons(total_co2)} in emissions. "
                f"Report is open in the right panel with headline metrics, energy mix, efficiency leaders, "
                f"retrofit candidates and recommended next steps."
            ),
        ),
        McpBlock(
            kind="stats",
            stats=headline_stats,
        ),
        McpBlock(
            kind="note",
            text="Open the panel on the right to read the full report.",
        ),
    ]

    return {
        "tool": "generate_report",
        "title": "Portfolio intelligence report",
        "blocks": blocks,
        "report": report,
        "stages": [
            "Reading portfolio index…",
            "Aggregating annual load per property…",
            "Ranking efficiency leaders…",
            "Modelling retrofit potential…",
            "Composing report…",
        ],
    }


# ---------------------------------------------------------------------------
# Tool 4: active alerts (inline answer)
# ---------------------------------------------------------------------------

def tool_active_alerts() -> dict:
    from app.services.dashboard import get_alerts as _get_dash_alerts  # local import to avoid circulars
    resp = _get_dash_alerts()
    alerts = resp.alerts

    if not alerts:
        return {
            "tool": "active_alerts",
            "title": "Active portfolio alerts",
            "blocks": [
                McpBlock(kind="note", text="No active alerts right now — portfolio is quiet."),
            ],
            "report": None,
            "stages": ["Reading alert rules…", "Scanning portfolio…"],
        }

    priority_tone = {"critical": "negative", "warning": "warning", "info": "neutral"}
    critical_count = sum(1 for a in alerts if a.priority == "critical")
    warning_count = sum(1 for a in alerts if a.priority == "warning")

    stat_items = []
    if critical_count:
        stat_items.append(McpStat(label="Critical", value=str(critical_count), tone="negative"))
    if warning_count:
        stat_items.append(McpStat(label="Warning", value=str(warning_count), tone="warning"))
    stat_items.append(McpStat(label="Total", value=str(len(alerts)), tone="neutral"))

    list_items = [
        f"{a.priority.upper()} · {a.property_name}{' · ' + a.unit_id if a.unit_id else ''} — {a.title}"
        for a in alerts
    ]

    detail_items = [f"{a.property_name} · {a.title} — {a.message}" for a in alerts]

    blocks: list[McpBlock] = [
        McpBlock(
            kind="paragraph",
            text=(
                f"{len(alerts)} alerts currently open across the portfolio — "
                f"{critical_count} critical, {warning_count} warning. "
                f"Lead with the critical ones; they affect tenant comfort and building integrity."
            ),
        ),
        McpBlock(kind="stats", stats=stat_items),
        McpBlock(kind="list", text="Priority queue", items=list_items),
        McpBlock(kind="list", text="Details", items=detail_items),
    ]

    _ = priority_tone  # reserved for future per-block tone mapping
    return {
        "tool": "active_alerts",
        "title": "Active portfolio alerts",
        "blocks": blocks,
        "report": None,
        "stages": [
            "Reading alert rules…",
            "Scanning units for mold risk…",
            "Checking for heating failures…",
            "Ranking by priority…",
        ],
    }


# Mark these so load_property_meta import stays (prevents unused linter churn when extending).
_ = load_property_meta
