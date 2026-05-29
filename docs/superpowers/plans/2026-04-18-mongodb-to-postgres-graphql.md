# MongoDB → PostgreSQL + GraphQL Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace MongoDB/Mongoose + REST with PostgreSQL/Prisma + Apollo Server 4 (Pothos) on the backend and Apollo Client with a central `run_query()` on the frontend, while keeping Socket.io untouched for market data.

**Architecture:** Apollo Server 4 mounts at `/graphql` alongside the existing Express/Socket.io server. Prisma replaces all Mongoose models. The match engine worker publishes order updates to a Redis pub/sub channel; the GraphQL subscription resolver subscribes via `graphql-redis-subscriptions`. Frontend swaps Axios for Apollo Client; Redux keeps only auth token + UI state.

**Tech Stack:** PostgreSQL, Prisma, Apollo Server 4, Pothos (code-first GraphQL), graphql-redis-subscriptions, Apollo Client 3, graphql-ws, React + Redux Toolkit

---

## File Map

### Backend — created
| File | Responsibility |
|---|---|
| `backend/prisma/schema.prisma` | Full PostgreSQL schema with all models and enums |
| `backend/src/config/db.ts` | Prisma client singleton (replaces mongoose connect) |
| `backend/src/graphql/pubsub.ts` | Redis-backed PubSub instance |
| `backend/src/graphql/schema.ts` | Pothos SchemaBuilder + assembled schema export + apolloServer export |
| `backend/src/graphql/types/user.ts` | Pothos User prismaObject |
| `backend/src/graphql/types/order.ts` | Pothos Order prismaObject |
| `backend/src/graphql/types/trade.ts` | Pothos Trade prismaObject |
| `backend/src/graphql/types/position.ts` | Pothos Position prismaObject |
| `backend/src/graphql/types/candle.ts` | Pothos Candle prismaObject |
| `backend/src/graphql/types/notification.ts` | Pothos Notification prismaObject |
| `backend/src/graphql/types/transaction.ts` | Pothos Transaction prismaObject |
| `backend/src/graphql/resolvers/auth.ts` | login, signup, me resolvers |
| `backend/src/graphql/resolvers/orders.ts` | orders, order, placeOrder, cancelOrder resolvers |
| `backend/src/graphql/resolvers/trades.ts` | trades resolver |
| `backend/src/graphql/resolvers/position.ts` | position resolver |
| `backend/src/graphql/resolvers/candles.ts` | candles resolver (DB cache-first + Binance fallback) |
| `backend/src/graphql/resolvers/notifications.ts` | notifications, createNotification, deleteNotification |
| `backend/src/graphql/resolvers/transactions.ts` | transactions resolver |
| `backend/src/graphql/resolvers/subscriptions.ts` | orderUpdated subscription |
| `backend/src/graphql/query.ts` | All operation strings + run_query() |

### Backend — modified
| File | Change |
|---|---|
| `backend/src/config/env.ts` | Add `DATABASE_URL`, remove `MONGO_URI` |
| `backend/src/app.ts` | Mount Apollo Server at `/graphql`, remove REST route imports |
| `backend/src/server.ts` | Remove `connectDB()`, remove socket relay for `order:update` |
| `backend/src/workers/matchEngine.ts` | Replace Mongoose + socket.io-client with Prisma + Redis publish |
| `backend/.env` | Add `DATABASE_URL`, remove `MONGO_URI` |

### Backend — deleted
- `backend/src/models/User.ts`
- `backend/src/models/Order.ts`
- `backend/src/models/Trade.ts`
- `backend/src/models/Position.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/orders.ts`
- `backend/src/routes/market.ts`
- `backend/src/middleware/auth.ts`

### Frontend — created
| File | Responsibility |
|---|---|
| `frontend/src/graphql/client.ts` | Apollo Client singleton (HTTP + WS split link) |
| `frontend/src/graphql/query.ts` | All gql operations + run_query() executor |
| `frontend/src/features/ui/uiSlice.ts` | selectedSymbol, activeTab UI state |

### Frontend — modified
| File | Change |
|---|---|
| `frontend/src/main.tsx` | Wrap app in `<ApolloProvider>` |
| `frontend/src/app/store.ts` | Remove tradingReducer, add uiReducer |
| `frontend/src/features/auth/authSlice.ts` | Replace axios thunks with run_query calls |
| `frontend/src/features/trading/tradingSlice.ts` | Replace placeOrder thunk body with run_query |
| `frontend/src/App.tsx` | Replace `dispatch(fetchUserProfile())` with `run_query(QUERIES.ME)` |
| `frontend/src/services/api.ts` | Remove fetchOpenOrders + fetchCandles (replaced by run_query) |
| `frontend/src/components/OrderUpdates/` | Add `useSubscription(SUBSCRIPTIONS.ORDER_UPDATED)` |

---

## Task 1: Install backend dependencies + setup PostgreSQL

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/.env`
- Modify: `backend/src/config/env.ts`

- [ ] **Step 1: Install backend packages**

```bash
cd backend
npm install @apollo/server @as-integrations/express graphql @pothos/core @pothos/plugin-prisma prisma-pothos-types graphql-ws graphql-subscriptions graphql-redis-subscriptions @prisma/client
npm install -D prisma
```

Expected: packages install without errors.

- [ ] **Step 2: Update backend `.env`**

Open `backend/.env` and replace the `MONGO_URI` line with `DATABASE_URL`:

```
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/crypto_trading
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=yourpassword
JWT_SECRET=supersecretkey_change_this_in_production
BINANCE_WS_URL=wss://stream.binance.com:9443
```

- [ ] **Step 3: Update `backend/src/config/env.ts`**

```typescript
import dotenv from 'dotenv'
dotenv.config()

export const ENV = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/crypto_trading',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
  JWT_SECRET: process.env.JWT_SECRET || 'secret',
  BINANCE_WS_URL: process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
}
```

- [ ] **Step 4: Start PostgreSQL (Docker)**

```bash
docker run --name crypto-pg -e POSTGRES_PASSWORD=password -e POSTGRES_DB=crypto_trading -p 5432:5432 -d postgres:16
```

Expected: container starts, `docker ps` shows it running.

- [ ] **Step 5: Commit**

```bash
cd backend
git add package.json package-lock.json .env src/config/env.ts
git commit -m "feat: add GraphQL + Prisma dependencies, switch to PostgreSQL env"
```

---

## Task 2: Prisma schema + migration

**Files:**
- Create: `backend/prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma**

```bash
cd backend
npx prisma init --datasource-provider postgresql
```

Expected: creates `backend/prisma/schema.prisma` and updates `.env` with `DATABASE_URL`.

