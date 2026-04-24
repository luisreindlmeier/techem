# Frontend — Techem Horizon

React + Vite app. Portfolio map, isometric building explorer, apartment-level charts, and the Techem MCP chat surface.

See the [main README](../README.md) for product context and the [backend README](../backend/README.md) for the API.

## Screenshot

<!-- TODO: drop a hero screenshot here -->
![App preview](./docs/screenshot-placeholder.png)

## What's inside

- **Portfolio page** — property list with KPI cards + 3D MapLibre map (OSM footprints, heat-colored extrusions).
- **Building detail** — isometric cutaway (click an apartment), 2D floor plan per unit, room-level pie, comparison + forecast charts at monthly/weekly/daily granularity.
- **MCP chat** — natural-language portfolio access; answers render as stats, lists, cards, or a full sidebar report.

## Stack

React 19 · Vite · TypeScript · Tailwind · shadcn/ui · Recharts · MapLibre GL · deck.gl · Heroicons · self-hosted Geist.

## Design

- Green = better than portfolio average, orange/red = worse — intensity scales with deviation. Applied across pies, floor plans, forecast backgrounds, KPI cards via [`lib/chartColors.ts`](src/lib/chartColors.ts).
- Black / white / Techem red (`#E30613`). `rounded-md` everywhere. Heroicons only.
- Layout constants (`UNITS_PER_FLOOR`, apt labels) live in [`lib/layoutConfig.ts`](src/lib/layoutConfig.ts) and must stay in sync with `backend/app/config.py`.

## Data

- `lib/api.ts` wraps the FastAPI backend (stats, history, forecast, MCP chat).
- `getProperties` hits Supabase directly for portfolio metadata.
- `lib/propertyStats.tsx` memoizes portfolio-wide stats across pages.

## Local setup

```bash
cd frontend && npm install && npm run dev
```

## Environment

```
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MAPTILER_KEY=   # optional — Carto Positron fallback otherwise
```

## Scripts

`dev` · `build` · `preview` · `lint` · `shadcn:add`.

## Deploy

Vercel, project root `frontend`, output `dist`. Set `VITE_API_BASE_URL` to the backend URL.
