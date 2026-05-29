# Top 100 Crypto Market Design

**Date:** 2026-04-19

**Goal**

Extend the existing crypto marketplace so it can display and update the top 100 USDT pairs in real time, while also supporting a dedicated `/trade/[symbol]` experience that loads the selected symbol's live market data.

**Scope**

- Restructure the backend market-data layer to support 100 symbols efficiently.
- Add a live top-100 market table in `frontend2`.
- Add dedicated symbol routes at `/trade/[symbol]`.
- Keep the trading experience symbol-aware instead of BTC-only.
- Do not expand this change into tests for this turn.

## Current State

The backend currently mixes several responsibilities into BTC-specific services:

- `backend/src/services/binanceService.ts` handles BTC candles, orderbook, trades, and ticker in one websocket connection.
- `backend/src/services/binancePriceFeed.ts` and `backend/src/services/binanceOrderbookFeed.ts` also contain separate BTC-only stream logic.
- Redis keys are BTC-specific (`market:btc:*`).
- Socket payloads for `price:update` do not consistently include symbol metadata.
- `frontend2/features/market/marketSlice.ts` assumes a single active market with `currentPrice`, `candles`, and a BTC-style symbol label.

This makes top-100 support difficult because the system does not distinguish between:

- broad quote coverage for many symbols
- deep live data for the currently traded symbol

## Design Summary

Split market data into two layers:

1. A top-100 quote layer for lightweight multi-symbol ticker coverage.
2. An active-symbol stream layer for the currently viewed trading pair.

This keeps the top-100 table fast and scalable while avoiding a 100-symbol orderbook and trade-stream explosion.

## Backend Architecture

### 1. Market Universe Service

Add a `marketUniverseService` responsible for:

- fetching `https://api.binance.com/api/v3/ticker/24hr`
- filtering symbols that end with `USDT`
- sorting by descending quote volume
- selecting the top 100 symbols
- caching the selected list in memory
- persisting the ranked list to Redis for reuse

The symbol list should refresh on a timer so membership stays aligned with Binance rankings instead of remaining fixed for the process lifetime.

Suggested outputs:

- in-memory `topSymbols: string[]`
- Redis key for the symbol list, such as `market:top:symbols`

### 2. Multi-Symbol Ticker Feed

Add a dedicated `binanceMultiTickerFeed` that:

- builds a combined websocket URL from the current top-100 list
- subscribes only to `@ticker` streams for those symbols
- reconnects safely on disconnect
- can be rebuilt when the top-100 membership changes

Example stream form:

`wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/...`

This service is responsible only for top-100 quote fields:

- last price
- 24h percentage change
- 24h volume

### 3. Market Cache Service

Replace BTC-specific Redis key constants with symbol-aware key builders.

Suggested helpers:

- `marketPriceKey(symbol)`
- `marketChangeKey(symbol)`
- `marketVolumeKey(symbol)`
- `marketBidsKey(symbol)`
- `marketAsksKey(symbol)`

Ticker updates should write:

- `market:{symbol}:price`
- `market:{symbol}:change`
- `market:{symbol}:volume`

This removes the `BTC_PRICE` pattern and makes the store reusable for every symbol.

### 4. Market Broadcast Service

Create a focused broadcaster for top-100 quote updates.

Socket event:

- `price:update`

Payload:

```ts
{
  symbol: "BTCUSDT",
  price: number,
  change24h: number,
  volume: number,
  ts: number
}
```

This event becomes the canonical live quote update for the markets table.

### 5. Active Symbol Stream Service

Keep heavyweight live data isolated to the symbol currently being traded.

Create an `activeSymbolStreamService` responsible for:

- live candles
- live orderbook
- live trade feed
- active-symbol price synchronization

Rather than streaming deep market data for all 100 pairs, this service should accept a symbol and maintain the single active stream set for that symbol. This is the right trade-off for current scope and performance.

Supported active streams:

- `${symbol.toLowerCase()}@kline_1m`
- `${symbol.toLowerCase()}@depth20@100ms`
- `${symbol.toLowerCase()}@trade`
- `${symbol.toLowerCase()}@ticker`

This service should replace the current BTC-only logic inside `binanceService.ts`.

### 6. GraphQL Integration

GraphQL candle fetching already accepts a symbol parameter. Keep that contract and ensure the frontend always passes the current route symbol.

GraphQL remains the source for initial candle hydration.
Socket.io remains the source for incremental live updates.

### 7. Server Composition

`backend/src/server.ts` should initialize:

- socket server
- market universe refresh
- multi-symbol top-100 ticker feed
- active-symbol stream manager

The backend startup should not rely on a single monolithic Binance service anymore.

## Frontend Architecture (`frontend2`)

### 1. Separate Active Market State From Directory State

