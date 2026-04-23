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
│   ├── requirements.txt
│   ├── railway.toml
│   └── .env.example
└── frontend/
		├── src/
		│   ├── App.tsx
		│   ├── components/
		│   └── lib/
		├── package.json
		├── tailwind.config.cjs
		├── postcss.config.cjs
		├── components.json
		└── .env.example
```

## Local Setup

### 1) Backend

```bash
cd backend
python -m venv ../.venv
../.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
../.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API health check:

```bash
curl http://localhost:8000/health
```

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open: `http://localhost:5173`

## Environment Variables

### Backend (`backend/.env`)

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_TABLE` (default: `energy_readings`)
- `SUPABASE_TIME_COLUMN` (default: `reading_date`)
- `SUPABASE_ENERGY_COLUMN` (default: `energy_kwh`)
- `SUPABASE_EMISSION_COLUMN` (default: `emission_kg_co2e`)
- `FRONTEND_ORIGIN` (default: `http://localhost:5173`)

### Frontend (`frontend/.env`)

- `VITE_API_BASE_URL` (local: `http://localhost:8000`)
- `VITE_SUPABASE_URL` (optional in current UI)
- `VITE_SUPABASE_ANON_KEY` (optional in current UI)

## Supabase Table (example)

Use this SQL in Supabase SQL Editor:

```sql
create table if not exists public.energy_readings (
	id bigint generated always as identity primary key,
	reading_date date not null,
	energy_kwh numeric not null,
	emission_kg_co2e numeric not null
);

create index if not exists energy_readings_date_idx
	on public.energy_readings (reading_date);
```

If no valid Supabase config is set, backend automatically falls back to mock data.

## Deployment

### Backend on Railway

1. Create a Railway service from this repo.
2. Set root directory to `backend` (important in monorepo).
3. Add environment variables from `backend/.env.example`.
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

1. Create Supabase project/table and insert sample data.
2. Fill `backend/.env` with real Supabase values.
3. Deploy backend on Railway with root directory `backend`.
4. Set `VITE_API_BASE_URL` in Vercel to Railway URL.
5. Redeploy Vercel and test dashboard + API endpoints.

## Notes

- AI-local setup files are excluded via `.gitignore` on purpose.
- Current forecast is a baseline linear regression and can be replaced later by advanced models.

