# TokenTrade — Crypto Trading Simulator

A full-stack real-time cryptocurrency trading simulator built with PostgreSQL, GraphQL, and live Binance market data. Users can place market and limit orders, watch live price feeds, and receive instant order-fill notifications through WebSocket subscriptions.

---

## Table of Contents

- [System Overview](#system-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Backend](#backend)
- [Frontend (frontend2)](#frontend-frontend2)
- [Data Flow](#data-flow)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Next.js)                   │
│  Apollo Client (GraphQL)   +   Socket.io Client         │
│  HTTP queries/mutations        Real-time market data     │
│  WS subscriptions (orders)     price/orderbook/trades   │
└────────────┬───────────────────────────┬────────────────┘
             │ GraphQL (HTTP + WS)       │ Socket.io
             ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                    │
│                                                         │
│  Apollo Server 5  ←→  Pothos (code-first schema)        │
│  graphql-ws  (subscription WS server)                   │
│  Socket.io   (market data broadcast)                    │
│                                                         │
│  JWT auth middleware in GraphQL context                 │
└────────┬──────────────┬──────────────┬──────────────────┘
         │              │              │
         ▼              ▼              ▼
   PostgreSQL        Redis          Binance
   (Prisma v7)   (queue+pubsub)  (live streams)
         ▲              │
         │              ▼
┌─────────────────────────────┐
│     Match Engine (Worker)   │
│   Reads order_queue (Redis) │
│   Fills orders in Prisma    │
│   Publishes to Redis pubsub │
└─────────────────────────────┘
```

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| HTTP Framework | Express 4 |
| GraphQL Server | Apollo Server 5 |
| Schema Builder | Pothos (code-first, type-safe) |
| ORM | Prisma v7 with `@prisma/adapter-pg` |
| Database | PostgreSQL |
| Subscriptions | graphql-ws 6 |
| Real-time Broadcast | Socket.io 4 |
| Pub/Sub | graphql-redis-subscriptions + ioredis |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Market Data | Binance WebSocket streams + REST fallback |
| Queue | Redis List (BLPOP/LPUSH) |

### Frontend (frontend2)
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| GraphQL Client | Apollo Client 4 |
| WS Subscriptions | graphql-ws 6 |
| State Management | Redux Toolkit 2 |
| Real-time Market | Socket.io Client 4 |
| Charts | Chart.js + react-chartjs-2 |
| Styling | Tailwind CSS 4 |

---

## Architecture

### Request Routing

The backend exposes two transports on the same port (5000):

- **HTTP** — Express handles REST (none) and Apollo GraphQL at `/graphql`
- **WebSocket** — Two WS upgrades on the same server:
  - `graphql-ws` at `/graphql` for GraphQL subscriptions
  - `socket.io` for market data streaming

Apollo's `expressMiddleware` handles HTTP queries and mutations. `graphql-ws` uses `useServer()` on the raw Node.js `http.Server` to intercept WS upgrades at the same path.

### Authentication Flow

```
Client sends:  Authorization: Bearer <JWT>
               (HTTP header or WS connectionParams)
                        │
                        ▼
              context() middleware in Apollo
                        │
              jwt.verify(token, JWT_SECRET)
                        │
              ctx.user = { id, email, role }
                        │
              Resolvers check ctx.user
```

JWT tokens are issued on login/signup, expire in 7 days, and carry `{ id, email, role }`. The same verification runs for both HTTP and WebSocket connections.

### Order Processing (Async Match Engine)

Orders are not filled synchronously. Placing an order returns immediately with status `OPEN`; actual fill logic runs in a separate worker process:

```
placeOrder mutation
      │
      ▼
Write Order(status=OPEN) to PostgreSQL
      │
      ▼
LPUSH { orderId, userId } → Redis "order_queue"
      │
      ▼ (separate process)
Match Engine: BLPOP from "order_queue"
      │
      ├── Fetch order, user, position from DB
      ├── Fetch current price from Redis "market:btc:price"
      ├── Check fill condition (MARKET=always, LIMIT=price check)
      │
      └── On fill: Prisma $transaction {
              update order (FILLED)
              update user balance
              update position (qty, avgPrice)
              create Trade record
              create fee Transaction
          }
          PUBLISH "ORDER_UPDATED:{userId}" → Redis pubsub
          GraphQL subscription resolves → client receives update
```

This design keeps the API responsive under load and allows the match engine to scale independently.

---

## Database Schema

### Models

#### User
| Field | Type | Notes |
|---|---|---|
| id | String (UUID) | Primary key |
| email | String | Unique |
| username | String? | Optional, unique |
| password | String | bcrypt hash |
| balance | Float | Default 100,000 |
| role | Role | USER or ADMIN |
| isActive | Boolean | Default true |
| createdAt, updatedAt | DateTime | |

Relations: `orders`, `trades`, `positions`, `notifications`, `transactions`

#### Order
| Field | Type | Notes |
|---|---|---|
| id | String (UUID) | |
| userId | String | FK → User |
| symbol | String | Default "BTCUSDT" |
| side | Side | BUY or SELL |
| type | OrderType | MARKET, LIMIT, STOP_LIMIT |
| timeInForce | TimeInForce | GTC, IOC, FOK |
| price | Float | Limit price |
| stopPrice | Float? | For stop orders |
| qty | Float | Requested quantity |
| filledQty | Float | Default 0 |
| fees | Float | Accumulated fees |
| status | OrderStatus | OPEN → FILLED or CANCELLED |
| filledAt, cancelledAt | DateTime? | |

#### Trade
Immutable record created each time an order is (partially) filled.

| Field | Type | Notes |
|---|---|---|
| price, qty, side | | Fill details |
| fees | Float | 0.1% of trade value |
| realizedPnl | Float | For SELL trades |
| isMaker | Boolean | Maker/taker flag |

#### Position
One row per (userId, symbol) pair. Updated atomically on each fill.

| Field | Type |
|---|---|
| qty | Float |
| avgPrice | Float |
| realizedPnl | Float |
| leverage | Float |

Unique constraint: `(userId, symbol)`

#### Candle
Cached OHLCV data. Written on first fetch from Binance, refreshed if older than 1 minute.

Unique constraint: `(symbol, interval, openTime)`

#### Notification
Price alerts. Fields: `symbol`, `targetPrice`, `condition` (ABOVE/BELOW), `triggered`, `triggeredAt`.

#### Transaction
Ledger of balance changes: DEPOSIT (initial balance), FEE (per trade), WITHDRAWAL.

### Enums

```
Side:            BUY | SELL
OrderType:       MARKET | LIMIT | STOP_LIMIT
OrderStatus:     OPEN | FILLED | PARTIALLY_FILLED | CANCELLED | EXPIRED
TimeInForce:     GTC | IOC | FOK
Role:            USER | ADMIN
NotifCondition:  ABOVE | BELOW
TransactionType: DEPOSIT | WITHDRAWAL | FEE
```

---

## Backend

### File Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema + Pothos generator
│   └── migrations/            # Applied SQL migrations
├── prisma.config.ts           # Prisma v7 config (datasource URL)
├── src/
│   ├── server.ts              # Entry point: HTTP + WS + Socket.io setup
│   ├── app.ts                 # Express app + Apollo middleware
│   ├── config/
│   │   ├── db.ts              # Prisma singleton (PrismaPg adapter)
│   │   └── env.ts             # dotenv loading + ENV constants
│   ├── graphql/
│   │   ├── schema.ts          # Pothos builder init
│   │   ├── index.ts           # Schema assembly (imports all types/resolvers)
│   │   ├── pubsub.ts          # Redis-backed PubSub + channel helpers
│   │   ├── query.ts           # All GQL strings + run_query() helper
│   │   ├── types/             # Pothos prismaObject type definitions
│   │   │   ├── user.ts
│   │   │   ├── order.ts
│   │   │   ├── trade.ts
│   │   │   ├── position.ts
│   │   │   ├── candle.ts
│   │   │   ├── notification.ts
│   │   │   └── transaction.ts
│   │   └── resolvers/         # Query/Mutation/Subscription logic
│   │       ├── auth.ts        # login, signup, me
│   │       ├── orders.ts      # orders, order, placeOrder, cancelOrder
│   │       ├── trades.ts      # trades
│   │       ├── position.ts    # position
│   │       ├── candles.ts     # candles (cache-first)
│   │       ├── notifications.ts
│   │       ├── transactions.ts
│   │       └── subscriptions.ts # orderUpdated
│   ├── services/
│   │   ├── redis.ts           # ioredis clients (main + subscriber)
│   │   ├── socket.ts          # Socket.io server init
│   │   └── binanceService.ts  # Binance WS streams + REST candles
│   ├── workers/
│   │   └── matchEngine.ts     # Standalone order-matching worker
│   └── generated/
│       └── pothos-types.ts    # Auto-generated by prisma generate
```

### GraphQL API

#### Queries
| Query | Args | Returns | Auth |
|---|---|---|---|
| `me` | — | User | ✅ |
| `orders` | — | Order[] | ✅ |
| `order` | id | Order? | ✅ |
| `trades` | — | Trade[] | ✅ |
| `position` | symbol? | Position? | ✅ |
| `candles` | symbol, interval | Candle[] | ✅ |
| `notifications` | — | Notification[] | ✅ |
| `transactions` | — | Transaction[] | ✅ |

#### Mutations
| Mutation | Args | Returns | Auth |
|---|---|---|---|
| `login` | email, password | AuthPayload | ❌ |
| `signup` | email, password, username? | AuthPayload | ❌ |
| `placeOrder` | input: PlaceOrderInput | Order | ✅ |
| `cancelOrder` | id | Order | ✅ |
| `createNotification` | symbol, targetPrice, condition | Notification | ✅ |
| `deleteNotification` | id | Boolean | ✅ |

`PlaceOrderInput`: `{ symbol?, side, type, qty, price?, stopPrice?, timeInForce? }`

#### Subscriptions
| Subscription | Returns | Notes |
|---|---|---|
| `orderUpdated` | Order | User-scoped, requires auth |

The subscription channel is `ORDER_UPDATED:{userId}` — each subscriber only receives their own updates.

### Binance Service

On startup, the service:
1. Fetches the last 500 1-minute BTCUSDT candles via REST and caches them in memory
2. Opens a persistent WebSocket to Binance multi-stream endpoint

Streams consumed:

| Stream | Effect |
|---|---|
| `btcusdt@kline_1m` | Updates in-memory candle store, emits via Socket.io |
| `btcusdt@depth20@100ms` | Emits orderbook snapshot via Socket.io |
| `btcusdt@trade` | Emits individual trade via Socket.io |
| `btcusdt@ticker` | Updates price in Redis `market:btc:price`, emits via Socket.io |

The `candles` GraphQL resolver is cache-first: it checks the DB first and only hits the Binance REST API if the newest candle is older than 1 minute or the DB is empty.

### Redis Usage

| Key | Type | Written by | Read by |
|---|---|---|---|
| `order_queue` | List | `placeOrder` resolver | Match engine (BLPOP) |
| `market:btc:price` | String | Binance service (ticker) | Match engine |
| `ORDER_UPDATED:{userId}` | Pub/Sub | Match engine | GraphQL subscription |

---

## Frontend (frontend2)

A Next.js 16 App Router application. All data fetching goes through GraphQL; Socket.io handles real-time market data only.

### File Structure

```
frontend2/
├── app/
│   ├── layout.tsx             # Root layout (fonts, metadata)
│   ├── providers.tsx          # ApolloProvider + Redux Provider
│   ├── store.ts               # Redux store
│   ├── hooks.ts               # useAppDispatch, useAppSelector
│   ├── page.tsx               # Hero/landing page
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   └── profile/page.tsx
├── components/
│   ├── AppInitializer/        # Fetches profile + starts socket listeners
│   ├── ProtectedShell/        # Redirect-to-login guard
│   ├── Dashboard/             # Trading layout (chart + panels)
│   ├── TradingPanel/          # Place order form
│   ├── OrderUpdates/          # Open orders + live subscription
│   ├── ChartArea/             # Candlestick chart
│   ├── Orderbook/             # Bid/ask table
│   ├── TradeFeed/             # Recent trades
│   ├── PortfolioPanel/        # Balance and PnL
│   ├── Sidebar/               # Navigation
│   └── Tobar/                 # Price ticker header
├── features/
│   ├── auth/authSlice.ts      # JWT auth state
│   ├── market/marketSlice.ts  # Price + candles
│   ├── orderbook/orderbookSlice.ts
│   ├── trades/tradesSlice.ts
│   ├── orders/orderUpdatesSlice.ts
│   └── trading/tradingSlice.ts
└── services/
    ├── api.ts                 # API_URL constant
    ├── socket.ts              # Socket.io client
    ├── socketListners.ts      # Socket event → Redux dispatch
    └── graphql/
        ├── client.ts          # Apollo Client singleton
        └── query.ts           # QUERIES, MUTATIONS, SUBSCRIPTIONS + run_query()
```

### Apollo Client Setup

The client uses a split link to route traffic:

```
Subscription operations  ──→  WebSocket link (ws://localhost:5000/graphql)
Queries and mutations    ──→  HTTP link (http://localhost:5000/graphql)
                                   + Auth link (injects Bearer token)
```

Token is read from `localStorage` at request time. The WS link is created only on the client (guarded with `typeof window !== 'undefined'`) to avoid SSR crashes.

### State Management

Redux manages only data that cannot live in Apollo's cache:

| Slice | Managed State |
|---|---|
| `auth` | JWT token, user object, isAuthenticated flag |
| `market` | Current price, candle array (updated by Socket.io) |
| `orderbook` | Bids and asks arrays (updated by Socket.io) |
| `trades` | Recent trade feed (updated by Socket.io) |
| `orders` | Open orders list (initial load + subscription updates) |
| `trading` | Order placement status/error |

Apollo InMemoryCache is not used for application state — all queries use `fetchPolicy: 'network-only'` via `run_query()`.

### `run_query()` Helper

A thin wrapper around `apolloClient` that routes to `.query()` or `.mutate()` based on the operation type, enabling thunks to use a single function:

```typescript
const data = await run_query<{ login: AuthPayload }>(MUTATIONS.LOGIN, { email, password })
```

### Socket.io (Market Data Only)

Socket.io handles the high-frequency market data that would be expensive over GraphQL:

| Event | Direction | Handler |
|---|---|---|
| `join:user` | Client → Server | Joins user's private room |
| `price:update` | Server → Client | dispatch `updatePrice` |
| `orderbook:update` | Server → Client | dispatch `updateOrderbook` |
| `trade:executed` | Server → Client | dispatch `addTrade` |

### GraphQL Subscription (Order Updates)

`OrderUpdates` component uses Apollo's `useSubscription`:

```typescript
useSubscription<{ orderUpdated: Order }>(SUBSCRIPTIONS.ORDER_UPDATED, {
  onData: ({ data }) => {
    if (data.data?.orderUpdated) dispatch(processOrderUpdate(data.data.orderUpdated))
  }
})
```

When an order is filled by the match engine, the update travels: Redis pub/sub → GraphQL subscription resolver → WebSocket → Apollo Client → Redux → component re-render.

---

## Data Flow

### Placing an Order

```
User clicks "Buy"
      │
      ▼
TradingPanel dispatches placeOrder thunk
      │
      ▼
run_query(MUTATIONS.PLACE_ORDER, { input })  →  GraphQL HTTP POST
      │
      ▼
Backend: creates Order(status=OPEN), LPUSH to Redis queue
      │
      ▼                    (async, separate process)
Match Engine pops from queue
      │
      ├─ Fetch price from Redis
      ├─ Check fill condition
      └─ Prisma $transaction:
           update Order(FILLED)
           update User(balance)
           update Position(qty, avgPrice)
           create Trade
           create Transaction(FEE)
           PUBLISH ORDER_UPDATED:{userId}
                    │
                    ▼
         GraphQL subscription fires
                    │
                    ▼
         Frontend: processOrderUpdate dispatched
         Open orders list updated
```

### Real-Time Price Tick

```
Binance WS → btcusdt@ticker
      │
      ▼
BinanceService: Redis SET market:btc:price
      │
      ▼
Socket.io emit: price:update { price }
      │
      ▼
Frontend socketListeners: dispatch updatePrice
      │
      ▼
Topbar and chart re-render with new price
```

---

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/crypto_trading
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_SECRET=change_this_in_production
BINANCE_WS_URL=wss://stream.binance.com:9443
```

---

## Running the Project

### Prerequisites

- Node.js 18+
- PostgreSQL running (port 5432)
- Redis running (port 6379)

### Backend

```bash
cd backend

# Install dependencies
npm install

# Apply database migrations
npx prisma migrate deploy

# Generate Prisma client and Pothos types
npx prisma generate

# Start the GraphQL server (port 5000)
npm run dev

# In a separate terminal: start the match engine worker
npm run worker
```

### Frontend

```bash
cd frontend2

# Install dependencies
npm install

# Start the Next.js dev server (port 3000)
npm run dev
```

Open `http://localhost:3000` to access the app.

> **Note:** The backend must be running before the frontend can connect. The match engine worker must be running for orders to be filled.
