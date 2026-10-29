[HealthyCook-README.md](https://github.com/user-attachments/files/34141579/HealthyCook-README.md)
# HealthyCook

**Cook with what's already in your fridge.**

HealthyCook is a mobile-first web app that turns the ingredients you have at home into a recipe. Add what's in your fridge, set how much time and effort you want to spend, and an AI chef writes a recipe for you, complete with nutrition facts, ingredient substitutes and alternative steps. Ingredients you're missing go straight to your shopping list, and every meal you cook is logged in a calendar so you can track your nutrition and keep a cooking streak.

<img width="1062" height="804" alt="image" src="https://github.com/user-attachments/assets/45adc4d9-c145-45f9-9acf-b058eb54bfb1" />
<img width="1063" height="803" alt="image" src="https://github.com/user-attachments/assets/176759c2-0603-46ed-9614-8d375e4dfbe8" />
<img width="1049" height="799" alt="image" src="https://github.com/user-attachments/assets/5d7e8a22-f74d-4e98-a766-9a73c30a11c3" />
<img width="1185" height="786" alt="image" src="https://github.com/user-attachments/assets/d4a895be-8f95-4cf1-ba11-760f96b5142a" />
<img width="1048" height="802" alt="image" src="https://github.com/user-attachments/assets/c1a4e035-8948-4369-a4d1-219a102592a5" />

---

## Features

### Cook
- Add the ingredients you have, each with an emoji
- Set preferences: time limit, difficulty, cooking method and cuisine style
- **AI recipe generation** with GPT-4o: title, cooking time, difficulty, cuisine, nutrition per serving, ingredient amounts and step-by-step instructions
- **Ingredient substitutes**: every ingredient comes with alternatives in case something is missing
- **Alternative steps**: every step has a shortcut or variation
- Recipe photos fetched automatically from **Unsplash**
- Press **Done!** after cooking to log the meal and see a congratulations screen

### Shop
- Missing ingredients are added to the shopping list with one tap
- Each item remembers which recipe it came from
- Check items off, edit quantities or add your own items
- **Smart recommendations**: suggests ingredients that fill nutrient gaps (iron, omega-3, fiber, …) based on your favorites and cooking history

### Explore
- Browse and search the recipe collection with category filters
- Trending recipes
- Recipe collection seeded with AI-generated recipes

### Calendar
- A cooking log of every meal you made, in **week, month and year** views
- Nutrition stats (calories, protein, carbs, fat) for any period
- **Cooking streak** to keep you motivated
- Edit or delete log entries

### Favorites
- Save recipes you love and find them in one place

### Accounts
- Sign up and sign in with **Clerk**

---

## Tech stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces, TypeScript 5.9, Node.js 24 |
| Frontend | React 19, Vite, Tailwind CSS 4, framer-motion, TanStack Query, shadcn/ui components, lucide icons |
| Backend | Express 5 |
| Database | PostgreSQL with Drizzle ORM |
| API contract | OpenAPI spec → **Orval** generates Zod validators (server) and React Query hooks (client) |
| Validation | Zod, drizzle-zod |
| AI & media | OpenAI API (GPT-4o), Unsplash API |
| Auth | Clerk |
| Build | esbuild |
| Hosting | Replit |

---

## Architecture

```
HealthyCook/
├── artifacts/
│   ├── smartcook/          # React frontend (mobile-first, max width 430px)
│   └── api-server/         # Express API
│       └── src/
│           ├── routes/     # ingredients, recipes, shopping, favorites,
│           │               # recommendations, cooking-logs, health
│           └── services/   # OpenAI + Unsplash integration
├── lib/
│   ├── api-spec/           # openapi.yaml: the single source of truth for the API
│   ├── api-zod/            # generated Zod schemas
│   ├── api-client-react/   # generated React Query hooks
│   └── db/                 # Drizzle schema: ingredients, recipes, shopping,
│                           # favorites, cooking logs
└── scripts/
```

**Design decisions**

- **Contract-first API.** The OpenAPI spec defines every endpoint once. Orval generates both the server-side validators and the client-side hooks from it, so the frontend and backend can't drift apart.
- **App-like navigation.** Screens are switched with React state instead of URL routes, which allows native-feeling slide transitions with framer-motion.
- **Structured AI output.** The prompt gives GPT-4o an exact JSON example, so generated recipes can be stored and rendered like any other recipe in the database.

---

## API overview

| Endpoint | Purpose |
|---|---|
| `GET/POST/DELETE /ingredients` | Manage your fridge |
| `POST /recipes/generate` | Generate a recipe from your ingredients and preferences |
| `POST /recipes/ai-seed` | Generate and store AI recipes for Explore |
| `GET /recipes`, `/recipes/trending`, `/recipes/{id}` | Browse, trending, recipe details |
| `GET/POST/PATCH/DELETE /shopping` | Shopping list |
| `GET/POST/DELETE /favorites` | Favorites |
| `GET /recommendations` | Nutrient-based ingredient suggestions |
| `GET/POST/PATCH/DELETE /cooking-logs` | Cooking log |
| `GET /cooking-logs/streak`, `/cooking-logs/stats` | Streak and nutrition stats |

The full contract is in [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml).

---

## Getting started

> The project was built and is hosted on **Replit**. The easiest way to run it is to open the [Replit project](https://replit.com/@luoyumiao9/HealthyCook) and press **Run**.
>
> `pnpm-workspace.yaml` strips native binaries for every platform except linux-x64 (Replit's platform). To run it locally on macOS or Windows, remove those `overrides` entries first.

### Requirements

- Node.js 24 and pnpm
- A PostgreSQL database
- API keys for OpenAI, Unsplash and Clerk

### Environment variables

| Variable | Used for |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | Recipe generation |
| `UNSPLASH_ACCESS_KEY` | Recipe photos |
| `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` | Authentication |

### Commands

```bash
pnpm install

# Push the database schema (development only)
pnpm --filter @workspace/db run push

# Start the API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start the frontend
pnpm --filter @workspace/smartcook run dev
```

Other useful commands:

```bash
pnpm run typecheck                              # typecheck all packages
pnpm run build                                  # typecheck + build everything
pnpm --filter @workspace/api-spec run codegen   # regenerate hooks and schemas after editing openapi.yaml
```

---

## Project history

HealthyCook started as a university project, **SmartCook**: a React + TypeScript + Express app. It was later rebuilt and expanded with LLM-powered recipe generation, a curated recipe database, a nutrition-aware shopping recommendation engine, a cooking calendar and a custom green design system. Along the way the storage moved from SQLite to PostgreSQL so data would persist across deployments.

---

## Roadmap

- [ ] Scope ingredients, shopping lists, favorites and cooking logs to each signed-in user
- [ ] Dietary filters and allergy warnings
- [ ] Portion scaling
- [ ] Weekly meal planning
- [ ] Share recipes with friends

## Disclaimer

Nutrition values are estimates generated by AI and are not medical or dietary advice.

## License

MIT

---

Made by Luo 
