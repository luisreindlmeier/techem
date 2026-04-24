"""Builds all derived building data exposed to the frontend.

Source of truth hierarchy for each property:
  1. Readings in the DB (aggregated for history, extrapolated for stats).
  2. Weather-driven synthesis when the property has no seeded readings —
     uses Open-Meteo historical temperatures × HDD model × deterministic
     per-unit factors so portfolios without readings still look plausible.

Forecasts always use real Open-Meteo forecast temperatures (or last-year
climatology beyond the 16-day window) feeding an HDD×k model fit from history.
"""
from __future__ import annotations

import hashlib
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date, timedelta

from app.config import (
    APT_LABELS,
    ASSUMED_TODAY,
    COST_PER_KWH_EUR,
    DEFAULT_COST_PER_KWH_EUR,
    DEFAULT_EMISSION_FACTOR_KG_PER_KWH,
    HDD_BASE_TEMP_C,
    ROOM_LABELS,
    ROOM_TEMPLATES,
    SYNTHESIS_CONFIG,
    UNITS_PER_FLOOR,
)
from app.schemas import (
    BuildingOverview,
    ForecastPoint,
    ForecastTimelinePoint,
    ForecastTimelineResponse,
    GranularPoint,
    MonthlyPoint,
    PropertyStats,
    RoomPoint,
    UnitForecastResponse,
    UnitHistoryResponse,
    UnitSummary,
)
from app.services.supabase_data import _build_client
from app.services.weather import get_daily_temps, heating_degree_days


MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ---------------------------------------------------------------------------
# Property metadata loader
# ---------------------------------------------------------------------------

@dataclass
class PropertyMeta:
    id: int
    name: str | None
    city: str
    zipcode: str
    energysource: str
    lat: float
    lng: float
    unit_count: int
    emission_factor_kg_per_kwh: float
    cost_per_kwh_eur: float


def _fallback_coords_for_zip(zipcode: str) -> tuple[float, float]:
    """Rough centroid of Germany as a safety net."""
    return 51.1657, 10.4515


def load_property_meta(property_id: int) -> PropertyMeta | None:
    client = _build_client()
    if client is None:
        return None
    try:
        resp = (
            client.table("properties")
            .select("id,name,city,zipcode,energysource,lat,lng,emission_factor_g_kwh")
            .eq("id", property_id)
            .limit(1)
            .execute()
        )
    except Exception:
        return None
    rows = resp.data or []
    if not rows:
        return None
    row = rows[0]

    unit_count = _count_units(client, property_id)
    lat = row.get("lat")
    lng = row.get("lng")
    if lat is None or lng is None:
        lat, lng = _fallback_coords_for_zip(row.get("zipcode", ""))

    emission_factor_g = row.get("emission_factor_g_kwh")
    emission_factor_kg_per_kwh = (
        float(emission_factor_g) / 1000.0 if emission_factor_g
        else DEFAULT_EMISSION_FACTOR_KG_PER_KWH
    )
    energysource = row.get("energysource", "") or ""
    cost_per_kwh = COST_PER_KWH_EUR.get(energysource, DEFAULT_COST_PER_KWH_EUR)

    return PropertyMeta(
        id=int(row["id"]),
        name=row.get("name"),
        city=row.get("city", "") or "",
        zipcode=row.get("zipcode", "") or "",
        energysource=energysource,
        lat=float(lat),
        lng=float(lng),
        unit_count=unit_count,
        emission_factor_kg_per_kwh=emission_factor_kg_per_kwh,
        cost_per_kwh_eur=cost_per_kwh,
    )


def _count_units(client, property_id: int) -> int:
    try:
        resp = (
            client.table("units")
            .select("id", count="exact")
            .eq("property_id", property_id)
            .execute()
        )
    except Exception:
        return 0
    return int(resp.count or 0)


# ---------------------------------------------------------------------------
# Readings loader
# ---------------------------------------------------------------------------

@dataclass
class DailyReading:
    day: date
    room_key: tuple[int, int, int]  # (floor, apt_idx_1based, position_1based_within_unit)
    energy_kwh: float


@dataclass
class RoomMeta:
    floor: int
    apt_idx: int
    position: int              # 1-based within unit (sorted by roomnumber)
    livingspace_m2: float
    roomnumber: int