- [ ] **Step 2: Write `backend/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

generator pothos {
  provider = "prisma-pothos-types"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Side              { BUY SELL }
enum OrderType         { MARKET LIMIT STOP_LIMIT }
enum OrderStatus       { OPEN FILLED PARTIALLY_FILLED CANCELLED EXPIRED }
enum TimeInForce       { GTC IOC FOK }
enum Role              { USER ADMIN }
enum NotifCondition    { ABOVE BELOW }
enum TransactionType   { DEPOSIT WITHDRAWAL FEE }

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  username      String?        @unique
  password      String
  balance       Float          @default(100000)
  role          Role           @default(USER)
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  orders        Order[]
  trades        Trade[]
  positions     Position[]
  notifications Notification[]
  transactions  Transaction[]
}

model Order {
  id          String      @id @default(uuid())
  userId      String
  symbol      String      @default("BTCUSDT")
  side        Side
  type        OrderType
  timeInForce TimeInForce @default(GTC)
  price       Float
  stopPrice   Float?
  qty         Float
  filledQty   Float       @default(0)
  fees        Float       @default(0)
  status      OrderStatus @default(OPEN)
  filledAt    DateTime?
  cancelledAt DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  user        User        @relation(fields: [userId], references: [id])
  trades      Trade[]
}

model Trade {
  id          String   @id @default(uuid())
  orderId     String
  userId      String
  price       Float
  qty         Float
  side        Side
  fees        Float    @default(0)
  realizedPnl Float    @default(0)
  isMaker     Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  order       Order    @relation(fields: [orderId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
}

model Position {
  id          String   @id @default(uuid())
  userId      String
  symbol      String   @default("BTCUSDT")
  qty         Float    @default(0)
  avgPrice    Float    @default(0)
  realizedPnl Float    @default(0)
  leverage    Float    @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id])
  @@unique([userId, symbol])
}

model Candle {
  id        String   @id @default(uuid())
  symbol    String
  interval  String
  openTime  DateTime
  open      Float
  high      Float
  low       Float
  close     Float
  volume    Float
  closeTime DateTime
  createdAt DateTime @default(now())
  @@unique([symbol, interval, openTime])
}

model Notification {
  id          String         @id @default(uuid())
  userId      String
  symbol      String
  targetPrice Float
  condition   NotifCondition
  triggered   Boolean        @default(false)
  triggeredAt DateTime?
  createdAt   DateTime       @default(now())
  user        User           @relation(fields: [userId], references: [id])
}

model Transaction {
  id        String          @id @default(uuid())
  userId    String
  type      TransactionType
  amount    Float
  note      String?
  createdAt DateTime        @default(now())
  user      User            @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 3: Run migration + generate client**

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

Expected: migration files created in `prisma/migrations/`, Prisma client generated, pothos types generated at `node_modules/@pothos/plugin-prisma/generated`.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add Prisma schema for PostgreSQL with all models"
```

---

## Task 3: Prisma client singleton

**Files:**
- Modify: `backend/src/config/db.ts`

- [ ] **Step 1: Rewrite `backend/src/config/db.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Commit**

```bash
git add src/config/db.ts
git commit -m "feat: replace mongoose connect with Prisma client singleton"
```

---

## Task 4: GraphQL PubSub (Redis-backed)

**Files:**
- Create: `backend/src/graphql/pubsub.ts`

The match engine is a **separate process**, so in-memory PubSub won't work. We use `graphql-redis-subscriptions` which publishes/subscribes through the Redis instance that already exists in the project.

- [ ] **Step 1: Create `backend/src/graphql/pubsub.ts`**

```typescript
import { RedisPubSub } from 'graphql-redis-subscriptions'
import { ENV } from '../config/env.js'

export const pubsub = new RedisPubSub({
  connection: {
    host: ENV.REDIS_HOST,
    port: ENV.REDIS_PORT,
    password: ENV.REDIS_PASSWORD || undefined,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  },
})

export const ORDER_UPDATED = 'ORDER_UPDATED'
```

- [ ] **Step 2: Commit**

```bash
git add src/graphql/pubsub.ts
git commit -m "feat: add Redis-backed GraphQL PubSub"
```

---

## Task 5: Pothos SchemaBuilder + types

**Files:**
- Create: `backend/src/graphql/schema.ts`
- Create: `backend/src/graphql/types/user.ts`
- Create: `backend/src/graphql/types/order.ts`
- Create: `backend/src/graphql/types/trade.ts`
- Create: `backend/src/graphql/types/position.ts`
- Create: `backend/src/graphql/types/candle.ts`
- Create: `backend/src/graphql/types/notification.ts`
- Create: `backend/src/graphql/types/transaction.ts`

- [ ] **Step 1: Create `backend/src/graphql/schema.ts`**

This file initialises the builder and will be imported by every type/resolver file. It also assembles the final schema after all types and resolvers are registered.

```typescript
import SchemaBuilder from '@pothos/core'
import PrismaPlugin from '@pothos/plugin-prisma'
import type PrismaTypes from '@pothos/plugin-prisma/generated'
import { prisma } from '../config/db.js'

export type Context = {
  user: { id: string; email: string; role: string } | null
  prisma: typeof prisma
}

export const builder = new SchemaBuilder<{
  PrismaTypes: PrismaTypes
  Context: Context
}>({
  plugins: [PrismaPlugin],
  prisma: { client: prisma },
})

builder.queryType({})
builder.mutationType({})
builder.subscriptionType({})
```

- [ ] **Step 2: Create `backend/src/graphql/types/user.ts`**

```typescript
import { builder } from '../schema.js'

builder.prismaObject('User', {
  fields: (t) => ({
    id: t.exposeID('id'),
    email: t.exposeString('email'),
    username: t.exposeString('username', { nullable: true }),
    balance: t.exposeFloat('balance'),
    role: t.exposeString('role'),
    isActive: t.exposeBoolean('isActive'),
    createdAt: t.expose('createdAt', { type: 'String' }),
    orders: t.relation('orders'),
    trades: t.relation('trades'),
    positions: t.relation('positions'),
    notifications: t.relation('notifications'),
    transactions: t.relation('transactions'),
  }),
})
```

- [ ] **Step 3: Create `backend/src/graphql/types/order.ts`**

```typescript
import { builder } from '../schema.js'

builder.prismaObject('Order', {
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeString('userId'),
    symbol: t.exposeString('symbol'),
    side: t.exposeString('side'),
    type: t.exposeString('type'),
    timeInForce: t.exposeString('timeInForce'),
    price: t.exposeFloat('price'),
    stopPrice: t.exposeFloat('stopPrice', { nullable: true }),
    qty: t.exposeFloat('qty'),
    filledQty: t.exposeFloat('filledQty'),
    fees: t.exposeFloat('fees'),
    status: t.exposeString('status'),
    filledAt: t.expose('filledAt', { type: 'String', nullable: true }),
    cancelledAt: t.expose('cancelledAt', { type: 'String', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'String' }),
    updatedAt: t.expose('updatedAt', { type: 'String' }),
    trades: t.relation('trades'),
  }),
})
```

- [ ] **Step 4: Create `backend/src/graphql/types/trade.ts`**

```typescript
import { builder } from '../schema.js'

builder.prismaObject('Trade', {
  fields: (t) => ({
    id: t.exposeID('id'),
    orderId: t.exposeString('orderId'),
    userId: t.exposeString('userId'),
    price: t.exposeFloat('price'),
    qty: t.exposeFloat('qty'),
    side: t.exposeString('side'),
    fees: t.exposeFloat('fees'),
    realizedPnl: t.exposeFloat('realizedPnl'),
    isMaker: t.exposeBoolean('isMaker'),
    createdAt: t.expose('createdAt', { type: 'String' }),
    updatedAt: t.expose('updatedAt', { type: 'String' }),
  }),
})
```

- [ ] **Step 5: Create `backend/src/graphql/types/position.ts`**

```typescript
import { builder } from '../schema.js'

