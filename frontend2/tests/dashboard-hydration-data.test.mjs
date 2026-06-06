import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const protectedShellSource = readFileSync(
  resolve(import.meta.dirname, "../components/ProtectedShell/ProtectedShell.tsx"),
  "utf8"
);

assert.match(protectedShellSource, /const \[hasMounted, setHasMounted\] = React\.useState\(false\)/);
assert.match(protectedShellSource, /window\.setTimeout\(\(\) => setHasMounted\(true\), 0\)/);
assert.match(protectedShellSource, /if \(!hasMounted\) {/);
assert.match(protectedShellSource, /\[hasMounted,\s*isAuthenticated,\s*pathname,\s*router\]/);

const chartAreaSource = readFileSync(
  resolve(import.meta.dirname, "../components/ChartArea/ChartArea.tsx"),
  "utf8"
);
const marketSliceSource = readFileSync(
  resolve(import.meta.dirname, "../features/market/marketSlice.ts"),
  "utf8"
);

assert.match(chartAreaSource, /const TIME_RANGE_INTERVALS: Record<TimeRangeId, string> = \{/);
assert.match(chartAreaSource, /const candleRequest = \{ symbol: "BTCUSDT", interval: TIME_RANGE_INTERVALS\[timeRange\] \}/);
assert.doesNotMatch(chartAreaSource, /symbol: ['"]BTC\/USDT['"]/);
assert.match(marketSliceSource, /const latestCandle = action\.payload\.at\(-1\)/);
assert.match(marketSliceSource, /state\.currentPrice = latestCandle\.close/);