def _load_unit_rooms(property_id: int) -> tuple[
    dict[tuple[int, int], list[RoomMeta]],
    dict[int, tuple[int, int, int]],
]:
    """Return (rooms_by_unit, room_id_to_loc) for a property.

    rooms_by_unit maps (floor, apt_idx) → rooms sorted by within-unit position.
    room_id_to_loc maps room_id → (floor, apt_idx, position) for readings lookup.
    """
    client = _build_client()
    if client is None:
        return {}, {}

    try:
        units_resp = (
            client.table("units")
            .select("id,unitnumber")
            .eq("property_id", property_id)
            .execute()
        )
    except Exception:
        return {}, {}

    units = sorted(units_resp.data or [], key=lambda r: r["unitnumber"])
    if not units:
        return {}, {}
    unit_id_to_seq = {u["id"]: i + 1 for i, u in enumerate(units)}
    unit_ids = list(unit_id_to_seq.keys())

    try:
        rooms_resp = (
            client.table("rooms")
            .select("id,unit_id,roomnumber,livingspace_m2")
            .in_("unit_id", unit_ids)
            .execute()
        )
    except Exception:
        return {}, {}

    rooms = rooms_resp.data or []
    grouped: dict[int, list[dict]] = {}
    for r in rooms:
        grouped.setdefault(r["unit_id"], []).append(r)

    rooms_by_unit: dict[tuple[int, int], list[RoomMeta]] = {}
    room_id_to_loc: dict[int, tuple[int, int, int]] = {}

    for unit_id, unit_rooms in grouped.items():
        unit_rooms.sort(key=lambda r: int(r["roomnumber"]))
        unit_seq = unit_id_to_seq[unit_id]
        floor, apt = divmod(unit_seq - 1, UNITS_PER_FLOOR)
        floor += 1
        apt += 1
        metas: list[RoomMeta] = []
        for idx, room in enumerate(unit_rooms, start=1):
            meta = RoomMeta(
                floor=floor,
                apt_idx=apt,
                position=idx,
                livingspace_m2=float(room.get("livingspace_m2") or 0.0),
                roomnumber=int(room["roomnumber"]),
            )
            metas.append(meta)
            room_id_to_loc[room["id"]] = (floor, apt, idx)
        rooms_by_unit[(floor, apt)] = metas

    return rooms_by_unit, room_id_to_loc


def _load_readings(property_id: int, start: date, end: date) -> list[DailyReading]:
    """Return per-room daily readings in [start, end]. Empty when no readings exist."""
    _, room_id_to_loc = _load_unit_rooms(property_id)
    if not room_id_to_loc:
        return []

    client = _build_client()
    if client is None:
        return []

    out: list[DailyReading] = []
    page_size = 1000
    offset = 0
    room_ids = list(room_id_to_loc.keys())
    while True:
        try:
            readings_resp = (
                client.table("readings")
                .select("room_id,reading_date,energy_usage_kwh")
                .in_("room_id", room_ids)
                .gte("reading_date", start.isoformat())
                .lte("reading_date", end.isoformat())
                .range(offset, offset + page_size - 1)
                .execute()
            )
        except Exception:
            break
        batch = readings_resp.data or []
        for rec in batch:
            loc = room_id_to_loc.get(rec["room_id"])
            if loc is None:
                continue
            try:
                day = date.fromisoformat(str(rec["reading_date"])[:10])
            except ValueError:
                continue
            out.append(DailyReading(day=day, room_key=loc, energy_kwh=float(rec["energy_usage_kwh"])))
        if len(batch) < page_size:
            break
        offset += page_size

    return out


# ---------------------------------------------------------------------------
# Deterministic synthesis (when no readings exist)
# ---------------------------------------------------------------------------

def _det_factor(seed: str, lo: float, hi: float) -> float:
    """Deterministic factor in [lo, hi] derived from a seed string."""
    h = hashlib.md5(seed.encode()).digest()
    r = int.from_bytes(h[:4], "big") / 0xFFFFFFFF
    return lo + r * (hi - lo)


def _synthesize_reading(
    property_id: int,
    floor: int,
    apt_idx: int,
    room_idx: int,
    day: date,
    hdd: float,
    livingspace_m2: float,
) -> float:
    """kWh ≈ HDD × per-unit factor × room weight × base load.

    HDD drives seasonal shape (high in winter, ~0 in summer). Per-unit factor
    adds cross-apartment variance, per-room factor adds per-room variance.
    All coefficients are physically meaningful and defined in SYNTHESIS_CONFIG.
    Deterministic: same inputs → same output.
    """
    cfg = SYNTHESIS_CONFIG
    unit_factor = _det_factor(
        f"{property_id}-{floor}-{apt_idx}",
        cfg["unit_factor_min"], cfg["unit_factor_max"],
    )
    room_factor = _det_factor(
        f"{property_id}-{floor}-{apt_idx}-{room_idx}",
        cfg["room_factor_min"], cfg["room_factor_max"],
    )
    heating   = hdd * cfg["heating_coefficient"] * unit_factor * room_factor \
                * (livingspace_m2 / cfg["reference_room_sqm"])
    base_load = cfg["daily_base_load_kwh"] * unit_factor * room_factor
    return max(0.1, heating + base_load)