builder.prismaObject('Position', {
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeString('userId'),
    symbol: t.exposeString('symbol'),
    qty: t.exposeFloat('qty'),
    avgPrice: t.exposeFloat('avgPrice'),
    realizedPnl: t.exposeFloat('realizedPnl'),
    leverage: t.exposeFloat('leverage'),
    createdAt: t.expose('createdAt', { type: 'String' }),
    updatedAt: t.expose('updatedAt', { type: 'String' }),
  }),
})
```

- [ ] **Step 6: Create `backend/src/graphql/types/candle.ts`**

```typescript
import { builder } from '../schema.js'

builder.prismaObject('Candle', {
  fields: (t) => ({
    id: t.exposeID('id'),
    symbol: t.exposeString('symbol'),
    interval: t.exposeString('interval'),
    openTime: t.expose('openTime', { type: 'String' }),
    open: t.exposeFloat('open'),
    high: t.exposeFloat('high'),
    low: t.exposeFloat('low'),
    close: t.exposeFloat('close'),
    volume: t.exposeFloat('volume'),
    closeTime: t.expose('closeTime', { type: 'String' }),
  }),
})
```

- [ ] **Step 7: Create `backend/src/graphql/types/notification.ts`**

```typescript
import { builder } from '../schema.js'

builder.prismaObject('Notification', {
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeString('userId'),
    symbol: t.exposeString('symbol'),
    targetPrice: t.exposeFloat('targetPrice'),
    condition: t.exposeString('condition'),
    triggered: t.exposeBoolean('triggered'),
    triggeredAt: t.expose('triggeredAt', { type: 'String', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'String' }),
  }),
})
```

- [ ] **Step 8: Create `backend/src/graphql/types/transaction.ts`**

```typescript
import { builder } from '../schema.js'

builder.prismaObject('Transaction', {
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeString('userId'),
    type: t.exposeString('type'),
    amount: t.exposeFloat('amount'),
    note: t.exposeString('note', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'String' }),
  }),
})
```

- [ ] **Step 9: Commit**

```bash
git add src/graphql/
git commit -m "feat: add Pothos SchemaBuilder and prismaObject types"
```

---

## Task 6: Auth resolvers (login, signup, me)

**Files:**
- Create: `backend/src/graphql/resolvers/auth.ts`

- [ ] **Step 1: Create `backend/src/graphql/resolvers/auth.ts`**

```typescript
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { builder } from '../schema.js'
import { ENV } from '../../config/env.js'

const AuthPayload = builder.objectType('AuthPayload', {
  fields: (t) => ({
    token: t.string({ resolve: (p) => p.token }),
    user: t.field({
      type: 'User',
      resolve: (p) => p.user,
    }),
  }),
})

const PlaceOrderInput = builder.inputType('PlaceOrderInput', {
  fields: (t) => ({
    symbol: t.string({ required: false }),
    side: t.string({ required: true }),
    type: t.string({ required: true }),
    qty: t.float({ required: true }),
    price: t.float({ required: false }),
    stopPrice: t.float({ required: false }),
    timeInForce: t.string({ required: false }),
  }),
})

// login
builder.mutationField('login', (t) =>
  t.field({
    type: AuthPayload,
    args: {
      email: t.arg.string({ required: true }),
      password: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const user = await ctx.prisma.user.findUnique({ where: { email: args.email } })
      if (!user) throw new Error('Invalid email or password')
      const valid = await bcrypt.compare(args.password, user.password)
      if (!valid) throw new Error('Invalid email or password')
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, { expiresIn: '7d' })
      return { token, user }
    },
  })
)

// signup
builder.mutationField('signup', (t) =>
  t.field({
    type: AuthPayload,
    args: {
      email: t.arg.string({ required: true }),
      password: t.arg.string({ required: true }),
      username: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, ctx) => {
      const exists = await ctx.prisma.user.findUnique({ where: { email: args.email } })
      if (exists) throw new Error('User already exists')
      const hashed = await bcrypt.hash(args.password, 10)
      const user = await ctx.prisma.user.create({
        data: { email: args.email, password: hashed, username: args.username ?? undefined },
      })
      await ctx.prisma.position.create({
        data: { userId: user.id, symbol: 'BTCUSDT', qty: 0, avgPrice: 0 },
      })
      // Record initial deposit transaction
      await ctx.prisma.transaction.create({
        data: { userId: user.id, type: 'DEPOSIT', amount: 100000, note: 'Initial simulated balance' },
      })
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, { expiresIn: '7d' })
      return { token, user }
    },
  })
)

// me
builder.queryField('me', (t) =>
  t.prismaField({
    type: 'User',
    nullable: true,
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.user.findUnique({ ...query, where: { id: ctx.user.id } })
    },
  })
)

export { PlaceOrderInput }
```

- [ ] **Step 2: Commit**

```bash
git add src/graphql/resolvers/auth.ts
git commit -m "feat: add GraphQL auth resolvers (login, signup, me)"
```

---

## Task 7: Orders resolvers

**Files:**
- Create: `backend/src/graphql/resolvers/orders.ts`

- [ ] **Step 1: Create `backend/src/graphql/resolvers/orders.ts`**

```typescript
import { builder, type Context } from '../schema.js'
import { redis, KEYS } from '../../services/redis.js'
import { PlaceOrderInput } from './auth.js'

// orders query
builder.queryField('orders', (t) =>
  t.prismaField({
    type: ['Order'],
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.order.findMany({
        ...query,
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
      })
    },
  })
)

// order(id) query
builder.queryField('order', (t) =>
  t.prismaField({
    type: 'Order',
    nullable: true,
    args: { id: t.arg.id({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.order.findFirst({
        ...query,
        where: { id: String(args.id), userId: ctx.user.id },
      })
    },
  })
)

// placeOrder mutation
builder.mutationField('placeOrder', (t) =>
  t.prismaField({
    type: 'Order',
    args: { input: t.arg({ type: PlaceOrderInput, required: true }) },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      const { side, type, qty, price, stopPrice, timeInForce, symbol } = args.input

      if (!qty || qty <= 0) throw new Error('Invalid quantity')
      if (type === 'LIMIT' && (!price || price <= 0)) throw new Error('Limit order requires positive price')

      const order = await ctx.prisma.order.create({
        ...query,
        data: {
          userId: ctx.user.id,
          symbol: symbol ?? 'BTCUSDT',
          side: side as any,
          type: type as any,
          timeInForce: (timeInForce ?? 'GTC') as any,
          price: price ?? 0,
          stopPrice: stopPrice ?? undefined,
          qty,
          status: 'OPEN',
        },
      })

      await redis.lpush(KEYS.ORDER_QUEUE, JSON.stringify({ orderId: order.id, userId: ctx.user.id }))
      return order
    },
  })
)

// cancelOrder mutation
builder.mutationField('cancelOrder', (t) =>
  t.prismaField({
    type: 'Order',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      const order = await ctx.prisma.order.findFirst({ where: { id: String(args.id), userId: ctx.user.id } })
      if (!order) throw new Error('Order not found')
      if (order.status !== 'OPEN') throw new Error('Only OPEN orders can be cancelled')
      return ctx.prisma.order.update({
        ...query,
        where: { id: String(args.id) },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      })
    },
  })
)
```

- [ ] **Step 2: Commit**

```bash
git add src/graphql/resolvers/orders.ts
git commit -m "feat: add GraphQL orders resolvers"
```

---

## Task 8: Trades, Position, Notifications, Transactions resolvers

**Files:**
- Create: `backend/src/graphql/resolvers/trades.ts`
- Create: `backend/src/graphql/resolvers/position.ts`
- Create: `backend/src/graphql/resolvers/notifications.ts`
- Create: `backend/src/graphql/resolvers/transactions.ts`

- [ ] **Step 1: Create `backend/src/graphql/resolvers/trades.ts`**

```typescript
import { builder } from '../schema.js'

