# Backend — Techem Horizon API

FastAPI service. Owns all the numbers: KPIs, histories, weather-driven forecasts, and the Techem MCP chatbot endpoint.

See the [main README](../README.md) for product context and the [MCP README](app/mcp/README.md) for the chatbot.

## What it does

- **Portfolio index** — properties with geometry, energy source, unit counts.
- **Annual KPIs** — kWh, €, kg CO₂ per property, cached at module level.
- **Per-apartment history** — monthly / weekly / daily vs. building average.
- **Per-apartment forecast** — HDD × linear model fit on each apartment's own history.
- **MCP chat** — `POST /api/v1/mcp/chat`, OpenAI-driven with keyword fallback.

## Forecast pipeline

```mermaid
flowchart TD
  A[forecast-timeline request] --> B[Load readings<br/>past 12 months]
  B --> C{Have readings?}
  C -- yes --> D[Aggregate daily kWh]
  C -- no --> E[Synthesize<br/>HDD × per-unit factors]
  D --> F[Open-Meteo<br/>temperatures]
  E --> F
  F --> G[HDD = max(0, 15°C − temp)]
  G --> H[OLS fit<br/>kWh = k·HDD + base]
  H --> I[Forecast temps<br/>≤16d + climatology proxy]
  I --> J[Project daily kWh]
  J --> K[Bucket monthly / weekly / daily]
```

### Key ideas

- **HDD × linear.** Heating-Degree-Days (base 15 °C) proxy heating demand. OLS fit per apartment; `k` encodes envelope + occupancy.
- **Weather sources.** Open-Meteo archive (historical), forecast (≤16 days), then same-calendar-day last year as climatology proxy.
- **Disk caches.** `weathercache.json` and `geocache.json` keep free APIs happy during demos.
- **Deterministic synthesis.** No readings → hash-seeded per-unit/room factors produce a plausible HDD-driven series that stays stable across requests.

## Data model

```mermaid
erDiagram
  properties ||--o{ units : has
  units ||--o{ rooms : has
  rooms ||--o{ readings : has
```

`properties` holds geometry (lat, lng, footprint polygon, building height, energy source). Schema in [`sql/schema.sql`](sql/schema.sql), geometry columns in [`migrations/001_add_property_geometry.sql`](migrations/001_add_property_geometry.sql).

## Services

| Module                        | Purpose                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `services/property_data.py`   | KPIs, overview, history, forecast, timeline bucketing     |
| `services/weather.py`         | Open-Meteo archive + forecast + climatology, disk-cached  |
| `services/geocoding.py`       | Nominatim with rate-limit + disk cache                    |
| `services/supabase_data.py`   | Supabase loaders                                          |
| `mcp/`                        | OpenAI-driven chatbot, see [app/mcp/README.md](app/mcp/README.md) |

## API

| Method | Path                                                                  |
| ------ | --------------------------------------------------------------------- |
| GET    | `/api/v1/properties`                                                  |
| GET    | `/api/v1/properties/stats`                                            |
| GET    | `/api/v1/properties/{id}/overview`                                    |
| GET    | `/api/v1/properties/{id}/units/{floor}/{apt}/history`                 |
| GET    | `/api/v1/properties/{id}/units/{floor}/{apt}/forecast-timeline`       |
| POST   | `/api/v1/mcp/chat`                                                    |

## Local setup

```bash
cd backend
python -m venv ../.venv
../.venv/bin/python -m pip install -r requirements.txt
../.venv/bin/uvicorn app.main:app --reload --port 8000
```

Bootstrap DB: apply `sql/schema.sql` and `migrations/001_add_property_geometry.sql` in Supabase, then `python scripts/import_techem_files.py` and `python -m scripts.seed_property_geometry`.

## Environment

```
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # import/seed only
FRONTEND_ORIGIN=http://localhost:5173
OPENAI_API_KEY=              # optional — enables LLM mode for MCP
OPENAI_MODEL=gpt-4o-mini
```

No Supabase → overview falls back to mock data. No OpenAI key → MCP falls back to keyword routing.

## Notes

- `ASSUMED_TODAY` is pinned to 2024-10-15 in `app/config.py` so winter is always in the forecast window.
- Portfolio stats are cached in-process after the first request.
