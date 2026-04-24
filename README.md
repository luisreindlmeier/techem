# Techem Hackathon Case

Full-stack prototype for energy and emission analysis and forecasting.

## Tech Stack

- Frontend: React + Tailwind + Recharts/D3 (Vite)
- Backend: FastAPI (Python) for analytics/forecast API
- Database: Supabase (Postgres)
- Backend deploy target: Railway
- Frontend deploy target: Vercel

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── schemas.py
│   │   └── services/
│   │       ├── forecast.py
│   │       ├── mock_data.py
│   │       └── supabase_data.py
│   ├── scripts/
│   │   └── import_techem_files.py
│   ├── sql/
│   │   └── schema.sql
│   ├── requirements.txt
│   ├── railway.toml
│   └── .env
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   └── lib/
    ├── package.json
    ├── tailwind.config.cjs
    ├── postcss.config.cjs
    ├── components.json
    └── .env
```

## Local Setup

### 1) Backend

```bash
cd backend
python -m venv ../.venv
../.venv/bin/python -m pip install -r requirements.txt
../.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API health check:

```bash
curl http://localhost:8000/health
```

Import all CSV files into Supabase (requires `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`):

```bash
cd backend
../.venv/bin/python scripts/import_techem_files.py
```

If you want the UI to point at the local backend, open `http://localhost:5173` after starting the frontend.

## Environment Variables

### Backend (`backend/.env`)

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for CSV uploads
- `SUPABASE_RAW_TABLE` (default: `property_readings`)
- `SUPABASE_SUMMARY_TABLE` (default: `daily_property_metrics`)
- `SUPABASE_TABLE` (default: `daily_property_metrics`)
- `SUPABASE_TIME_COLUMN` (default: `reading_date`)
- `SUPABASE_ENERGY_COLUMN` (default: `total_energy_kwh`)
- `SUPABASE_EMISSION_COLUMN` (default: `total_emission_kg_co2e`)
- `FRONTEND_ORIGIN` (default: `http://localhost:5173`)

### Frontend (`frontend/.env`)

- `VITE_API_BASE_URL` (local: `http://localhost:8000`)
- `VITE_SUPABASE_URL` (optional in current UI)
- `VITE_SUPABASE_ANON_KEY` (optional in current UI)

The local env files are committed to the workspace only as long as they remain ignored by `.gitignore`.

## Supabase Schema

Use the SQL in `backend/sql/schema.sql` to create the raw import table and the daily summary table in Supabase.

```sql
create table if not exists public.property_readings (
    id bigint generated always as identity primary key,
    property_id integer not null,
    source_file text not null,
    reading_date date not null,
    zipcode text not null,
    energysource text not null,
    city text not null,
    energyusage_kwh numeric not null,
    livingspace_m2 numeric not null,
    mean_outside_temperature_c numeric not null,
    roomnumber integer not null,
    emission_factor_g_kwh numeric not null,
    unitnumber integer not null,
    created_at timestamptz not null default now()
);

create table if not exists public.daily_property_metrics (
    reading_date date primary key,
    total_energy_kwh numeric not null,
    total_emission_kg_co2e numeric not null,
    property_count integer not null,
    updated_at timestamptz not null default now()
);
```

If no valid Supabase config is set, backend automatically falls back to mock data.

## Deployment

### Backend on Railway

1. Create a Railway service from this repo.
2. Set root directory to `backend` (important in monorepo).
3. Add environment variables from `backend/.env` and the Supabase dashboard.
4. Deploy. Railway uses `railway.toml` and starts uvicorn.
5. Copy deployed API URL, for example: `https://techem-api.up.railway.app`

### Frontend on Vercel

1. In Vercel, set project root to `frontend`.
2. Build command: `npm run build` (default should work).
3. Output directory: `dist`.
4. Add env var `VITE_API_BASE_URL=<YOUR_RAILWAY_API_URL>`.
5. Redeploy frontend.

## shadcn MCP

Root `.mcp.json` is configured for shadcn MCP.

Manual MCP initialization command (if needed):

```bash
npx shadcn@latest mcp init --client claude
```

Frontend is prepared for shadcn usage (`components.json`, path alias `@/*`, script `npm run shadcn:add`).

## What You Need To Do

1. Create the `property_readings` and `daily_property_metrics` tables in Supabase using `backend/sql/schema.sql`.
2. Preferably add your real `SUPABASE_SERVICE_ROLE_KEY` to `backend/.env`.
3. Run `../.venv/bin/python scripts/import_techem_files.py` from `backend/` to upload all CSVs.
4. Deploy backend on Railway with root directory `backend`.
5. Set `VITE_API_BASE_URL` in Vercel to the Railway URL and redeploy the frontend.

## Notes

- AI-local setup files are excluded via `.gitignore` on purpose.
- Current forecast is a baseline linear regression and can be replaced later by advanced models.