builder.queryField('trades', (t) =>
  t.prismaField({
    type: ['Trade'],
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.trade.findMany({
        ...query,
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
      })
    },
  })
)
```

- [ ] **Step 2: Create `backend/src/graphql/resolvers/position.ts`**

```typescript
import { builder } from '../schema.js'

builder.queryField('position', (t) =>
  t.prismaField({
    type: 'Position',
    nullable: true,
    args: { symbol: t.arg.string({ required: false }) },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.position.findUnique({
        ...query,
        where: { userId_symbol: { userId: ctx.user.id, symbol: args.symbol ?? 'BTCUSDT' } },
      })
    },
  })
)
```

- [ ] **Step 3: Create `backend/src/graphql/resolvers/notifications.ts`**

```typescript
import { builder } from '../schema.js'

builder.queryField('notifications', (t) =>
  t.prismaField({
    type: ['Notification'],
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.notification.findMany({ ...query, where: { userId: ctx.user.id }, orderBy: { createdAt: 'desc' } })
    },
  })
)

builder.mutationField('createNotification', (t) =>
  t.prismaField({
    type: 'Notification',
    args: {
      symbol: t.arg.string({ required: true }),
      targetPrice: t.arg.float({ required: true }),
      condition: t.arg.string({ required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.notification.create({
        ...query,
        data: { userId: ctx.user.id, symbol: args.symbol, targetPrice: args.targetPrice, condition: args.condition as any },
      })
    },
  })
)

builder.mutationField('deleteNotification', (t) =>
  t.field({
    type: 'Boolean',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      const notif = await ctx.prisma.notification.findFirst({ where: { id: String(args.id), userId: ctx.user.id } })
      if (!notif) throw new Error('Notification not found')
      await ctx.prisma.notification.delete({ where: { id: String(args.id) } })
      return true
    },
  })
)
```

- [ ] **Step 4: Create `backend/src/graphql/resolvers/transactions.ts`**

```typescript
import { builder } from '../schema.js'

builder.queryField('transactions', (t) =>
  t.prismaField({
    type: ['Transaction'],
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.transaction.findMany({ ...query, where: { userId: ctx.user.id }, orderBy: { createdAt: 'desc' } })
    },
  })
)
```

- [ ] **Step 5: Commit**

```bash
git add src/graphql/resolvers/
git commit -m "feat: add trades, position, notifications, transactions resolvers"
```

---

## Task 9: Candles resolver (cache-first)

**Files:**
- Create: `backend/src/graphql/resolvers/candles.ts`

- [ ] **Step 1: Create `backend/src/graphql/resolvers/candles.ts`**

```typescript
import axios from 'axios'
import { builder } from '../schema.js'

builder.queryField('candles', (t) =>
  t.prismaField({
    type: ['Candle'],
    args: {
      symbol: t.arg.string({ required: true }),
      interval: t.arg.string({ required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      const { symbol, interval } = args

      // Check cache: find candles where the most recent closeTime is within the last minute
      const latest = await ctx.prisma.candle.findFirst({
        where: { symbol, interval },
        orderBy: { closeTime: 'desc' },
      })

      const oneMinuteAgo = new Date(Date.now() - 60_000)
      if (latest && latest.closeTime > oneMinuteAgo) {
        return ctx.prisma.candle.findMany({
          ...query,
          where: { symbol, interval },
          orderBy: { openTime: 'asc' },
          take: 500,
        })
      }

      // Fetch from Binance REST
      const { data } = await axios.get('https://api.binance.com/api/v3/klines', {
        params: { symbol, interval, limit: 500 },
      })

      // Upsert each candle
      await Promise.all(
        (data as any[]).map((k: any[]) =>
          ctx.prisma.candle.upsert({
            where: { symbol_interval_openTime: { symbol, interval, openTime: new Date(k[0]) } },
            update: { open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]), closeTime: new Date(k[6]) },
            create: { symbol, interval, openTime: new Date(k[0]), open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]), closeTime: new Date(k[6]) },
          })
        )
      )

      return ctx.prisma.candle.findMany({
        ...query,
        where: { symbol, interval },
        orderBy: { openTime: 'asc' },
        take: 500,
      })
    },
  })
)
```

- [ ] **Step 2: Commit**

```bash
git add src/graphql/resolvers/candles.ts
git commit -m "feat: add candles resolver with DB cache-first + Binance fallback"
```

---

## Task 10: Subscription resolver (orderUpdated)

**Files:**
- Create: `backend/src/graphql/resolvers/subscriptions.ts`

- [ ] **Step 1: Create `backend/src/graphql/resolvers/subscriptions.ts`**

```typescript
import { builder } from '../schema.js'
import { pubsub, ORDER_UPDATED } from '../pubsub.js'

builder.subscriptionField('orderUpdated', (t) =>
  t.prismaField({
    type: 'Order',
    subscribe: (_root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return pubsub.asyncIterator(ORDER_UPDATED)
    },
    resolve: (query, payload: any, _args, ctx) => {
      // Filter: only deliver to the order's owner
      if (payload.userId !== ctx.user?.id) return null as any
      return ctx.prisma.order.findUniqueOrThrow({
        ...query,
        where: { id: payload.orderId },
      })
    },
  })
)
```

- [ ] **Step 2: Commit**

```bash
git add src/graphql/resolvers/subscriptions.ts
git commit -m "feat: add orderUpdated GraphQL subscription resolver"
```

---

## Task 11: Assemble schema + Apollo Server + query registry

**Files:**
- Modify: `backend/src/graphql/schema.ts`
- Create: `backend/src/graphql/query.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Update `backend/src/graphql/schema.ts` to import all resolvers and export the server**

Replace the entire file:

```typescript
import SchemaBuilder from '@pothos/core'
import PrismaPlugin from '@pothos/plugin-prisma'
import type PrismaTypes from '@pothos/plugin-prisma/generated'
import { ApolloServer } from '@apollo/server'
import { prisma } from '../config/db.js'

export type Context = {
  user: { id: string; email: string; role: string } | null
  prisma: typeof prisma
}

export const builder = new SchemaBuilder<{
  PrismaTypes: PrismaTypes
  Context: Context
}>({
  plugins: [PrismaPlugin],
  prisma: { client: prisma },
})

builder.queryType({})
builder.mutationType({})
builder.subscriptionType({})

// Register all types
import '../graphql/types/user.js'
import '../graphql/types/order.js'
import '../graphql/types/trade.js'
import '../graphql/types/position.js'
import '../graphql/types/candle.js'
import '../graphql/types/notification.js'
import '../graphql/types/transaction.js'

// Register all resolvers
import '../graphql/resolvers/auth.js'
import '../graphql/resolvers/orders.js'
import '../graphql/resolvers/trades.js'
import '../graphql/resolvers/position.js'
import '../graphql/resolvers/candles.js'
import '../graphql/resolvers/notifications.js'
import '../graphql/resolvers/transactions.js'
import '../graphql/resolvers/subscriptions.js'

export const schema = builder.toSchema()
export const apolloServer = new ApolloServer<Context>({ schema })
```