def _synthesize_daily_apt_series(
    meta: PropertyMeta,
    floor: int,
    apt_idx: int,
    start: date,
    end: date,
) -> dict[date, float]:
    """kWh per day for one apartment, summed over 4 rooms."""
    temps = get_daily_temps(meta.lat, meta.lng, start, end)
    hdds  = heating_degree_days(temps, HDD_BASE_TEMP_C)
    out: dict[date, float] = {}
    d = start
    while d <= end:
        key = d.isoformat()
        hdd = hdds.get(key, 0.0)
        total = 0.0
        for room_idx, room in enumerate(ROOM_TEMPLATES, start=1):
            sqm = _det_factor(
                f"{meta.id}-{floor}-{apt_idx}-{room_idx}-sqm",
                room["sqm_min"], room["sqm_max"],
            )
            total += _synthesize_reading(meta.id, floor, apt_idx, room_idx, d, hdd, sqm)
        out[d] = total
        d += timedelta(days=1)
    return out


# ---------------------------------------------------------------------------
# Aggregation helpers
# ---------------------------------------------------------------------------

def _daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def _total_floors(unit_count: int) -> int:
    if unit_count <= 0:
        return 1
    return max(1, -(-unit_count // UNITS_PER_FLOOR))  # ceil div


def _apt_daily_from_readings(readings: list[DailyReading], floor: int, apt: int) -> dict[date, float]:
    out: dict[date, float] = {}
    for r in readings:
        if r.room_key[0] == floor and r.room_key[1] == apt:
            out[r.day] = out.get(r.day, 0.0) + r.energy_kwh
    return out


def _monthly_totals(daily: dict[date, float]) -> list[float]:
    """12-entry array, one per calendar month, aggregating all years in the map."""
    out = [0.0] * 12
    for d, v in daily.items():
        out[d.month - 1] += v
    # if multiple years are present, average the per-month totals
    years = {d.year for d in daily.keys()}
    if len(years) > 1:
        out = [x / len(years) for x in out]
    return out


# ---------------------------------------------------------------------------
# Public API: stats (portfolio card KPIs)
# ---------------------------------------------------------------------------

def get_property_stats(property_id: int) -> PropertyStats | None:
    meta = load_property_meta(property_id)
    if meta is None:
        return None

    window_end   = ASSUMED_TODAY
    window_start = window_end - timedelta(days=365)
    total_kwh = _annual_energy_for_property(meta, window_start, window_end)

    cost_eur = total_kwh * meta.cost_per_kwh_eur
    co2_kg   = total_kwh * meta.emission_factor_kg_per_kwh
    return PropertyStats(
        property_id=property_id,
        annual_energy_kwh=round(total_kwh, 1),
        annual_cost_eur=round(cost_eur, 1),
        annual_co2_kg=round(co2_kg, 1),
    )


# Module-level cache: ASSUMED_TODAY is fixed, so stats never change while the
# process runs. First request populates, subsequent ones are instant.
_stats_cache: list[PropertyStats] | None = None
_stats_lock = threading.Lock()


def get_all_property_stats() -> list[PropertyStats]:
    global _stats_cache
    if _stats_cache is not None:
        return _stats_cache

    with _stats_lock:
        if _stats_cache is not None:
            return _stats_cache

        client = _build_client()
        if client is None:
            return []
        try:
            resp = client.table("properties").select("id").order("id").execute()
        except Exception:
            return []

        ids = [int(row["id"]) for row in resp.data or []]

        # Supabase + Open-Meteo calls are blocking I/O → parallelize.
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(get_property_stats, ids))

        stats = [s for s in results if s is not None]
        _stats_cache = stats
        return stats


def invalidate_stats_cache() -> None:
    """Clear the module-level stats cache (e.g. after seeding new data)."""
    global _stats_cache
    with _stats_lock:
        _stats_cache = None


def _annual_energy_for_property(meta: PropertyMeta, start: date, end: date) -> float:
    readings = _load_readings(meta.id, start, end)
    if readings:
        total = sum(r.energy_kwh for r in readings)
        # if readings don't cover the whole window, pro-rate
        days_with = len({r.day for r in readings})
        span_days = (end - start).days + 1
        if days_with >= span_days * 0.5:
            return total
        if days_with > 0:
            return total * span_days / days_with

    # no/sparse readings → synthesize for all units
    total_floors = _total_floors(meta.unit_count)
    total = 0.0
    for floor in range(1, total_floors + 1):
        units_on_floor = min(UNITS_PER_FLOOR, meta.unit_count - (floor - 1) * UNITS_PER_FLOOR)
        for apt_idx in range(1, units_on_floor + 1):
            daily = _synthesize_daily_apt_series(meta, floor, apt_idx, start, end)
            total += sum(daily.values())
    return total


# ---------------------------------------------------------------------------
# Public API: overview (all units with annual energy + rooms)
# ---------------------------------------------------------------------------

def get_building_overview(property_id: int) -> BuildingOverview | None:
    meta = load_property_meta(property_id)
    if meta is None:
        return None

    end   = ASSUMED_TODAY
    start = end - timedelta(days=365)

    rooms_by_unit, _ = _load_unit_rooms(meta.id)
    readings = _load_readings(meta.id, start, end)

    # Build per-(floor, apt, position) annual kWh from readings
    room_annual: dict[tuple[int, int, int], float] = {}
    for r in readings:
        room_annual[r.room_key] = room_annual.get(r.room_key, 0.0) + r.energy_kwh

    total_floors = _total_floors(meta.unit_count) if meta.unit_count > 0 else 5
    effective_unit_count = meta.unit_count if meta.unit_count > 0 else total_floors * UNITS_PER_FLOOR

    # First pass: build each unit's rooms (name, sqm, kwh) without building avg
    units_raw: list[tuple[int, int, float, list[RoomPoint]]] = []
    for floor in range(1, total_floors + 1):
        units_on_floor = min(UNITS_PER_FLOOR, effective_unit_count - (floor - 1) * UNITS_PER_FLOOR)
        for apt_idx in range(1, units_on_floor + 1):
            rooms = _build_rooms_for_unit(meta, floor, apt_idx, rooms_by_unit, room_annual, start, end)
            annual = sum(r.annual_energy_kwh for r in rooms)
            units_raw.append((floor, apt_idx, annual, rooms))

    # Second pass: compute per-position building average kWh/yr
    by_position: dict[int, list[float]] = {}
    max_positions = max((len(rooms) for _, _, _, rooms in units_raw), default=0)
    for pos in range(1, max_positions + 1):
        vals = [rooms[pos - 1].annual_energy_kwh for _, _, _, rooms in units_raw if len(rooms) >= pos]
        by_position[pos] = vals

    pos_avg: dict[int, float] = {
        pos: (sum(vals) / len(vals)) if vals else 0.0 for pos, vals in by_position.items()
    }

    units: list[UnitSummary] = []
    for floor, apt_idx, annual, rooms in units_raw:
        rooms_with_avg = [
            RoomPoint(
                name=r.name,
                sqm=r.sqm,
                annual_energy_kwh=r.annual_energy_kwh,
                building_avg_kwh=round(pos_avg.get(i + 1, 0.0), 1),
            )
            for i, r in enumerate(rooms)
        ]
        units.append(UnitSummary(
            label=f"{floor}{APT_LABELS[apt_idx - 1]}",
            floor=floor,
            apt=APT_LABELS[apt_idx - 1],
            annual_energy_kwh=round(annual, 1),
            rooms=rooms_with_avg,
        ))

    return BuildingOverview(property_id=property_id, units=units)


def _label_for_position(position: int) -> str:
    if 1 <= position <= len(ROOM_LABELS):
        return ROOM_LABELS[position - 1]
    return f"Room {position}"


def _build_rooms_for_unit(
    meta: PropertyMeta,
    floor: int,
    apt_idx: int,
    rooms_by_unit: dict[tuple[int, int], list[RoomMeta]],
    room_annual: dict[tuple[int, int, int], float],
    start: date,
    end: date,
) -> list[RoomPoint]:
    db_rooms = rooms_by_unit.get((floor, apt_idx), [])

    if db_rooms:
        # Real rooms from DB. Use readings per room if available, otherwise
        # distribute a synthesized apartment total across rooms by livingspace.
        have_readings = any(room_annual.get((floor, apt_idx, m.position), 0.0) > 0 for m in db_rooms)
        if have_readings:
            return [
                RoomPoint(
                    name=_label_for_position(m.position),
                    sqm=round(m.livingspace_m2, 1),
                    annual_energy_kwh=round(room_annual.get((floor, apt_idx, m.position), 0.0), 1),
                )
                for m in db_rooms
            ]

        apt_daily = _synthesize_daily_apt_series(meta, floor, apt_idx, start, end)
        apt_total = sum(apt_daily.values())
        total_sqm = sum(m.livingspace_m2 for m in db_rooms) or 1.0
        return [
            RoomPoint(
                name=_label_for_position(m.position),
                sqm=round(m.livingspace_m2, 1),
                annual_energy_kwh=round(apt_total * (m.livingspace_m2 / total_sqm), 1),
            )
            for m in db_rooms
        ]

    # No DB rooms → fall back to synthesized 4-room layout.
    apt_daily = _synthesize_daily_apt_series(meta, floor, apt_idx, start, end)
    annual_energy = sum(apt_daily.values())
    weights: list[float] = []
    sqms:    list[float] = []
    for room_idx, tpl in enumerate(ROOM_TEMPLATES, start=1):
        sqm = _det_factor(
            f"{meta.id}-{floor}-{apt_idx}-{room_idx}-sqm",
            tpl["sqm_min"], tpl["sqm_max"],
        )
        w = tpl["weight"] * _det_factor(
            f"{meta.id}-{floor}-{apt_idx}-{room_idx}-w", 0.85, 1.15,
        )
        sqms.append(sqm)
        weights.append(w)
    total_w = sum(weights) or 1.0
    return [
        RoomPoint(
            name=_label_for_position(i + 1),
            sqm=round(sqms[i], 1),
            annual_energy_kwh=round(annual_energy * weights[i] / total_w, 1),
        )
        for i in range(len(ROOM_TEMPLATES))
    ]


# ---------------------------------------------------------------------------
# Public API: unit history (monthly + weekly + daily comparison)
# ---------------------------------------------------------------------------

def get_unit_history(property_id: int, floor: int, apt_idx: int) -> UnitHistoryResponse | None:
    meta = load_property_meta(property_id)
    if meta is None:
        return None

    # Monthly = last full 12 calendar months ending at ASSUMED_TODAY
    monthly_end   = date(ASSUMED_TODAY.year, ASSUMED_TODAY.month, 1) - timedelta(days=1)
    monthly_start = date(monthly_end.year - 1, monthly_end.month, 1) + timedelta(days=0)
    if monthly_start.month == 12:
        monthly_start = date(monthly_start.year + 1, 1, 1)
    else:
        monthly_start = date(monthly_start.year, monthly_start.month + 1, 1)

    # Simpler, correct: 12 months back from first of current month
    first_of_current = date(ASSUMED_TODAY.year, ASSUMED_TODAY.month, 1)
    monthly_end_exclusive = first_of_current
    year  = first_of_current.year - 1
    month = first_of_current.month
    monthly_start = date(year, month, 1)
    monthly_range_start = monthly_start
    monthly_range_end   = monthly_end_exclusive - timedelta(days=1)

    readings = _load_readings(meta.id, monthly_range_start, monthly_range_end)
    total_floors = _total_floors(meta.unit_count) if meta.unit_count > 0 else 5
    effective_unit_count = meta.unit_count if meta.unit_count > 0 else total_floors * UNITS_PER_FLOOR

    # ---- apartment daily series
    apt_daily = _apt_daily_from_readings(readings, floor, apt_idx)
    if not apt_daily:
        apt_daily = _synthesize_daily_apt_series(meta, floor, apt_idx, monthly_range_start, monthly_range_end)

    # ---- building average daily series (summed across apts, divided by count)
    avg_daily = _building_avg_daily(meta, readings, monthly_range_start, monthly_range_end, effective_unit_count, total_floors)

    # ---- monthly (last 12 calendar months, re-ordered to chronological)
    monthly_apt: list[MonthlyPoint] = []
    monthly_avg: list[MonthlyPoint] = []
    cursor = monthly_range_start
    while cursor <= monthly_range_end:
        month_start = date(cursor.year, cursor.month, 1)
        nxt = date(cursor.year + (1 if cursor.month == 12 else 0), 1 if cursor.month == 12 else cursor.month + 1, 1)
        month_end_inclusive = nxt - timedelta(days=1)
        apt_total = sum(v for d, v in apt_daily.items() if month_start <= d <= month_end_inclusive)
        avg_total = sum(v for d, v in avg_daily.items() if month_start <= d <= month_end_inclusive)
        monthly_apt.append(_to_monthly_point(MONTH_LABELS[cursor.month - 1], apt_total, meta))
        monthly_avg.append(_to_monthly_point(MONTH_LABELS[cursor.month - 1], avg_total, meta))
        cursor = nxt

    # ---- weekly (last 52 weeks ending ASSUMED_TODAY)
    weekly_end   = ASSUMED_TODAY
    weekly_start = weekly_end - timedelta(days=52 * 7 - 1)
    if weekly_start < monthly_range_start:
        # need to fetch / synthesize for the earlier days too
        apt_daily_wk = _apt_daily_from_readings(readings, floor, apt_idx)
        if not apt_daily_wk:
            apt_daily_wk = _synthesize_daily_apt_series(meta, floor, apt_idx, weekly_start, weekly_end)
        avg_daily_wk = _building_avg_daily(meta, readings, weekly_start, weekly_end, effective_unit_count, total_floors)
    else:
        apt_daily_wk = apt_daily
        avg_daily_wk = avg_daily

    weekly: list[GranularPoint] = []
    for w in range(52):
        w_start = weekly_start + timedelta(days=w * 7)
        w_end   = w_start + timedelta(days=6)
        apt_v = sum(v for d, v in apt_daily_wk.items() if w_start <= d <= w_end)
        avg_v = sum(v for d, v in avg_daily_wk.items() if w_start <= d <= w_end)
        weekly.append(GranularPoint(label=f"W{w + 1}", apartment=round(apt_v, 1), average=round(avg_v, 1)))

    # ---- daily (last 30 days)
    daily_end   = ASSUMED_TODAY
    daily_start = daily_end - timedelta(days=29)
    if daily_start < weekly_start:
        apt_daily_dd = _apt_daily_from_readings(readings, floor, apt_idx)
        if not apt_daily_dd:
            apt_daily_dd = _synthesize_daily_apt_series(meta, floor, apt_idx, daily_start, daily_end)
        avg_daily_dd = _building_avg_daily(meta, readings, daily_start, daily_end, effective_unit_count, total_floors)
    else:
        apt_daily_dd = apt_daily_wk
        avg_daily_dd = avg_daily_wk

    daily: list[GranularPoint] = []
    for i in range(30):
        d = daily_start + timedelta(days=i)
        apt_v = apt_daily_dd.get(d, 0.0)
        avg_v = avg_daily_dd.get(d, 0.0)
        daily.append(GranularPoint(label=str(i + 1), apartment=round(apt_v, 1), average=round(avg_v, 1)))

    return UnitHistoryResponse(
        property_id=property_id,
        floor=floor,
        apt=APT_LABELS[apt_idx - 1],
        cost_per_kwh_eur=meta.cost_per_kwh_eur,
        emission_factor_kg_per_kwh=meta.emission_factor_kg_per_kwh,
        monthly_apartment=monthly_apt,
        monthly_average=monthly_avg,
        weekly=weekly,
        daily=daily,
    )


def _to_monthly_point(month_label: str, energy_kwh: float, meta: PropertyMeta) -> MonthlyPoint:
    return MonthlyPoint(
        month=month_label,
        energy_kwh=round(energy_kwh, 1),
        cost_eur=round(energy_kwh * meta.cost_per_kwh_eur, 1),
        co2_kg=round(energy_kwh * meta.emission_factor_kg_per_kwh, 1),
    )


def _building_avg_daily(
    meta: PropertyMeta,
    readings: list[DailyReading],
    start: date,
    end: date,
    unit_count: int,
    total_floors: int,
) -> dict[date, float]:
    """Average kWh per day across all apartments. Uses readings if present,
    otherwise synthesized per-apt series averaged together."""
    if readings:
        per_day: dict[date, float] = {}
        counts: dict[date, set[tuple[int, int]]] = {}
        for r in readings:
            if start <= r.day <= end:
                per_day[r.day] = per_day.get(r.day, 0.0) + r.energy_kwh
                counts.setdefault(r.day, set()).add((r.room_key[0], r.room_key[1]))
        if per_day:
            return {d: v / max(1, len(counts[d])) for d, v in per_day.items()}

    # synthesize
    sum_by_day: dict[date, float] = {}
    n_apts = 0
    for f in range(1, total_floors + 1):
        units_on_floor = min(UNITS_PER_FLOOR, unit_count - (f - 1) * UNITS_PER_FLOOR)
        for a in range(1, units_on_floor + 1):
            series = _synthesize_daily_apt_series(meta, f, a, start, end)
            for d, v in series.items():
                sum_by_day[d] = sum_by_day.get(d, 0.0) + v
            n_apts += 1
    if n_apts == 0:
        return {}
    return {d: v / n_apts for d, v in sum_by_day.items()}


# ---------------------------------------------------------------------------
# Public API: forecast (weather-driven, HDD × model fit from history)
# ---------------------------------------------------------------------------

def get_unit_forecast(property_id: int, floor: int, apt_idx: int) -> UnitForecastResponse | None:
    meta = load_property_meta(property_id)
    if meta is None:
        return None

    # History window: previous 12 months before ASSUMED_TODAY.
    hist_end   = ASSUMED_TODAY
    hist_start = hist_end - timedelta(days=365)

    readings = _load_readings(meta.id, hist_start, hist_end)
    apt_daily = _apt_daily_from_readings(readings, floor, apt_idx)
    if not apt_daily:
        apt_daily = _synthesize_daily_apt_series(meta, floor, apt_idx, hist_start, hist_end)

    hist_temps = get_daily_temps(meta.lat, meta.lng, hist_start, hist_end)
    hist_hdds  = heating_degree_days(hist_temps, HDD_BASE_TEMP_C)

    # Fit kWh = k × HDD + base
    k, base = _fit_linear_hdd_model(apt_daily, hist_hdds)

    # Forecast window: next 12 months starting ASSUMED_TODAY + 1 day.
    fc_start = ASSUMED_TODAY + timedelta(days=1)
    fc_end   = fc_start + timedelta(days=365)
    fc_temps = get_daily_temps(meta.lat, meta.lng, fc_start, fc_end)
    fc_hdds  = heating_degree_days(fc_temps, HDD_BASE_TEMP_C)

    monthly: list[ForecastPoint] = []
    cursor = fc_start
    while cursor <= fc_end:
        month_start = date(cursor.year, cursor.month, 1)
        nxt_month   = date(cursor.year + (1 if cursor.month == 12 else 0),
                           1 if cursor.month == 12 else cursor.month + 1, 1)
        end_of_month = min(nxt_month - timedelta(days=1), fc_end)
        total_kwh = 0.0
        d = max(month_start, cursor)
        while d <= end_of_month:
            hdd = fc_hdds.get(d.isoformat(), 0.0)
            total_kwh += max(0.0, k * hdd + base)
            d += timedelta(days=1)
        monthly.append(ForecastPoint(
            date=MONTH_LABELS[month_start.month - 1],
            predicted_energy_kwh=round(total_kwh, 1),
            predicted_emission_kg_co2e=round(total_kwh * meta.emission_factor_kg_per_kwh, 1),
        ))
        cursor = nxt_month
        if len(monthly) >= 12:
            break

    return UnitForecastResponse(
        property_id=property_id,
        floor=floor,
        apt=APT_LABELS[apt_idx - 1],
        model=f"HDD·linear (base={HDD_BASE_TEMP_C}°C)",
        horizon_days=(fc_end - fc_start).days + 1,
        points=monthly,
    )


def _fit_linear_hdd_model(
    daily_kwh: dict[date, float],
    daily_hdd: dict[str, float],
) -> tuple[float, float]:
    """Ordinary least squares fit of kWh = k × HDD + base."""
    xs: list[float] = []
    ys: list[float] = []
    for d, y in daily_kwh.items():
        x = daily_hdd.get(d.isoformat())
        if x is None:
            continue
        xs.append(x)
        ys.append(y)
    n = len(xs)
    if n < 2:
        # no weather context → fallback to mean
        return 0.0, (sum(daily_kwh.values()) / max(1, len(daily_kwh)))
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    den = sum((x - mean_x) ** 2 for x in xs) or 1.0
    k = num / den
    base = mean_y - k * mean_x
    return k, max(0.0, base)


# ---------------------------------------------------------------------------
# Public API: combined actual + forecast timeline at configurable granularity
# ---------------------------------------------------------------------------

def _month_end(d: date) -> date:
    if d.month == 12:
        return date(d.year, 12, 31)
    return date(d.year, d.month + 1, 1) - timedelta(days=1)


def get_unit_forecast_timeline(
    property_id: int, floor: int, apt_idx: int, granularity: str,
) -> ForecastTimelineResponse | None:
    """Unified actual-vs-forecast timeline bucketed at the requested granularity.

    Window:
      - monthly: calendar year of ASSUMED_TODAY (Jan..Dec)
      - weekly/daily: calendar month of ASSUMED_TODAY (1st..last day)

    Each bucket entirely in the past carries `actual`; entirely in the future
    carries `forecast`; the bucket straddling ASSUMED_TODAY (the "current" one)
    carries both values set to the same projected total so the two lines meet.
    """
    if granularity not in ("monthly", "weekly", "daily"):
        return None
    meta = load_property_meta(property_id)
    if meta is None:
        return None

    today = ASSUMED_TODAY

    if granularity == "monthly":
        window_start = date(today.year, 1, 1)
        window_end   = date(today.year, 12, 31)
    else:
        window_start = date(today.year, today.month, 1)
        window_end   = _month_end(today)

    total_floors = _total_floors(meta.unit_count) if meta.unit_count > 0 else 5
    effective_unit_count = meta.unit_count if meta.unit_count > 0 else total_floors * UNITS_PER_FLOOR

    # ---- actual daily series (readings or weather-driven synthesis)
    past_start = window_start
    past_end   = min(today, window_end)
    past_daily: dict[date, float] = {}
    avg_past_daily: dict[date, float] = {}
    past_readings: list[DailyReading] = []
    if past_start <= past_end:
        past_readings = _load_readings(meta.id, past_start, past_end)
        past_daily = _apt_daily_from_readings(past_readings, floor, apt_idx)
        if not past_daily:
            past_daily = _synthesize_daily_apt_series(meta, floor, apt_idx, past_start, past_end)
        avg_past_daily = _building_avg_daily(
            meta, past_readings, past_start, past_end, effective_unit_count, total_floors,
        )

    # ---- fit HDD × linear model from prior 12 months (unit + building average)
    hist_end   = today
    hist_start = hist_end - timedelta(days=365)
    fit_readings = _load_readings(meta.id, hist_start, hist_end)
    fit_daily = _apt_daily_from_readings(fit_readings, floor, apt_idx)
    if not fit_daily:
        fit_daily = _synthesize_daily_apt_series(meta, floor, apt_idx, hist_start, hist_end)
    fit_avg_daily = _building_avg_daily(
        meta, fit_readings, hist_start, hist_end, effective_unit_count, total_floors,
    )
    hist_temps = get_daily_temps(meta.lat, meta.lng, hist_start, hist_end)
    hist_hdds  = heating_degree_days(hist_temps, HDD_BASE_TEMP_C)
    k, base = _fit_linear_hdd_model(fit_daily, hist_hdds)
    k_avg, base_avg = _fit_linear_hdd_model(fit_avg_daily, hist_hdds)

    # ---- forecast daily series (unit + building average)
    fc_start = today + timedelta(days=1)
    fc_end   = window_end
    fc_daily: dict[date, float] = {}
    avg_fc_daily: dict[date, float] = {}
    if fc_start <= fc_end:
        fc_temps = get_daily_temps(meta.lat, meta.lng, fc_start, fc_end)
        fc_hdds  = heating_degree_days(fc_temps, HDD_BASE_TEMP_C)
        d = fc_start
        while d <= fc_end:
            hdd = fc_hdds.get(d.isoformat(), 0.0)
            fc_daily[d]     = max(0.0, k * hdd + base)
            avg_fc_daily[d] = max(0.0, k_avg * hdd + base_avg)
            d += timedelta(days=1)

    # ---- daily mean temperatures for the full window (drives the °C series)
    window_temps = get_daily_temps(meta.lat, meta.lng, window_start, window_end)

    # ---- bucket into granularity
    points: list[ForecastTimelinePoint] = []
    cutoff_label = ""

    def _bucket(label: str, b_start: date, b_end: date) -> ForecastTimelinePoint:
        nonlocal cutoff_label
        past_sum = 0.0
        future_sum = 0.0
        avg_sum = 0.0
        temp_sum = 0.0
        temp_n = 0
        d = b_start
        while d <= b_end:
            key = d.isoformat()
            if d <= today:
                past_sum += past_daily.get(d, 0.0)
                avg_sum += avg_past_daily.get(d, 0.0)
            else:
                future_sum += fc_daily.get(d, 0.0)
                avg_sum += avg_fc_daily.get(d, 0.0)
            if key in window_temps:
                temp_sum += window_temps[key]
                temp_n += 1
            d += timedelta(days=1)
        avg_val  = round(avg_sum, 1)
        temp_val = round(temp_sum / temp_n, 1) if temp_n else None
        # The bucket containing today is the boundary — carry the same value
        # on both series so the solid and dashed lines meet visually. For daily
        # this is today itself (a single-day bucket).
        is_boundary = b_start <= today <= b_end
        if is_boundary:
            total = round(past_sum + future_sum, 1)
            cutoff_label = label
            return ForecastTimelinePoint(
                label=label, actual=total, forecast=total,
                average=avg_val, temperature=temp_val,
            )
        if b_end <= today:
            return ForecastTimelinePoint(
                label=label, actual=round(past_sum, 1), forecast=None,
                average=avg_val, temperature=temp_val,
            )
        return ForecastTimelinePoint(
            label=label, actual=None, forecast=round(future_sum, 1),
            average=avg_val, temperature=temp_val,
        )

    if granularity == "monthly":
        for m in range(1, 13):
            m_start = date(today.year, m, 1)
            points.append(_bucket(MONTH_LABELS[m - 1], m_start, _month_end(m_start)))
    elif granularity == "weekly":
        w = 1
        d_start = window_start
        while d_start <= window_end:
            d_end = min(d_start + timedelta(days=6), window_end)
            points.append(_bucket(f"W{w}", d_start, d_end))
            d_start = d_end + timedelta(days=1)
            w += 1
    else:  # daily
        d = window_start
        while d <= window_end:
            points.append(_bucket(str(d.day), d, d))
            d += timedelta(days=1)

    return ForecastTimelineResponse(
        property_id=property_id,
        floor=floor,
        apt=APT_LABELS[apt_idx - 1],
        granularity=granularity,
        model=f"HDD·linear (base={HDD_BASE_TEMP_C}°C)",
        points=points,
        cutoff_label=cutoff_label,
    )
