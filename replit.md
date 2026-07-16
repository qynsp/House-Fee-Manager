# Telegram Bingo Web App

A real-time multiplayer Bingo game built as a Telegram Mini App. Players buy tickets, watch numbers drawn live via WebSockets, claim BINGO to win the prize pool. The house takes a configurable fee (default 30%) before prizes are distributed.

## Run & Operate

- `pnpm --filter @workspace/bingo-app run dev` — run the frontend (auto-started)
- `pnpm --filter @workspace/api-server run dev` — run the API server (auto-started)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, Framer Motion, socket.io-client, canvas-confetti, wouter
- API: Express 5 + Socket.io (real-time game events)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (users, games, tickets, deposits, withdrawals, house_settings, announcements)
- `artifacts/api-server/src/routes/` — route handlers (auth, users, games, tickets, deposits, withdrawals, leaderboard, settings, announcements, dashboard)
- `artifacts/api-server/src/lib/bingo.ts` — card generation & win pattern validation
- `artifacts/api-server/src/lib/game-engine.ts` — auto-starts games when min players reached, auto-draws numbers
- `artifacts/api-server/src/lib/socket.ts` — Socket.io setup (path: `/api/socket.io`)
- `artifacts/bingo-app/src/` — React frontend

## Architecture decisions

- **House economy**: `houseFeePct` stored in `house_settings` table (default 30%). Prize pool = totalPot × (1 - houseFeePct/100). Editable by admin via `/admin/settings`.
- **Real-time**: Socket.io mounted under `/api/socket.io`. Events: `numberDrawn`, `gameUpdate`, `bingoWinner`, `gameStarted`, `gameFinished`, `playerJoined`.
- **Auth**: JWT stored in localStorage (`bingoToken`). Admin auth via password (`ADMIN_PASSWORD` env, default: `bingo_admin_2024`). Telegram auth parses `initData`.
- **Game engine**: Polls every 30s for waiting games with enough players, then auto-starts and draws numbers at `drawIntervalMs` interval.
- **Bingo validation**: Server-side only — checks all 6 win patterns (horizontal, vertical, diagonal, four corners, X, full house).

## Product

- **Lobby** (`/`): shows current waiting game, ticket price, player count, buy ticket CTA
- **Live Game** (`/game/:id`): 5×5 bingo card, drawn number animation, BINGO claim button
- **Wallet** (`/wallet`): balance, Telebirr deposit flow (screenshot + transaction ID), withdrawal requests
- **Tickets** (`/tickets`): history of purchased tickets
- **Leaderboard** (`/leaderboard`): top players by total winnings
- **Admin Dashboard** (`/admin`): Total Revenue, House Earnings, Prize Pool, Daily/Weekly/Monthly Profit, Tickets Sold, Avg Players, Pending actions
- **Admin Settings** (`/admin/settings`): edit house fee %, ticket price, draw interval, countdown, min/max players, Telebirr number

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After OpenAPI spec changes: always run `pnpm --filter @workspace/api-spec run codegen` then `pnpm run typecheck:libs`
- Socket.io path is `/api/socket.io` (not `/socket.io`) because the proxy strips the `/api` prefix
- Admin password is set via `ADMIN_PASSWORD` env var (default: `bingo_admin_2024`)
- The game engine auto-creates a waiting game on server start via `startGameEngine()`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
