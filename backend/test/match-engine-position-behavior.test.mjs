import test from "node:test";
import assert from "node:assert/strict";

import { getBuyPositionValues, getSellPositionValues } from "../src/workers/matchEngineCore.ts";

test("market buy creates position values when no position exists for the symbol", () => {
  const nextPosition = getBuyPositionValues(null, 2.5, 42000);

  assert.deepEqual(nextPosition, {
    qty: 2.5,
    avgPrice: 42000,
  });
});

test("market buy blends average price when a position already exists", () => {
  const nextPosition = getBuyPositionValues({ qty: 1, avgPrice: 40000 }, 2, 45000);

  assert.deepEqual(nextPosition, {
    qty: 3,
    avgPrice: (1 * 40000 + 2 * 45000) / 3,
  });
});

test("sell requires an existing position", () => {
  assert.throws(() => getSellPositionValues(null, 1, 500), /existing position/i);
});
