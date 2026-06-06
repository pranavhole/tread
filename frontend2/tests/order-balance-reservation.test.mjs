import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const orderUpdatesSource = readFileSync(
  resolve(import.meta.dirname, "../features/orders/orderUpdatesSlice.ts"),
  "utf8"
);
const profileSelectorsSource = readFileSync(
  resolve(import.meta.dirname, "../features/profile/profileSelectors.ts"),
  "utf8"
);
const topbarSource = readFileSync(
  resolve(import.meta.dirname, "../components/Tobar/Topbar.tsx"),
  "utf8"
);
const tradingPanelSource = readFileSync(
  resolve(import.meta.dirname, "../components/TradingPanel/TradingPanel.tsx"),
  "utf8"
);

assert.match(
  orderUpdatesSource,
  /import \{ placeOrder \} from ['"]\.\.\/trading\/tradingSlice['"]/,
  "Submitted orders should be added to the order slice immediately"
);
assert.match(
  orderUpdatesSource,
  /\.addCase\(placeOrder\.fulfilled,[\s\S]*applyOrderUpdate/,
  "Placed OPEN orders should update openOrders so funds can be reserved"
);
assert.match(
  profileSelectorsSource,
  /order\.side !== ['"]BUY['"]/,
  "Only open BUY orders should reserve cash balance"
);
assert.match(
  topbarSource,
  /selectWalletSummary/,
  "Topbar asset display should use the wallet summary instead of raw auth balance"
);
assert.match(
  topbarSource,
  /summary\.availableBalance/,
  "Topbar asset display should decrease when BUY orders are open"
);
assert.doesNotMatch(
  tradingPanelSource,
  /50,000\.00 USDT/,
  "Trading panel should not show a hardcoded available balance"
);
assert.match(
  tradingPanelSource,
  /price:\s*activeTab === "LIMIT" \? parseFloat\(price\) : undefined/,
  "Limit orders should submit the typed limit price"
);
