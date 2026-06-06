import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const chartAreaSource = readFileSync(
  resolve(import.meta.dirname, "../components/ChartArea/ChartArea.tsx"),
  "utf8"
);

assert.match(
  chartAreaSource,
  /const chartBounds = useMemo/,
  "ChartArea should derive x-axis bounds from visible candle data"
);

assert.match(
  chartAreaSource,
  /min: chartBounds\?\.min/,
  "The x scale should avoid falling back to epoch 0 while candles are loading"
);

assert.match(
  chartAreaSource,
  /max: chartBounds\?\.max/,
  "The x scale should only set a max when candle data exists"
);

assert.doesNotMatch(
  chartAreaSource,
  /max: chartNow/,
  "Using Date.now() as the x-axis max before data arrives creates a massive 0-to-now minute range"
);
