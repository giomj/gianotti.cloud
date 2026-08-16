# Superposition Notes

A quantum computing learning blog with a VS Code-like in-browser authoring studio, doubling as the public face of the author's consulting firm.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/quantum-blog/` — React frontend: `/` (public home), `/posts/:slug` (reading page), `/studio` (Monaco-based authoring workspace)
- `artifacts/api-server/src/routes/posts.ts` — posts CRUD, `/stats`, `/tags`
- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/posts.ts` — posts table (Drizzle)
- `artifacts/quantum-blog/src/index.css` — theme (paper off-white / lapis blue; Fraunces, Plus Jakarta Sans, Space Mono)

## Architecture decisions

- `readingMinutes` is computed server-side from content word count (200 wpm), not stored
- Posts carry a virtual `folder` field used only to build the Studio file tree
- Publishing sets `publishedAt`; reverting to draft clears it; `/posts/by-slug/:slug` only serves published posts
- OpenAPI spec uses `type: number` (not `integer`) — Orval's zod client emits `zod.int()` which the installed zod v3 classic import lacks

## Product

- Public blog home with consulting firm branding, stats, and published post list
- Post pages render markdown with syntax-highlighted code, LaTeX math (KaTeX), copy buttons, and per-post title/OG meta tags
- Studio: VS Code-style workspace — file tree grouped by folder, tabs with dirty indicators, Monaco editor, live side-by-side preview, draft/publish/delete flows

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