Keep the existing candle-focused market slice for the active trading page, but make it symbol-aware.

Suggested active market slice shape:

```ts
market: {
  activeSymbol: string
  currentPrice: number
  candles: Candle[]
}
```

Add a separate slice for the top-100 directory:

```ts
marketDirectory: {
  symbols: string[]
  prices: Record<string, number>
  changes: Record<string, number>
  volumes: Record<string, number>
  search: string
  sort: "volume" | "gainers" | "losers" | "symbol"
}
```

This avoids coupling chart updates to table updates.

### 2. Socket Listener Changes

Update `frontend2/services/socketListners.ts` so `price:update` writes to the directory slice using `symbol`.

For the active market slice:

- only update `currentPrice` when the payload symbol matches the active route symbol
- only process `candle:update`, `orderbook:update`, and `trade:executed` for the active symbol

This prevents non-active symbols from forcing dashboard rerenders.

### 3. Markets Page

Add a dedicated `/markets` page that renders a real-time top-100 table with:

- symbol
- price
- 24h %
- volume
- optional sparkline placeholder area

Required UX:

- sticky header
- search by symbol
- sort by volume by default
- sort by gainers/losers
- row click to `/trade/[symbol]`
- green/red flash on price update

### 4. Dedicated Trade Route

Add a route at:

- `/trade/[symbol]`

This page should reuse the current trading shell structure from the dashboard, but all market data requests and labels must derive from the route symbol instead of hardcoded BTC.

The existing `/dashboard` route can either:

- redirect to `/trade/BTCUSDT`, or
- remain as an alias for the default active symbol

Recommended approach: redirect `/dashboard` to `/trade/BTCUSDT` so the product has one clear trading entrypoint.

### 5. Performance Strategy

To avoid rerendering the whole market table on every tick:

- keep quote state normalized by symbol
- compute filtered/sorted symbol ids in the table container
- render each row with `React.memo`
- have each row select only its own quote fields

Recommended row selectors:

- `state.marketDirectory.prices[symbol]`
- `state.marketDirectory.changes[symbol]`
- `state.marketDirectory.volumes[symbol]`

This allows updates for one symbol to rerender only one row.

Virtualization is optional. For 100 rows, it should only be added if the table remains visually heavy after memoization and selector isolation.

## Data Flow

### Top-100 Market Table

1. Backend fetches top 100 symbols from Binance REST.
2. Backend opens or refreshes the combined ticker websocket for those symbols.
3. Backend stores quote fields in Redis by symbol.
4. Backend emits `price:update` with full quote payload.
5. Frontend directory slice updates the symbol-specific maps.
6. Only the affected row rerenders.

### Dedicated Trade Page

1. User navigates to `/trade/[symbol]`.
2. Frontend sets `activeSymbol` from the route.
3. Frontend requests candles through GraphQL using that symbol.
4. Backend active-symbol stream service ensures live candle/orderbook/trade coverage for that symbol.
5. Socket listeners merge live updates into the active market state.

## Error Handling

Backend:

- on Binance REST failure, keep the last successful top-100 list if available
- on ticker websocket failure, reconnect with backoff
- on top-100 membership refresh, rebuild the ticker stream safely

Frontend:

- show loading or stale-state fallbacks when symbol data is missing
- do not crash if a quote field for a symbol has not arrived yet
- keep the table usable during reconnection periods

## File-Level Direction

Backend likely changes:

- modify `backend/src/server.ts`
- replace or split `backend/src/services/binanceService.ts`
- modify `backend/src/services/redis.ts`
- add market-universe, multi-ticker, cache, and active-symbol service files

Frontend likely changes:

- modify `frontend2/app/dashboard/page.tsx`
- add `frontend2/app/markets/page.tsx`
- add `frontend2/app/trade/[symbol]/page.tsx`
- modify `frontend2/features/market/marketSlice.ts`
- add `frontend2/features/marketDirectory/*`
- modify `frontend2/services/socketListners.ts`
- add market table UI components

## Risks

- The current backend contains multiple overlapping Binance service implementations. If left in place, they can emit conflicting socket payloads.
- The current trade flow and UI text assume BTC in several places. Those assumptions must be removed or made route-driven.
- Rebuilding the combined top-100 websocket when membership changes needs careful connection handoff to avoid dropped updates.

## Out of Scope

- Streaming live orderbooks and trades for all 100 symbols simultaneously
- Portfolio model redesign beyond symbol-awareness needed for trading routes
- Full automated test coverage for this turn

## Recommendation

Implement the backend as a symbol-aware market-data subsystem with two responsibilities:

- broad top-100 ticker coverage
- deep active-symbol streaming

This meets the product goal, keeps the UI professional and responsive, and avoids overloading the system with unnecessary deep streams for every market.