> Note: the self-referencing imports (`../graphql/types/...` from inside `src/graphql/schema.ts`) should be `./types/...` and `./resolvers/...`. Adjust to relative paths:

```typescript
// Correct relative paths (schema.ts is already inside src/graphql/)
import './types/user.js'
import './types/order.js'
import './types/trade.js'
import './types/position.js'
import './types/candle.js'
import './types/notification.js'
import './types/transaction.js'
import './resolvers/auth.js'
import './resolvers/orders.js'
import './resolvers/trades.js'
import './resolvers/position.js'
import './resolvers/candles.js'
import './resolvers/notifications.js'
import './resolvers/transactions.js'
import './resolvers/subscriptions.js'
```

Full corrected file:

```typescript
import SchemaBuilder from '@pothos/core'
import PrismaPlugin from '@pothos/plugin-prisma'
import type PrismaTypes from '@pothos/plugin-prisma/generated'
import { ApolloServer } from '@apollo/server'
import { prisma } from '../config/db.js'

export type Context = {
  user: { id: string; email: string; role: string } | null
  prisma: typeof prisma
}

export const builder = new SchemaBuilder<{
  PrismaTypes: PrismaTypes
  Context: Context
}>({
  plugins: [PrismaPlugin],
  prisma: { client: prisma },
})

builder.queryType({})
builder.mutationType({})
builder.subscriptionType({})

import './types/user.js'
import './types/order.js'
import './types/trade.js'
import './types/position.js'
import './types/candle.js'
import './types/notification.js'
import './types/transaction.js'
import './resolvers/auth.js'
import './resolvers/orders.js'
import './resolvers/trades.js'
import './resolvers/position.js'
import './resolvers/candles.js'
import './resolvers/notifications.js'
import './resolvers/transactions.js'
import './resolvers/subscriptions.js'

export const schema = builder.toSchema()
export const apolloServer = new ApolloServer<Context>({ schema })
```

- [ ] **Step 2: Create `backend/src/graphql/query.ts`**

```typescript
import { apolloServer } from './schema.js'
import type { Context } from './schema.js'

export const QUERIES = {
  ME: `
    query Me {
      me {
        id
        email
        username
        balance
        role
        isActive
        createdAt
      }
    }
  `,

  ORDERS: `
    query Orders {
      orders {
        id
        symbol
        side
        type
        timeInForce
        status
        qty
        filledQty
        price
        stopPrice
        fees
        filledAt
        cancelledAt
        createdAt
      }
    }
  `,

  TRADES: `
    query Trades {
      trades {
        id
        orderId
        price
        qty
        side
        fees
        realizedPnl
        isMaker
        createdAt
      }
    }
  `,

  POSITION: `
    query Position($symbol: String) {
      position(symbol: $symbol) {
        id
        symbol
        qty
        avgPrice
        realizedPnl
        leverage
      }
    }
  `,

  CANDLES: `
    query Candles($symbol: String!, $interval: String!) {
      candles(symbol: $symbol, interval: $interval) {
        openTime
        open
        high
        low
        close
        volume
        closeTime
      }
    }
  `,

  NOTIFICATIONS: `
    query Notifications {
      notifications {
        id
        symbol
        targetPrice
        condition
        triggered
        triggeredAt
        createdAt
      }
    }
  `,

  TRANSACTIONS: `
    query Transactions {
      transactions {
        id
        type
        amount
        note
        createdAt
      }
    }
  `,
}

export const MUTATIONS = {
  LOGIN: `
    mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        token
        user {
          id
          email
          username
          balance
          role
        }
      }
    }
  `,

  SIGNUP: `
    mutation Signup(
      $email: String!
      $password: String!
      $username: String
    ) {
      signup(email: $email, password: $password, username: $username) {
        token
        user {
          id
          email
          username
          balance
        }
      }
    }
  `,

  PLACE_ORDER: `
    mutation PlaceOrder($input: PlaceOrderInput!) {
      placeOrder(input: $input) {
        id
        symbol
        side
        type
        status
        qty
        filledQty
        price
        fees
        createdAt
      }
    }
  `,

  CANCEL_ORDER: `
    mutation CancelOrder($id: ID!) {
      cancelOrder(id: $id) {
        id
        status
        cancelledAt
      }
    }
  `,

  CREATE_NOTIFICATION: `
    mutation CreateNotification(
      $symbol: String!
      $targetPrice: Float!
      $condition: String!
    ) {
      createNotification(
        symbol: $symbol
        targetPrice: $targetPrice
        condition: $condition
      ) {
        id
        symbol
        targetPrice
        condition
        triggered
        createdAt
      }
    }
  `,

  DELETE_NOTIFICATION: `
    mutation DeleteNotification($id: ID!) {
      deleteNotification(id: $id)
    }
  `,
}

export const SUBSCRIPTIONS = {
  ORDER_UPDATED: `
    subscription OrderUpdated {
      orderUpdated {
        id
        symbol
        side
        type
        status
        qty
        filledQty
        price
        fees
        filledAt
        updatedAt
      }
    }
  `,
}

export async function run_query<T = any>(
  operation: string,
  variables?: Record<string, any>,
  contextValue?: Partial<Context>
): Promise<T> {
  const result = await apolloServer.executeOperation(
    { query: operation, variables },
    { contextValue: { prisma: contextValue?.prisma, user: contextValue?.user ?? null, ...contextValue } as Context }
  )
  if (result.body.kind !== 'single') throw new Error('Unexpected streamed response')
  if (result.body.singleResult.errors?.length) {
    throw new Error(result.body.singleResult.errors[0].message)
  }
  return result.body.singleResult.data as T
}
```

- [ ] **Step 3: Update `backend/src/app.ts` to mount Apollo Server**

```typescript
import express from 'express'
import cors from 'cors'
import { expressMiddleware } from '@as-integrations/express'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import jwt from 'jsonwebtoken'
import { apolloServer, schema, type Context } from './graphql/schema.js'
import { prisma } from './config/db.js'
import { ENV } from './config/env.js'

const app = express()

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

// Apollo Server must be started before attaching middleware
export async function buildApp() {
  await apolloServer.start()

  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({ req }): Promise<Context> => {
        const authHeader = req.headers.authorization
        let user: Context['user'] = null
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7)
          try {
            user = jwt.verify(token, String(ENV.JWT_SECRET)) as Context['user']
          } catch {}
        }
        return { user, prisma }
      },
    })
  )

  app.get('/', (_req, res) => res.send('Crypto Trading Simulator — GraphQL at /graphql'))

  return app
}

export default app
```

- [ ] **Step 4: Update `backend/src/server.ts` to use `buildApp()` and wire WebSocket subscriptions**

```typescript
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import jwt from 'jsonwebtoken'
import { buildApp } from './app.js'
import { schema, type Context } from './graphql/schema.js'
import { prisma } from './config/db.js'
import { ENV } from './config/env.js'
import { initSocket } from './services/socket.js'
import { BinanceService } from './services/binanceService.js'

const start = async () => {
  const app = await buildApp()
  const httpServer = createServer(app)

  // GraphQL WebSocket server for subscriptions
  const wss = new WebSocketServer({ server: httpServer, path: '/graphql' })
  useServer(
    {
      schema,
      context: async (ctx): Promise<Context> => {
        const token = (ctx.connectionParams?.authorization as string)?.slice(7) ?? ''
        let user: Context['user'] = null
        try { user = jwt.verify(token, String(ENV.JWT_SECRET)) as Context['user'] } catch {}
        return { user, prisma }
      },
    },
    wss
  )

  // Socket.io for market data (unchanged)
  const io = initSocket(httpServer)
  new BinanceService(io)

  // Relay user-matched trades to public feed via socket
  io.on('connection', (socket) => {
    socket.on('trade:executed', (trade) => {
      io.emit('trade:executed', trade)
    })
  })

  httpServer.listen(ENV.PORT, () => {
    console.log(`🚀 Server running on port ${ENV.PORT}`)
    console.log(`🔗 GraphQL: http://localhost:${ENV.PORT}/graphql`)
  })
}

