# Frontend (Techem)

React + TypeScript + Vite frontend for portfolio analytics, property comparison, forecasting visuals, and map-based exploration.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Run

```bash
npm run dev
```

Default URL: `http://localhost:5173`

## Scripts

- `npm run dev` - start development server
- `npm run build` - type-check and build production bundle
- `npm run preview` - preview built app
- `npm run lint` - run ESLint
- `npm run shadcn:add` - add shadcn UI components

## Data Sources

- Metrics and forecast data are loaded from the FastAPI backend via `VITE_API_BASE_URL`.
- Properties are loaded directly from Supabase using the client in `src/lib/supabase.ts`.
- If property geometry columns are missing in Supabase, the app falls back to a baseline property query without geometry fields.

## Build/Deploy

This frontend is configured for Vercel (`vercel.json`).

Required Vercel env vars:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
