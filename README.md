# TokenTrade

TokenTrade is a working real-time crypto trading simulator with a live Next.js frontend, GraphQL backend, Redis-backed order worker, PostgreSQL persistence, and Binance market data.

## Live App

| Service | URL | Status |
|---|---|---|
| Frontend | https://tread-production-bc15.up.railway.app | Live |
| Backend GraphQL | https://backend-production-3360f.up.railway.app/graphql | Live |

The production app is deployed on Railway. The frontend serves the trading interface, while the backend exposes GraphQL over HTTP and WebSocket transports.

## What Works

- Google login and app authentication
- Live BTCUSDT trading dashboard
- Real-time price, orderbook, and recent trade updates
- Market and limit order placement
- Async order matching through a dedicated worker
- Portfolio, balance, position, and trade tracking
- Profile and performance analytics views
- Chart drawing export/download from the dashboard

## Product Overview

TokenTrade gives users a simulated crypto trading account with virtual balance and live market data. Users can sign in, watch the BTCUSDT market, place buy or sell orders, and see order fills reflected in their portfolio.

The app is built as a production-style full-stack system:

- The frontend is a Next.js app in `frontend2/`.
- The backend is an Express and Apollo GraphQL service in `backend/`.
- The worker consumes Redis order jobs and fills orders independently from the API server.
- PostgreSQL stores users, orders, trades, positions, notifications, and transactions.
- Redis powers the order queue, market price cache, and order-update pub/sub.

## Architecture

```text
Next.js frontend
  |
  | GraphQL HTTP + GraphQL WebSocket
  v
Express / Apollo backend
  |
  | Prisma
  v
PostgreSQL

Backend market service <-> Binance live streams
Backend + worker      <-> Redis queue/pubsub/cache
Worker                -> fills queued orders and publishes updates
```

## Railway Deployment

This repository contains multiple deployable services. Railway uses the root commands in `package.json` and `railway.json`, and the root command script chooses the correct build/start behavior based on `RAILWAY_SERVICE_NAME`.

| Railway service | Source | Build behavior | Start behavior |
|---|---|---|---|
| `tread` | `frontend2/` | Next.js build | Next.js production server |
| `backend` | `backend/` | TypeScript backend build | GraphQL API server |
| `worker` | `backend/` | TypeScript backend build | Match engine worker |
| PostgreSQL | Railway plugin | Managed database | Managed by Railway |
| Redis | Railway plugin | Managed cache/queue | Managed by Railway |

This keeps future pushes deploying the right service instead of accidentally building the repo root as if it were a single Next.js app.

## Main Features

### Trading Dashboard

- Live BTCUSDT price ticker
- Candlestick chart
- Buy and sell order form
- Orderbook panel
- Recent trades feed
- Open order updates
- Portfolio and PnL panels

### Order Matching

Orders are created through GraphQL and pushed to a Redis queue. The worker consumes the queue, checks current market price, fills eligible orders, updates balances and positions in PostgreSQL, then publishes user-scoped order updates through Redis pub/sub.

### Real-Time Data

The backend streams Binance market data, stores the latest price in Redis, and broadcasts market updates to the frontend. Order updates use GraphQL subscriptions so each user only receives their own fills.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React, Tailwind CSS |
| State | Redux Toolkit, Apollo Client |
| Charts | Chart.js, react-chartjs-2 |
| Backend | Express, Apollo Server, Pothos GraphQL |
| Database | PostgreSQL, Prisma |
| Queue/cache/pubsub | Redis, ioredis |
| Realtime | Socket.io, graphql-ws |
| Auth | JWT, Google login |
| Deployment | Railway |

## Repository Structure

```text
backend/
  prisma/                 Database schema and migrations
  src/server.ts           Backend entry point
  src/graphql/            GraphQL schema, resolvers, subscriptions
  src/services/           Redis, Socket.io, Binance services
  src/workers/            Match engine worker

frontend2/
  app/                    Next.js App Router pages
  components/             Trading UI, auth, dashboard, profile
  features/               Redux slices
  services/               Apollo, socket, API helpers
  tests/                  Focused regression tests

scripts/
  railway-service-command.mjs
```

## Useful Commands

From the repo root:

```bash
npm run build
npm run railway:start
```

Frontend:

```bash
npm --prefix frontend2 run build
npm --prefix frontend2 run dev
npm --prefix frontend2 test
```

Backend:

```bash
npm --prefix backend run build
npm --prefix backend run dev
npm --prefix backend run worker
```

## Deployment Notes

- Frontend production URL: `https://tread-production-bc15.up.railway.app`
- Backend GraphQL URL: `https://backend-production-3360f.up.railway.app/graphql`
- The worker is not an HTTP service, so it should not use an HTTP healthcheck.
- Railway service routing depends on `RAILWAY_SERVICE_NAME`; keep service names aligned with `tread`, `backend`, and `worker`.
