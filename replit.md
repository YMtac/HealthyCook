# SmartCook

A premium mobile web app that generates recipes from ingredients you already have in your fridge.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/smartcook run dev` — run the frontend (port 18860)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + framer-motion
- Fonts: Playfair Display (headings/wordmark) + DM Sans (body)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB schema (ingredients, recipes, shopping, favorites)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/smartcook/src/` — React frontend (single App.tsx with state-driven navigation)
- `artifacts/smartcook/src/index.css` — theme tokens (green palette, fonts)

## Architecture decisions

- All navigation is React state-based (no wouter routes) for native app-like slide transitions via framer-motion
- The API is contract-first via OpenAPI spec; Orval generates both Zod validators (server) and React Query hooks (client)
- Recipe "generation" is a backend scoring algorithm matching user ingredients against a curated recipe DB
- Shopping list items track which recipe they came from (recipeId + recipeName)
- No auth — single-user local session (ingredients, shopping list, favorites all in DB without user scoping)

## Product

- **Cook tab**: Add ingredients from your fridge → set preferences (time/difficulty/diet) → get a recipe suggestion
- **Shop tab**: View missing ingredients as a shopping list, check off items, add manual entries
- **Explore tab**: Browse/search all recipes with category filters; view trending recipes
- **Favorites**: Save recipes you love, view them in a dedicated favorites screen
- **Recipe detail**: Full ingredient list, step-by-step instructions, nutrition strip, favorite toggle

## User preferences

- Overall style: green, premium, minimal, handwritten-font accents
- Mobile-first (max-width 430px)
- No emojis in UI labels/navigation

## Gotchas

- Always run codegen after changing `lib/api-spec/openapi.yaml`
- Google Fonts `@import url(...)` must be the FIRST line in `index.css` before `@import "tailwindcss"`
- The `/recipes/trending` route must come before `/recipes/:id` in Express to avoid route collision

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
