from datetime import date

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_url: str | None = None
    supabase_key: str | None = None
    supabase_table: str = "daily_property_metrics"
    supabase_time_column: str = "reading_date"
    supabase_energy_column: str = "total_energy_kwh"
    supabase_emission_column: str = "total_emission_kg_co2e"
    frontend_origin: str = "http://localhost:5173"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"


settings = Settings()


# ---------------------------------------------------------------------------
# Demo calendar: "today" is fixed to mid-October so that Nov/Dec is always in
# the forecast window regardless of wall-clock time. Per user request.
# ---------------------------------------------------------------------------
ASSUMED_TODAY: date = date(2024, 10, 15)

# Heating-degree-day base temperature (typical German benchmark).
HDD_BASE_TEMP_C: float = 15.0

# Average retail energy price per kWh (EUR) by energy source. Sourced from
# BDEW/Destatis H2 2024 averages for private households in Germany.
COST_PER_KWH_EUR: dict[str, float] = {
    "Natural Gas":      0.128,
    "District Heating": 0.151,
    "Heat Pump":        0.330,
    "Heating Oil":      0.114,
    "Pellets":          0.087,
}
DEFAULT_COST_PER_KWH_EUR: float = 0.150

# Fallback emission factor when the property has none stored (kg CO₂e per kWh).
DEFAULT_EMISSION_FACTOR_KG_PER_KWH: float = 0.201

# Layout template for portfolio properties.
# Intentionally fixed per product spec — FloorPlanView geometry depends on it.
# Keep in sync with frontend/src/lib/layoutConfig.ts.
UNITS_PER_FLOOR: int = 4
APT_LABELS: tuple[str, ...] = ("A", "B", "C", "D")

# Room templates (label + min/max sqm) used for the floor plan breakdown.
# Only used when no real DB rooms exist for a unit — synthesis fallback.
ROOM_TEMPLATES: tuple[dict, ...] = (
    {"name": "Living",  "sqm_min": 18.0, "sqm_max": 32.0, "weight": 0.40},
    {"name": "Kitchen", "sqm_min":  8.0, "sqm_max": 14.0, "weight": 0.20},
    {"name": "Bedroom", "sqm_min": 12.0, "sqm_max": 20.0, "weight": 0.25},
    {"name": "Bath",    "sqm_min":  4.0, "sqm_max":  8.0, "weight": 0.15},
)

# Positional room labels applied when real DB rooms are loaded per unit.
# Units can have 1..15 rooms in the dataset — labels are assigned by index
# (sorted room number order) so each position has a stable, readable name.
ROOM_LABELS: tuple[str, ...] = (
    "Bedroom",
    "Kitchen",
    "Living Room",
    "2nd Bedroom",
    "Bathroom",
    "Office",
    "Dining Room",
    "Guest Room",
    "3rd Bedroom",
    "Hallway",
    "Storage",
    "Utility Room",
    "Pantry",
    "Walk-in Closet",
    "Balcony",
)

# Open-Meteo's free forecast API caps at 16 days. Requests beyond this window
# fall back to the same calendar dates from the previous year (climatology).
WEATHER_FORECAST_WINDOW_DAYS: int = 16

# Energy synthesis model — used when a property has no real readings. HDD-based
# with deterministic per-unit/room variance. Physical interpretation:
#   heating  = hdd × HEATING_COEFFICIENT × per-unit × per-room × (sqm / REFERENCE_ROOM_SQM)
#   base     = DAILY_BASE_LOAD_KWH × per-unit × per-room   (hot water + standby)
SYNTHESIS_CONFIG: dict[str, float] = {
    "unit_factor_min":     0.85,  # per-apartment variance band
    "unit_factor_max":     1.25,
    "room_factor_min":     0.80,  # per-room variance band
    "room_factor_max":     1.20,
    "heating_coefficient": 0.35,  # kWh per HDD-degree, normalized
    "reference_room_sqm":  20.0,  # sqm baseline for heating scaling
    "daily_base_load_kwh": 0.9,   # hot water + standby, kWh/day
}
