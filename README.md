<div align="center">
  <img width="320" alt="techem-horizon" src="https://github.com/user-attachments/assets/56ffc738-94df-4e6c-8f9d-7e11941a4426" />
</div>

# Techem Horizon

>  Portfolio-intelligence platform for real-estate energy data.

<img width="1710" height="898" alt="techem2" src="https://github.com/user-attachments/assets/8f8247d1-76b2-4460-b745-30473895a468" />
<br />
<img width="1709" height="895" alt="techem1" src="https://github.com/user-attachments/assets/95850f00-406c-49ff-a68c-99ad9fb198cd" />
<br />

Raw meter readings get stitched together with live weather, geometry and geo data to produce a living view of every building and apartment — with interactive overviews![Uploading techem1.png…]()
, forecasts **Techem MCP** as the AI chatbot on top.

Three surfaces:

- **Backend** — FastAPI service that owns all numbers (KPIs, histories, weather-driven forecasts).
- **Frontend** — React + Vite app: 3D map, isometric buildings, floor plans, charts.
- **Techem MCP** — natural-language chatbot powered by OpenAI function-calling over the backend's tools.

## The idea

Techem sits on millions of building readings. Horizon shows what happens when that data meets **public context** (Open-Meteo weather, OSM geometry, Nominatim geocoding) and lands in a product a portfolio manager actually wants to open.

Three bets:

1. **Weather is the story.** Residential demand follows outside temperature. Every forecast fits `kWh = k·HDD + base` on real Open-Meteo data.
2. **Gaps are not blockers.** Missing readings? Deterministic HDD-based synthesis keeps the UX consistent.
3. **One source of truth.** Backend owns numbers. Frontend is a lens. MCP is a second lens, asked in English.

## Architecture

```mermaid
flowchart LR
  subgraph External
    OM[Open-Meteo]
    OSM[OpenStreetMap]
    MT[MapTiler]
    OAI[OpenAI]
  end
  SB[(Supabase<br/>properties · units · rooms · readings)]
  BE[FastAPI backend<br/>HDD × linear forecast]
  FE[React frontend]
  MCP[Techem MCP]

  SB --> BE --> FE
  OM --> BE
  OSM --> BE
  MT --> FE
  SB --> FE
  BE <--> MCP
  OAI <--> MCP
  MCP --> FE
```

## Features

- **Portfolio map** — 3D MapLibre with OSM footprints, heat-colored extrusions, click-to-fly.
- **KPI cards** — annual kWh, €, CO₂ per building, color-coded vs. portfolio average.
- **Building detail** — isometric building (click per apartment), 2D floor plan, room-level pie chart, comparison + forecast charts at monthly / weekly / daily.
- **Weather-driven forecast** — actual-vs-forecast timeline overlaid with building average and temperature.
- **Techem MCP chatbot** — OpenAI function-calling over live backend tools (portfolio stats, rankings, anomaly scans, full report).

## Repo

```
backend/    FastAPI + Supabase + Techem MCP
frontend/   React + Vite app
```

- [backend/](backend/README.md) — data model, HDD forecast, APIs
- [frontend/](frontend/README.md) — pages, map, charts
- [Techem MCP](backend/app/mcp/README.md) — OpenAI agent, tools, chat protocol

## Quick start

```bash
# backend
cd backend && python -m venv ../.venv
../.venv/bin/python -m pip install -r requirements.txt
../.venv/bin/uvicorn app.main:app --reload --port 8000

# frontend
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173`. Env, schema bootstrap, and deployment live in the sub-READMEs.

## Stack

React 19 · Vite · Tailwind · shadcn/ui · Recharts · deck.gl · MapLibre · FastAPI · Pydantic · Supabase Postgres · Open-Meteo · Nominatim · OpenAI · Railway · Vercel.

## Scope

This project was created during the [Futury Build Days 2026](https://www.starthub-hessen.de/de/events/futury-build-days/).  
Challenge given by [Techem](https://www.techem.com/).
