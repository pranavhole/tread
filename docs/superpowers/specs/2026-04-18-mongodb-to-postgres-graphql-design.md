# Design: MongoDB → PostgreSQL + GraphQL Migration

**Date:** 2026-04-18  
**Project:** Crypto Trading Simulator  
**Strategy:** Big Bang — full replacement in one pass

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        BACKEND                          │
│                                                         │
│  Apollo Server 4 (GraphQL) ── mounted at /graphql       │
│       │                                                 │
│  Pothos Schema Builder (code-first, type-safe)          │
│       │                                                 │
│  Prisma ORM ──────────────────→ PostgreSQL              │
│                                                         │
│  Express + Socket.io ─────────→ Market data (unchanged) │
│  Redis + Match Engine ────────→ Order queue (unchanged) │
│  Binance WebSocket ───────────→ Price feed (unchanged)  │
└─────────────────────────────────────────────────────────┘
          │ GraphQL (HTTP + WS)       │ Socket.io
          ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                       FRONTEND                          │
│                                                         │
│  Apollo Client                                          │
│    └── queries, mutations, subscriptions                │
│    └── run_query() central executor                     │
│                                                         │
│  Redux (UI state only)                                  │
│    └── selectedSymbol, activeTab                        │
│                                                         │
│  Socket.io Client (unchanged)                           │
│    └── price:update, orderbook:update, trade:executed   │
└─────────────────────────────────────────────────────────┘
```

### Key Decisions

| Concern | Decision |
|---|---|
| ORM | Prisma |
| GraphQL server | Apollo Server 4 + Pothos |
| Frontend GraphQL | Apollo Client |
| Real-time market data | Socket.io (unchanged) |
| Real-time order updates | GraphQL Subscriptions (replaces `socket.emit('order:update')`) |
| Frontend state split | Apollo cache for server data, Redux for UI state only |
| Query registry | Central `query.ts` in both backend and frontend |

---

## 2. PostgreSQL Schema (Prisma)

**File:** `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
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

---

## 3. GraphQL API Surface

### Queries
```graphql
me: User
orders: [Order!]!
order(id: ID!): Order
trades: [Trade!]!
position(symbol: String): Position
candles(symbol: String!, interval: String!): [Candle!]!
notifications: [Notification!]!
transactions: [Transaction!]!
```

### Mutations
```graphql
login(email: String!, password: String!): AuthPayload!
signup(email: String!, password: String!, username: String): AuthPayload!
placeOrder(input: PlaceOrderInput!): Order!
cancelOrder(id: ID!): Order!
createNotification(symbol: String!, targetPrice: Float!, condition: NotifCondition!): Notification!
deleteNotification(id: ID!): Boolean!
```

### Subscriptions
```graphql
orderUpdated: Order!   # user-scoped, fires from match engine PubSub
```

### Input Types
```graphql
input PlaceOrderInput {
  symbol:      String
  side:        Side!
  type:        OrderType!
  qty:         Float!
  price:       Float
  stopPrice:   Float
  timeInForce: TimeInForce
}
```

---

## 4. Backend File Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── graphql/
│   │   ├── schema.ts          # Pothos SchemaBuilder init
│   │   ├── query.ts           # All query/mutation/subscription strings + run_query()
│   │   ├── types/
│   │   │   ├── user.ts        # Pothos User type
│   │   │   ├── order.ts       # Pothos Order type
│   │   │   ├── trade.ts       # Pothos Trade type
│   │   │   ├── position.ts    # Pothos Position type
│   │   │   ├── candle.ts      # Pothos Candle type
│   │   │   ├── notification.ts
│   │   │   └── transaction.ts
│   │   ├── resolvers/
│   │   │   ├── auth.ts        # login, signup, me
│   │   │   ├── orders.ts      # orders, order, placeOrder, cancelOrder
│   │   │   ├── trades.ts      # trades
│   │   │   ├── position.ts    # position
│   │   │   ├── candles.ts     # candles (reads from Candle table or Binance)
│   │   │   ├── notifications.ts
│   │   │   ├── transactions.ts
│   │   │   └── subscriptions.ts  # orderUpdated
│   │   └── pubsub.ts          # GraphQL PubSub instance
│   ├── config/
│   │   ├── db.ts              # Prisma client singleton
│   │   └── env.ts
│   ├── middleware/
│   │   └── auth.ts            # JWT → context.user
│   ├── services/              # unchanged
│   │   ├── socket.ts
│   │   ├── binanceService.ts
│   │   ├── binancePriceFeed.ts
│   │   ├── binanceOrderbookFeed.ts
│   │   ├── marketMaker.ts
│   │   └── redis.ts
│   ├── workers/
│   │   └── matchEngine.ts     # updated: publish to PubSub instead of socket.emit
│   ├── app.ts                 # mounts Apollo Server at /graphql
│   └── server.ts
```

---

## 5. Backend: query.ts

**File:** `backend/src/graphql/query.ts`

Contains every GraphQL operation as a readable, formatted string constant. Also exports `run_query()` for internal server-side execution (e.g., tests, seeding, match engine callbacks).

```typescript
import { apolloServer } from './schema'

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
      $condition: NotifCondition!
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
  contextValue?: any
): Promise<T> {
  const { body } = await apolloServer.executeOperation(
    { query: operation, variables },
    { contextValue }
  )
  if (body.kind !== 'single') throw new Error('Unexpected response kind')
  if (body.singleResult.errors?.length) {
    throw new Error(body.singleResult.errors[0].message)
  }
  return body.singleResult.data as T
}
```

---

## 6. Frontend File Structure

```
frontend/src/
├── graphql/
│   ├── client.ts          # Apollo Client singleton
│   └── query.ts           # All gql operations + run_query()
├── app/
│   ├── store.ts           # Redux: UI state only (selectedSymbol, activeTab)
│   └── hooks.ts
├── features/
│   ├── auth/authSlice.ts  # keeps token in Redux (Apollo reads it for headers)
│   ├── market/marketSlice.ts       # socket data only
│   ├── orderbook/orderbookSlice.ts # socket data only
│   ├── trades/tradesSlice.ts       # socket data only
│   └── ui/uiSlice.ts              # selectedSymbol, activeTab (new)
├── services/
│   ├── socket.ts          # unchanged
│   └── socketListners.ts  # unchanged
├── components/            # unchanged structure, swap axios calls → run_query()
└── ...
```

---

## 7. Frontend: query.ts

**File:** `frontend/src/graphql/query.ts`

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
      $condition: NotifCondition!
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
  const def = operation.definitions.find((d: any) => d.kind === 'OperationDefinition') as any
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

---

## 8. Apollo Client Setup

**File:** `frontend/src/graphql/client.ts`

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
    headers: { ...headers, authorization: token ? `Bearer ${token}` : '' },
  }
})

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:5000/graphql',
    connectionParams: () => ({
      authorization: `Bearer ${localStorage.getItem('token')}`,
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

---

## 9. Match Engine: PubSub Integration

The match engine currently calls `socket.emit('order:update', order)`. After migration it publishes to the GraphQL PubSub instead:

```typescript
// Before (matchEngine.ts)
io.to(userId).emit('order:update', order)