start()
```

- [ ] **Step 5: Commit**

```bash
git add src/graphql/schema.ts src/graphql/query.ts src/app.ts src/server.ts
git commit -m "feat: assemble schema, mount Apollo Server, wire WebSocket subscriptions"
```

---

## Task 12: Update match engine to use Prisma + Redis PubSub

**Files:**
- Modify: `backend/src/workers/matchEngine.ts`

The match engine runs as a separate process. It cannot import `apolloServer` or `pubsub` from the main server directly (separate process). Instead it publishes a raw message to the same Redis channel that `graphql-redis-subscriptions` listens on.

- [ ] **Step 1: Rewrite `backend/src/workers/matchEngine.ts`**

```typescript
import { PrismaClient } from '@prisma/client'
import { redis, redisSub, KEYS } from '../services/redis.js'
import { ENV } from '../config/env.js'

const prisma = new PrismaClient()

// graphql-redis-subscriptions expects messages on channel name as a Redis pub/sub channel
const PUBSUB_CHANNEL = 'ORDER_UPDATED'

const publishOrderUpdate = async (orderId: string, userId: string) => {
  // graphql-redis-subscriptions format: { [triggerName]: payload }
  const payload = JSON.stringify({ ORDER_UPDATED: { orderId, userId } })
  await redis.publish(PUBSUB_CHANNEL, payload)
}

