# movie-talkin — Build Plan

## Concept
A lightweight web app for coordinating movie watch parties: create rooms, invite friends, vote on movies, and sync up on a time to watch.

## Tech Stack

### Frontend (`apps/web`)
- **Vite** — build tooling
- **React 19** + **TypeScript**
- **Tailwind CSS** — utility-first styling
- **TanStack Query** — server state / data fetching
- **TanStack Router** — type-safe file-based routing

### Backend (`apps/api`)
- **Node.js** + **TypeScript**
- **Hono** — lightweight, fast, TypeScript-first HTTP framework
- **Drizzle ORM** — TypeScript-native ORM, schema-as-code
- **better-sqlite3** — SQLite driver (zero-cost, file-based DB)

### Shared (`packages/shared`)
- Shared TypeScript types and Zod schemas used by both apps

### Monorepo Tooling
- **pnpm workspaces**
- **TypeScript project references**
- **tsx** for running TS in dev without a separate compile step

## Project Structure

```
movie-talkin/
├── apps/
│   ├── web/                  # React frontend
│   │   ├── src/
│   │   │   ├── routes/       # TanStack Router pages
│   │   │   ├── components/
│   │   │   ├── lib/          # API client, query hooks
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── api/                  # Hono backend
│       ├── src/
│       │   ├── routes/       # Hono route handlers
│       │   ├── db/           # Drizzle schema + migrations
│       │   └── index.ts
│       └── package.json
├── packages/
│   └── shared/               # Shared types & Zod schemas
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── pnpm-workspace.yaml
├── package.json              # Root — scripts only
└── tsconfig.base.json
```

## Deployment Targets

| Layer | Service | Cost |
|-------|---------|------|
| Frontend | Vercel or Cloudflare Pages | Free |
| API + DB | Railway or Fly.io | Free tier / ~$5/mo |
| SQLite file | Colocated on API server | Included |

> When ready for multi-region or higher availability, swap `better-sqlite3` for **Turso** (libSQL) — Drizzle supports it with no query changes.
