import test from "node:test";
import assert from "node:assert/strict";

import { resolveInitialOrderPrice } from "../src/graphql/resolvers/orderPricing.ts";

test("market orders use the live market price instead of zero", async () => {
  const price = await resolveInitialOrderPrice({
    type: "MARKET",
    requestedPrice: undefined,
    readMarketPrice: async () => "43210.5",
  });

  assert.equal(price, 43210.5);
});

test("limit orders preserve the requested price", async () => {
  const price = await resolveInitialOrderPrice({
    type: "LIMIT",
    requestedPrice: 42500,
    readMarketPrice: async () => "99999",
  });

  assert.equal(price, 42500);
});

test("market orders fail fast when the market price is unavailable", async () => {
  await assert.rejects(
    () =>
      resolveInitialOrderPrice({
        type: "MARKET",
        requestedPrice: undefined,
        readMarketPrice: async () => null,
      }),
    /market price unavailable/i
  );
});