const processOrder = async () => {
  await prisma.$connect()
  console.log('⚙️ Match Engine Worker Started (Prisma + Redis PubSub)')

  while (true) {
    try {
      const result = await redis.brpop(KEYS.ORDER_QUEUE, 0)
      if (!result) continue

      const { orderId, userId } = JSON.parse(result[1])

      const order = await prisma.order.findUnique({ where: { id: orderId } })
      if (!order || order.status !== 'OPEN') continue

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) continue

      const position = await prisma.position.findUnique({
        where: { userId_symbol: { userId, symbol: order.symbol } },
      })
      if (!position) continue

      const marketPriceStr = await redis.get(KEYS.BTC_PRICE)
      if (!marketPriceStr) {
        await redis.lpush(KEYS.ORDER_QUEUE, JSON.stringify({ orderId, userId }))
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
      const marketPrice = parseFloat(marketPriceStr)

      let shouldFill = false
      let fillPrice = marketPrice

      if (order.type === 'MARKET') {
        shouldFill = true
        fillPrice = marketPrice
      } else if (order.type === 'LIMIT') {
        if (order.side === 'BUY' && order.price >= marketPrice) {
          shouldFill = true; fillPrice = marketPrice
        } else if (order.side === 'SELL' && order.price <= marketPrice) {
          shouldFill = true; fillPrice = marketPrice
        }
      }

      if (shouldFill) {
        const cost = fillPrice * order.qty
        const FEE_RATE = 0.001 // 0.1%
        const fees = cost * FEE_RATE

        if (order.side === 'BUY') {
          if (user.balance >= cost + fees) {
            const totalVal = position.qty * position.avgPrice + cost
            const totalQty = position.qty + order.qty
            const realizedPnl = 0

            await prisma.$transaction([
              prisma.user.update({ where: { id: userId }, data: { balance: { decrement: cost + fees } } }),
              prisma.position.update({
                where: { userId_symbol: { userId, symbol: order.symbol } },
                data: { qty: totalQty, avgPrice: totalQty > 0 ? totalVal / totalQty : 0 },
              }),
              prisma.order.update({
                where: { id: orderId },
                data: { status: 'FILLED', filledQty: order.qty, price: fillPrice, fees, filledAt: new Date() },
              }),
              prisma.trade.create({
                data: { orderId, userId, price: fillPrice, qty: order.qty, side: 'BUY', fees, realizedPnl, isMaker: false },
              }),
              prisma.transaction.create({
                data: { userId, type: 'FEE', amount: fees, note: `Fee for BUY ${order.qty} ${order.symbol}` },
              }),
            ])

            await publishOrderUpdate(orderId, userId)
            console.log(`✅ Filled BUY ${orderId} @ ${fillPrice}`)
          } else {
            await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED', cancelledAt: new Date() } })
            await publishOrderUpdate(orderId, userId)
            console.log(`❌ Insufficient funds for ${orderId}`)
          }
        } else if (order.side === 'SELL') {
          if (position.qty >= order.qty) {
            const proceeds = fillPrice * order.qty
            const costBasis = position.avgPrice * order.qty
            const realizedPnl = proceeds - costBasis - fees
            const newQty = position.qty - order.qty

            await prisma.$transaction([
              prisma.position.update({
                where: { userId_symbol: { userId, symbol: order.symbol } },
                data: { qty: newQty, avgPrice: newQty === 0 ? 0 : position.avgPrice, realizedPnl: { increment: realizedPnl } },
              }),
              prisma.user.update({ where: { id: userId }, data: { balance: { increment: proceeds - fees } } }),
              prisma.order.update({
                where: { id: orderId },
                data: { status: 'FILLED', filledQty: order.qty, price: fillPrice, fees, filledAt: new Date() },
              }),
              prisma.trade.create({
                data: { orderId, userId, price: fillPrice, qty: order.qty, side: 'SELL', fees, realizedPnl, isMaker: false },
              }),
              prisma.transaction.create({
                data: { userId, type: 'FEE', amount: fees, note: `Fee for SELL ${order.qty} ${order.symbol}` },
              }),
            ])

            await publishOrderUpdate(orderId, userId)
            console.log(`✅ Filled SELL ${orderId} @ ${fillPrice}`)
          } else {
            await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED', cancelledAt: new Date() } })
            await publishOrderUpdate(orderId, userId)
            console.log(`❌ Insufficient position for ${orderId}`)
          }
        }
      } else {
        console.log(`⏳ Limit order ${orderId} pending... (Price: ${marketPrice})`)
      }
    } catch (error) {
      console.error('Worker Error:', error)
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
}

processOrder()
```

- [ ] **Step 2: Commit**

```bash
git add src/workers/matchEngine.ts
git commit -m "feat: rewrite match engine with Prisma + Redis PubSub, add fees + realizedPnl"
```

---

## Task 13: Delete old Mongoose + REST files

**Files:**
- Delete: `backend/src/models/User.ts`
- Delete: `backend/src/models/Order.ts`
- Delete: `backend/src/models/Trade.ts`
- Delete: `backend/src/models/Position.ts`
- Delete: `backend/src/routes/auth.ts`
- Delete: `backend/src/routes/orders.ts`
- Delete: `backend/src/routes/market.ts`
- Delete: `backend/src/middleware/auth.ts`

- [ ] **Step 1: Delete old files**

```bash
cd backend
rm src/models/User.ts src/models/Order.ts src/models/Trade.ts src/models/Position.ts
rm src/routes/auth.ts src/routes/orders.ts src/routes/market.ts
rm src/middleware/auth.ts
npm uninstall mongoose
```

- [ ] **Step 2: Verify backend compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 3: Start backend and verify GraphQL endpoint**

```bash
npm run dev
```

Open `http://localhost:5000/graphql` in browser — Apollo Sandbox should load. Run:

```graphql
mutation {
  signup(email: "test@test.com", password: "password123") {
    token
    user { id email balance }
  }
}
```

Expected: returns `{ token: "...", user: { id: "...", email: "test@test.com", balance: 100000 } }`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: remove Mongoose models, REST routes, old auth middleware"
```

---

## Task 14: Frontend — install Apollo Client

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install frontend packages**

```bash
cd frontend
npm install @apollo/client graphql graphql-ws
```

Expected: packages install without errors.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add Apollo Client and graphql-ws to frontend"
```

---

## Task 15: Frontend — Apollo Client singleton

**Files:**
- Create: `frontend/src/graphql/client.ts`

- [ ] **Step 1: Create `frontend/src/graphql/client.ts`**

```typescript
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities'

const httpLink = createHttpLink({ uri: 'http://localhost:5000/graphql' })

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token')
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:5000/graphql',
    connectionParams: () => ({
      authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
    }),
  })
)

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query)
    return def.kind === 'OperationDefinition' && def.operation === 'subscription'
  },
  wsLink,
  authLink.concat(httpLink)
)

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
})
```

- [ ] **Step 2: Commit**

```bash
git add src/graphql/client.ts
git commit -m "feat: add Apollo Client singleton with HTTP + WS split link"
```

---

## Task 16: Frontend — query registry + run_query

**Files:**
- Create: `frontend/src/graphql/query.ts`

- [ ] **Step 1: Create `frontend/src/graphql/query.ts`**

```typescript
import { gql, type DocumentNode } from '@apollo/client'
import { apolloClient } from './client'

export const QUERIES = {
  ME: gql`
    query Me {
      me {
        id
        email
        username
        balance
        role
        isActive
        createdAt
      }
    }
  `,

  ORDERS: gql`
    query Orders {
      orders {
        id
        symbol
        side
        type
        timeInForce
        status
        qty
        filledQty
        price
        stopPrice
        fees
        filledAt
        cancelledAt
        createdAt
      }
    }
  `,

  TRADES: gql`
    query Trades {
      trades {
        id
        orderId
        price
        qty
        side
        fees
        realizedPnl
        isMaker
        createdAt
      }
    }
  `,

  POSITION: gql`
    query Position($symbol: String) {
      position(symbol: $symbol) {
        id
        symbol
        qty
        avgPrice
        realizedPnl
        leverage
      }
    }
  `,

  CANDLES: gql`
    query Candles($symbol: String!, $interval: String!) {
      candles(symbol: $symbol, interval: $interval) {
        openTime
        open
        high
        low
        close
        volume
        closeTime
      }
    }
  `,

  NOTIFICATIONS: gql`
    query Notifications {
      notifications {
        id
        symbol
        targetPrice
        condition
        triggered
        triggeredAt
        createdAt
      }
    }
  `,

  TRANSACTIONS: gql`
    query Transactions {
      transactions {
        id
        type
        amount
        note
        createdAt
      }
    }
  `,
}

export const MUTATIONS = {
  LOGIN: gql`
    mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        token
        user {
          id
          email
          username
          balance
          role
        }
      }
    }
  `,

  SIGNUP: gql`
    mutation Signup(
      $email: String!
      $password: String!
      $username: String
    ) {
      signup(email: $email, password: $password, username: $username) {
        token
        user {
          id
          email
          username
          balance
        }
      }
    }
  `,

  PLACE_ORDER: gql`
    mutation PlaceOrder($input: PlaceOrderInput!) {
      placeOrder(input: $input) {
        id
        symbol
        side
        type
        status
        qty
        filledQty
        price
        fees
        createdAt
      }
    }
  `,

  CANCEL_ORDER: gql`
    mutation CancelOrder($id: ID!) {
      cancelOrder(id: $id) {
        id
        status
        cancelledAt
      }
    }
  `,

  CREATE_NOTIFICATION: gql`
    mutation CreateNotification(
      $symbol: String!
      $targetPrice: Float!
      $condition: String!
    ) {
      createNotification(
        symbol: $symbol
        targetPrice: $targetPrice
        condition: $condition
      ) {
        id
        symbol
        targetPrice
        condition
        triggered
        createdAt
      }
    }
  `,

  DELETE_NOTIFICATION: gql`
    mutation DeleteNotification($id: ID!) {
      deleteNotification(id: $id)
    }
  `,
}

export const SUBSCRIPTIONS = {
  ORDER_UPDATED: gql`
    subscription OrderUpdated {
      orderUpdated {
        id
        symbol
        side
        type
        status
        qty
        filledQty
        price
        fees
        filledAt
        updatedAt
      }
    }
  `,
}

export async function run_query<T = any>(
  operation: DocumentNode,
  variables?: Record<string, any>
): Promise<T> {
  const def = operation.definitions.find(
    (d: any) => d.kind === 'OperationDefinition'
  ) as any

  if (def?.operation === 'query') {
    const { data } = await apolloClient.query<T>({
      query: operation,
      variables,
      fetchPolicy: 'network-only',
    })
    return data
  }

  const { data } = await apolloClient.mutate<T>({
    mutation: operation,
    variables,
  })
  return data as T
}
```

- [ ] **Step 2: Commit**

```bash
git add src/graphql/query.ts
git commit -m "feat: add frontend GraphQL query registry and run_query executor"
```

---

## Task 17: Wrap app in ApolloProvider + add uiSlice

**Files:**
- Modify: `frontend/src/main.tsx`
- Create: `frontend/src/features/ui/uiSlice.ts`
- Modify: `frontend/src/app/store.ts`

- [ ] **Step 1: Update `frontend/src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import { apolloClient } from './graphql/client'
import { store } from './app/store'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ApolloProvider>
  </StrictMode>
)
```

- [ ] **Step 2: Create `frontend/src/features/ui/uiSlice.ts`**

```typescript
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  selectedSymbol: string
  activeTab: string
}

const initialState: UiState = {
  selectedSymbol: 'BTCUSDT',
  activeTab: 'dashboard',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedSymbol: (state, action: PayloadAction<string>) => {
      state.selectedSymbol = action.payload
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload
    },
  },
})

export const { setSelectedSymbol, setActiveTab } = uiSlice.actions
export default uiSlice.reducer
```

- [ ] **Step 3: Update `frontend/src/app/store.ts`**

```typescript
import { configureStore } from '@reduxjs/toolkit'
import marketReducer from '../features/market/marketSlice'
import orderbookReducer from '../features/orderbook/orderbookSlice'
import tradesReducer from '../features/trades/tradesSlice'
import ordersReducer from '../features/orders/orderUpdatesSlice'
import authReducer from '../features/auth/authSlice'
import uiReducer from '../features/ui/uiSlice'

export const store = configureStore({
  reducer: {
    market: marketReducer,
    orderbook: orderbookReducer,
    trades: tradesReducer,
    orders: ordersReducer,
    auth: authReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store
```

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx src/features/ui/uiSlice.ts src/app/store.ts
git commit -m "feat: wrap app in ApolloProvider, add uiSlice, remove tradingSlice from store"
```

---

## Task 18: Update authSlice to use run_query

**Files:**
- Modify: `frontend/src/features/auth/authSlice.ts`

- [ ] **Step 1: Rewrite `frontend/src/features/auth/authSlice.ts`**

```typescript
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { run_query } from '../../graphql/query'
import { MUTATIONS, QUERIES } from '../../graphql/query'