// After
import { pubsub } from '../graphql/pubsub'
pubsub.publish('ORDER_UPDATED', { orderUpdated: order, userId })
```

The subscription resolver filters by `userId` from context so each user only receives their own updates.

---

## 10. Apollo Server Context & Auth

Apollo Server extracts the JWT on every request and attaches the decoded user to context:

```typescript
// app.ts — Apollo Server context function
const server = new ApolloServer({ schema })
await server.start()

app.use('/graphql', expressMiddleware(server, {
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    let user = null
    if (token) {
      try { user = jwt.verify(token, JWT_SECRET) } catch {}
    }
    return { user, prisma }
  },
}))
```

All protected resolvers check `context.user` via the Pothos `scope-auth` plugin. The subscription WebSocket uses `connectionParams.authorization` for the same check.

`schema.ts` exports both the built schema and the `apolloServer` instance so `run_query` in `query.ts` can call `apolloServer.executeOperation` directly.

---

## 11. Candles Resolver Strategy

The `candles` query uses a cache-first approach:

1. Check `Candle` table for requested `symbol + interval` rows
2. If found and fresh (last `closeTime` within 1 minute), return from DB
3. Otherwise fetch from Binance REST API (`/api/v3/klines`), upsert into `Candle` table, return results

This eliminates the existing polling `GET /api/market/candles` REST endpoint entirely.

---

## 12. Environment Variables

**Backend `.env` additions:**
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/crypto_trading
# Remove: MONGO_URI
```

---

## 13. New Dependencies

### Backend
```
@apollo/server
@pothos/core
@pothos/plugin-prisma
@pothos/plugin-scope-auth
graphql
graphql-ws
graphql-subscriptions
prisma
@prisma/client
ws
```
Remove: `mongoose`

### Frontend
```
@apollo/client
graphql
graphql-ws
```
Remove: none (axios stays for any non-GraphQL calls if needed, otherwise remove)

---

## 14. Migration Checklist

- [ ] Install PostgreSQL locally (or use Docker: `docker run -e POSTGRES_PASSWORD=password -p 5432:5432 postgres`)
- [ ] Add `DATABASE_URL` to backend `.env`
- [ ] Run `prisma init` → write schema → `prisma migrate dev`
- [ ] Replace `config/db.ts` (mongoose connect → Prisma client singleton)
- [ ] Delete all Mongoose model files
- [ ] Scaffold Pothos schema builder + all type files
- [ ] Write all resolvers (auth, orders, trades, position, candles, notifications, transactions)
- [ ] Write PubSub + subscription resolver
- [ ] Write `backend/src/graphql/query.ts` with `run_query`
- [ ] Mount Apollo Server on Express at `/graphql`
- [ ] Update match engine to publish to PubSub
- [ ] Install Apollo Client + graphql-ws on frontend
- [ ] Write `frontend/src/graphql/client.ts`
- [ ] Write `frontend/src/graphql/query.ts` with `run_query`
- [ ] Remove Redux data-fetching slices (trading, market fetch thunks)
- [ ] Add `uiSlice.ts` for selectedSymbol, activeTab
- [ ] Replace all `api.get/post` calls in components with `run_query()`
- [ ] Wire `useSubscription(SUBSCRIPTIONS.ORDER_UPDATED)` in OrderUpdates component
- [ ] Remove old REST route files (auth.ts, orders.ts, market.ts)
- [ ] Test end-to-end: signup → login → place order → fill → subscription fires
