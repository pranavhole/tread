import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dashboardSource = readFileSync(
  resolve(import.meta.dirname, "../components/Dashboard/Dashboard.tsx"),
  "utf8"
);

assert.match(
  dashboardSource,
  /lg:grid-cols-\[minmax\(0,1fr\)_340px\]/,
  "Dashboard should use a wider desktop trading rail for readable order book columns"
);

assert.doesNotMatch(
  dashboardSource,
  /hidden md:flex/,
  "Dashboard should not hide order book and trading controls on smaller screens"
);

assert.match(
  dashboardSource,
  /lg:hidden/,
  "Dashboard should provide a mobile/tablet market actions section"
);

const orderbookSource = readFileSync(
  resolve(import.meta.dirname, "../components/Orderbook/Orderbook.tsx"),
  "utf8"
);

assert.match(
  orderbookSource,
  /const maxAskQty = Math\.max/,
  "Orderbook should scale ask depth bars relative to visible liquidity"
);

assert.match(
  orderbookSource,
  /const maxBidQty = Math\.max/,
  "Orderbook should scale bid depth bars relative to visible liquidity"
);

assert.match(
  orderbookSource,
  /Spread/,
  "Orderbook should show spread context around the current price"
);

assert.match(
  orderbookSource,
  /Waiting for live order book/,
  "Orderbook should show a clear empty state before socket data arrives"
);