export const loginUser = createAsyncThunk('auth/login', async (credentials: { email: string; password: string }) => {
  const data = await run_query<{ login: { token: string; user: any } }>(
    MUTATIONS.LOGIN,
    { email: credentials.email, password: credentials.password }
  )
  return data.login
})

export const SignUp = createAsyncThunk('auth/signup', async (credentials: { email: string; password: string; username?: string }) => {
  const data = await run_query<{ signup: { token: string; user: any } }>(
    MUTATIONS.SIGNUP,
    credentials
  )
  return data.signup
})

export const fetchUserProfile = createAsyncThunk('auth/me', async () => {
  const data = await run_query<{ me: any }>(QUERIES.ME)
  return data.me
})

interface AuthState {
  user: any | null
  token: string | null
  isAuthenticated: boolean
  status: 'idle' | 'loading' | 'failed'
}

const token = localStorage.getItem('token')

const initialState: AuthState = {
  user: null,
  token: token || null,
  isAuthenticated: !!token,
  status: 'idle',
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      localStorage.removeItem('token')
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.fulfilled, (state, action) => {
        state.token = action.payload.token
        state.isAuthenticated = true
        state.user = action.payload.user
        localStorage.setItem('token', action.payload.token)
      })
      .addCase(SignUp.fulfilled, (state, action) => {
        state.token = action.payload.token
        state.isAuthenticated = true
        state.user = action.payload.user
        localStorage.setItem('token', action.payload.token)
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload }
      })
  },
})

export const { logout } = authSlice.actions
export default authSlice.reducer
```

- [ ] **Step 2: Commit**

```bash
git add src/features/auth/authSlice.ts
git commit -m "feat: replace axios in authSlice with run_query"
```

---

## Task 19: Update tradingSlice + api.ts to use run_query

**Files:**
- Modify: `frontend/src/features/trading/tradingSlice.ts`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Rewrite `frontend/src/features/trading/tradingSlice.ts`**

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { run_query, MUTATIONS } from '../../graphql/query'

interface OrderPayload {
  type: 'MARKET' | 'LIMIT'
  side: 'BUY' | 'SELL'
  qty: number
  price?: number
  symbol?: string
  timeInForce?: 'GTC' | 'IOC' | 'FOK'
}

interface TradingState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: TradingState = {
  status: 'idle',
  error: null,
}

export const placeOrder = createAsyncThunk(
  'trading/placeOrder',
  async (orderData: OrderPayload, { rejectWithValue }) => {
    try {
      const data = await run_query<{ placeOrder: any }>(
        MUTATIONS.PLACE_ORDER,
        { input: orderData }
      )
      return data.placeOrder
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to place order')
    }
  }
)

const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    resetStatus: (state) => {
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (state) => { state.status = 'loading'; state.error = null })
      .addCase(placeOrder.fulfilled, (state) => { state.status = 'succeeded' })
      .addCase(placeOrder.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string })
  },
})

export const { resetStatus } = tradingSlice.actions
export default tradingSlice.reducer
```

- [ ] **Step 2: Update `frontend/src/services/api.ts`** — remove the REST helpers, keep the file minimal in case any components still reference it during transition:

```typescript
// Legacy file — kept for transition. New code uses run_query from src/graphql/query.ts
// fetchOpenOrders and fetchCandles are replaced by QUERIES.ORDERS and QUERIES.CANDLES via run_query

export const API_URL = 'http://localhost:5000'
```

- [ ] **Step 3: Commit**

```bash
git add src/features/trading/tradingSlice.ts src/services/api.ts
git commit -m "feat: replace axios in tradingSlice with run_query, stub api.ts"
```

---

## Task 20: Add OrderUpdated subscription + end-to-end test

**Files:**
- Modify: `frontend/src/components/OrderUpdates/` (find the component that handles `order:update` socket events)
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Find the OrderUpdates component**

```bash
find frontend/src/components/OrderUpdates -type f
```

Read the file to understand current structure.

- [ ] **Step 2: Add `useSubscription` for `ORDER_UPDATED` in the OrderUpdates component**

At the top of the component that currently listens for socket `order:update` events, add:

```typescript
import { useSubscription } from '@apollo/client'
import { SUBSCRIPTIONS } from '../../graphql/query'
import { useAppDispatch } from '../../app/hooks'
import { addOrder } from '../orders/orderUpdatesSlice' // adjust import to match actual slice action

// Inside the component:
const dispatch = useAppDispatch()

useSubscription(SUBSCRIPTIONS.ORDER_UPDATED, {
  onData: ({ data }) => {
    if (data.data?.orderUpdated) {
      dispatch(addOrder(data.data.orderUpdated))
    }
  },
})
```

- [ ] **Step 3: Update `frontend/src/App.tsx` to use `run_query` for `fetchUserProfile`**

The existing `dispatch(fetchUserProfile())` call still works since `fetchUserProfile` was updated in Task 18 to use `run_query`. No change needed — verify it still compiles:

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start both servers and run end-to-end test**

Terminal 1:
```bash
cd backend && npm run dev
```

Terminal 2:
```bash
cd backend && npm run worker
```

Terminal 3:
```bash
cd frontend && npm run dev
```

Open `http://localhost:5173`:
1. Sign up with a new email — should create account and land on dashboard
2. Place a MARKET BUY order for 0.001 BTC
3. Check the Orders panel — order should appear as OPEN then flip to FILLED
4. The order update should arrive via GraphQL subscription (not socket)
5. Check Profile/Portfolio — balance should decrease, position should appear

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add orderUpdated subscription to UI, complete MongoDB→PostgreSQL+GraphQL migration"
```

---

## Self-Review Notes

- **Spec coverage check:**
  - ✅ PostgreSQL schema (Task 2) — all 7 models, all enums
  - ✅ Pothos types (Task 5) — all 7 models registered
  - ✅ All queries: me, orders, order, trades, position, candles, notifications, transactions
  - ✅ All mutations: login, signup, placeOrder, cancelOrder, createNotification, deleteNotification
  - ✅ Subscription: orderUpdated
  - ✅ Backend query.ts + run_query (Task 11)
  - ✅ Frontend client.ts (Task 15)
  - ✅ Frontend query.ts + run_query (Task 16)
  - ✅ ApolloProvider (Task 17)
  - ✅ Auth slice updated (Task 18)
  - ✅ Trading slice updated (Task 19)
  - ✅ Match engine uses Prisma + Redis PubSub (Task 12)
  - ✅ Socket.io untouched for market data
  - ✅ Candles cache-first strategy (Task 9)

- **Type consistency:** `PlaceOrderInput` is defined once in `auth.ts` and imported into `orders.ts`. `Context` type is defined once in `schema.ts` and imported everywhere. `ORDER_UPDATED` string constant is defined in `pubsub.ts` and imported in `subscriptions.ts`.

- **Separate process constraint:** Match engine publishes raw Redis messages because it's a separate Node process. `graphql-redis-subscriptions` picks these up on the main server side.
