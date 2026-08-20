<div align="center">
  <img src="frontend/public/techem-horizon-logo.png" alt="Techem Horizon" width="72" />
  <h1>Techem Horizon</h1>
  <p>Portfolio-Intelligence-Plattform fuer Immobilien-Energiedaten.</p>
</div>

---

Roh-Zaehlerdaten werden mit Live-Wetter, Geometrie und Geodaten verknuepft und
zu einer lebendigen Sicht auf jedes Gebaeude und jede Wohnung verdichtet. Ein
FastAPI-Backend besitzt alle Kennzahlen, ein React-Frontend visualisiert sie,
und Techem MCP beantwortet Fragen in natuerlicher Sprache.

## Stack

- Frontend: React 19, Vite, TypeScript, Tailwind, deck.gl, MapLibre, Recharts
- Backend: FastAPI, Pydantic, Supabase Postgres
- Daten/KI: Open-Meteo, Nominatim (OSM), OpenAI (Techem MCP)
- Deploy: Vercel (Frontend), Railway (Backend)

## Schnellstart

```bash
# Frontend
npm --prefix frontend install
npm run dev            # Vite Dev-Server (http://localhost:5173)
npm run build          # Production-Build

# Backend
cd backend && python -m venv ../.venv
../.venv/bin/pip install -r requirements.txt
../.venv/bin/uvicorn app.main:app --reload --port 8000
```

## Struktur

- `frontend/` React + Vite App (3D-Karte, Gebaeudedetails, Charts)
- `backend/` FastAPI Service, HDD-Prognose, Techem MCP
- Details in den Sub-READMEs: `frontend/README.md`, `backend/README.md`
