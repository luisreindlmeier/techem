import json
import time
from pathlib import Path

import httpx

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
_USER_AGENT = "techem-energy-analytics/1.0 (reindlmeierluis@icloud.com)"
_CACHE_FILE = Path(__file__).parent.parent.parent / "geocache.json"
_RATE_LIMIT_SECONDS = 1.1

_cache: dict[str, tuple[float, float] | None] = {}
_last_request_time: float = 0.0


def _load_cache() -> None:
    if _CACHE_FILE.exists():
        try:
            data = json.loads(_CACHE_FILE.read_text())
            for key, val in data.items():
                _cache[key] = tuple(val) if val is not None else None  # type: ignore[assignment]
        except (json.JSONDecodeError, TypeError):
            pass


def _save_cache() -> None:
    _CACHE_FILE.write_text(json.dumps(_cache, indent=2))


def _normalize_zipcode(zipcode: str) -> str:
    # German postal codes are always 5 digits; pad if DB stored without leading zero
    stripped = zipcode.strip()
    return stripped.zfill(5) if stripped.isdigit() else stripped


def _fetch_coordinates(zipcode: str, city: str) -> tuple[float, float] | None:
    global _last_request_time

    elapsed = time.monotonic() - _last_request_time
    if elapsed < _RATE_LIMIT_SECONDS:
        time.sleep(_RATE_LIMIT_SECONDS - elapsed)

    normalized = _normalize_zipcode(zipcode)
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                _NOMINATIM_URL,
                params={"q": f"{normalized} {city} Germany", "format": "json", "limit": 1},
                headers={"User-Agent": _USER_AGENT},
            )
        _last_request_time = time.monotonic()
        results = response.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception:
        pass

    return None


def geocode(zipcode: str, city: str) -> tuple[float, float] | None:
    if not _cache:
        _load_cache()

    key = f"{zipcode}|{city}"
    if key in _cache:
        return _cache[key]

    coords = _fetch_coordinates(zipcode, city)
    _cache[key] = coords
    _save_cache()
    return coords
