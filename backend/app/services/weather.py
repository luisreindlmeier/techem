"""Weather data via Open-Meteo (free, no API key required).

Provides:
  - Historical daily mean temperatures (ERA5 archive, accurate back to 1940)
  - Short-term forecast (up to 16 days)
  - Heating-degree-day (HDD) computation for a given base temperature

Results are cached on disk to avoid hammering the public API during repeated
calls (rate-limited to ~10k requests/day shared pool).
"""
from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

import httpx

from app.config import WEATHER_FORECAST_WINDOW_DAYS

_ARCHIVE_URL  = "https://archive-api.open-meteo.com/v1/archive"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
_CACHE_FILE   = Path(__file__).parent.parent.parent / "weathercache.json"
_HTTP_TIMEOUT = 20.0

_cache: dict[str, dict[str, float]] = {}
_loaded = False


def _load_cache() -> None:
    global _loaded
    if _loaded:
        return
    if _CACHE_FILE.exists():
        try:
            _cache.update(json.loads(_CACHE_FILE.read_text()))
        except (json.JSONDecodeError, OSError):
            pass
    _loaded = True


def _save_cache() -> None:
    try:
        _CACHE_FILE.write_text(json.dumps(_cache))
    except OSError:
        pass


def _cache_key(lat: float, lng: float) -> str:
    return f"{round(lat, 3)}|{round(lng, 3)}"


def _fetch_archive(lat: float, lng: float, start: date, end: date) -> dict[str, float]:
    """Fetch daily mean temperatures from Open-Meteo archive. Returns { 'YYYY-MM-DD': degC }."""
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            response = client.get(
                _ARCHIVE_URL,
                params={
                    "latitude":   lat,
                    "longitude":  lng,
                    "start_date": start.isoformat(),
                    "end_date":   end.isoformat(),
                    "daily":      "temperature_2m_mean",
                    "timezone":   "Europe/Berlin",
                },
            )
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError):
        return {}

    daily = data.get("daily") or {}
    dates = daily.get("time") or []
    temps = daily.get("temperature_2m_mean") or []
    return {d: float(t) for d, t in zip(dates, temps) if t is not None}


def _fetch_forecast(lat: float, lng: float, days: int) -> dict[str, float]:
    """Fetch forecast daily mean temperatures. Capped at WEATHER_FORECAST_WINDOW_DAYS."""
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            response = client.get(
                _FORECAST_URL,
                params={
                    "latitude":      lat,
                    "longitude":     lng,
                    "daily":         "temperature_2m_mean",
                    "forecast_days": min(days, WEATHER_FORECAST_WINDOW_DAYS),
                    "timezone":      "Europe/Berlin",
                },
            )
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError):
        return {}

    daily = data.get("daily") or {}
    dates = daily.get("time") or []
    temps = daily.get("temperature_2m_mean") or []
    return {d: float(t) for d, t in zip(dates, temps) if t is not None}


def get_daily_temps(lat: float, lng: float, start: date, end: date) -> dict[str, float]:
    """Daily mean temperatures from start..end inclusive.

    Uses archive for past dates and forecast for the next ~16 days. For dates
    beyond the forecast window, falls back to the same calendar date from the
    previous year (climatological proxy).
    """
    _load_cache()
    key   = _cache_key(lat, lng)
    cache = _cache.setdefault(key, {})

    missing = [d for d in _daterange(start, end) if d.isoformat() not in cache]
    if not missing:
        return {d.isoformat(): cache[d.isoformat()] for d in _daterange(start, end)}

    today  = date.today()
    past   = [d for d in missing if d <= today]
    future = [d for d in missing if d > today]

    if past:
        archive = _fetch_archive(lat, lng, past[0], past[-1])
        cache.update(archive)

    if future:
        in_window  = [d for d in future if (d - today).days <= WEATHER_FORECAST_WINDOW_DAYS]
        beyond     = [d for d in future if (d - today).days > WEATHER_FORECAST_WINDOW_DAYS]

        if in_window:
            forecast = _fetch_forecast(lat, lng, (in_window[-1] - today).days)
            cache.update(forecast)

        if beyond:
            # climatological fallback: pull the same calendar day from last year
            proxy_start = beyond[0]  - timedelta(days=365)
            proxy_end   = beyond[-1] - timedelta(days=365)
            proxy = _fetch_archive(lat, lng, proxy_start, proxy_end)
            for d in beyond:
                proxy_key = (d - timedelta(days=365)).isoformat()
                if proxy_key in proxy:
                    cache[d.isoformat()] = proxy[proxy_key]

    _save_cache()
    return {d.isoformat(): cache[d.isoformat()] for d in _daterange(start, end) if d.isoformat() in cache}


def heating_degree_days(
    temps: dict[str, float],
    base_temp_c: float = 15.0,
) -> dict[str, float]:
    """Compute HDD per day: max(0, base - temp). HDD drives heating energy demand."""
    return {d: max(0.0, base_temp_c - t) for d, t in temps.items()}


def _daterange(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)
