# Frontend — Techem Energy Intelligence

React + Vite app that turns the backend's numbers into a product you actually want to open. Portfolio map, isometric building explorer, apartment-level charts, and a natural-language MCP surface — all on the same design system.

## Screenshot

<!-- TODO: drop a hero screenshot here -->
![App preview](./docs/screenshot-placeholder.png)

## What's inside

- **Portfolio page** — live property list with KPI cards, plus a 3D MapLibre map with OSM footprints and click-to-fly interaction.
- **Building detail page** — isometric building (click an apartment), 2D floor plan per unit, pie chart of room-level energy, and comparison + forecast charts at monthly/weekly/daily granularity.
- **MCP chat** — ask the portfolio in English. Answers render as stat grids, lists, or a full sidebar report.

## Stack

| Concern        | Choice                                         |
| -------------- | ---------------------------------------------- |
| Framework      | React 19 + Vite + TypeScript                   |
| Styling        | Tailwind CSS + shadcn/ui primitives            |
| Charts         | Recharts (line, bar, pie) + custom SVG for isometric |
| Map            | MapLibre GL + deck.gl (extrusions)             |
| Basemap tiles  | MapTiler (optional) with Carto Positron as fallback |
| Icons / Font   | Heroicons + self-hosted Geist variable font    |
| Data access    | Direct Supabase client (`getProperties`) + FastAPI for stats/history/forecast |

## Page & component map

```
App.tsx
├── SidebarNav            left rail, Portfolio / Analytics / MCP
├── SiteHeader            search with live building suggestions
└── <main>
    ├── PortfolioPage
    │   ├── PropertyList      KPI cards per building
    │   └── MapSidebar        3D map, flies to selected property
    ├── BuildingDetailPage    (entered via card or map click)
    │   ├── IsometricBuilding interactive cutaway
    │   ├── FloorPlanView     2D per-unit plan with heat colors
    │   ├── ComparisonChart   monthly/weekly/daily vs building avg
    │   └── ForecastChart     actual + forecast + temperature
    └── McpPage
        └── McpSidebar        full portfolio intelligence report
```

## Key design decisions

- **Color scheme is a signal, not a choice.** Green = beating the portfolio average, orange/red = worse. Intensity scales with distance from the mean. Applied consistently across pie charts, floor plans, forecast backgrounds, and KPI cards via `lib/chartColors.ts`.
- **Primary property lock.** `lib/primaryProperty.ts` resolves one "home" building for the search bar so the user always has somewhere to land.
- **Shared layout config.** `UNITS_PER_FLOOR` and apartment labels come from `lib/layoutConfig.ts` and must stay in sync with `backend/app/config.py`. The floor plan geometry depends on it.
- **Thin data layer.** `lib/api.ts` wraps every backend call; `lib/propertyStats.tsx` is a Context provider that memoizes the portfolio-wide stats for cards and comparisons.
- **Dual data sources.** `getProperties` hits Supabase directly for portfolio metadata; everything else goes through the FastAPI backend.

## Design system

- **Contrast-heavy.** Black text on white, one accent (`#E30613` Techem red). No transparent accent variants on interactive states — solid red or nothing.
- **Light rounding only.** `rounded-md` on cards, buttons, inputs, pills. Nothing more.
- **Geist everywhere.** Self-hosted variable font in `public/fonts/`, wired via `@font-face` and exposed as `--font-geist`. Tailwind's `font-sans` is overridden.
- **Heroicons only.** One consistent icon family.

## Local setup

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Environment

```
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MAPTILER_KEY=                # optional — Carto fallback otherwise
```

## Scripts

| Command              | What it does                                |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Vite dev server                             |
| `npm run build`      | Type-check + production build to `dist/`    |
| `npm run preview`    | Preview the production build                |
| `npm run lint`       | ESLint                                      |
| `npm run shadcn:add` | Add a shadcn/ui component via the MCP       |

## Deploy

Vercel — project root `frontend`, build `npm run build`, output `dist`. Set `VITE_API_BASE_URL` to the Railway URL and redeploy.

## See also

- [Main README](../README.md) — project overview, architecture diagram
- [Backend README](../backend/README.md) — API contract, data model, forecast model
- [MCP README](../backend/app/mcp/README.md) — chat protocol, rendered response shape
