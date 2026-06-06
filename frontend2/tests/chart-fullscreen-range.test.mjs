import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const chartAreaSource = readFileSync(
  resolve(import.meta.dirname, "../components/ChartArea/ChartArea.tsx"),
  "utf8"
);

const overlaySource = readFileSync(
  resolve(import.meta.dirname, "../components/ChartDrawing/DrawingCanvasOverlay.tsx"),
  "utf8"
);

assert.match(
  chartAreaSource,
  /const TIME_RANGE_INTERVALS: Record<TimeRangeId, string> = \{/,
  "ChartArea should map each visible range to a candle interval that can actually cover that range"
);

assert.match(
  chartAreaSource,
  /["']1w["']:\s*["']30m["']/,
  "The 1W range should switch to a wider candle interval so a full week fits inside the 500-candle fetch"
);

assert.match(
  chartAreaSource,
  /["']1y["']:\s*["']1d["']/,
  "The 1Y range should use daily candles so a full year can load"
);

assert.match(
  chartAreaSource,
  /const candleRequest = \{ symbol: "BTCUSDT", interval: TIME_RANGE_INTERVALS\[timeRange\] \}/,
  "ChartArea should request candles based on the selected range instead of hard-coding 1m"
);

assert.match(
  chartAreaSource,
  /requestFullscreen/,
  "ChartArea should support entering fullscreen mode"
);

assert.match(
  chartAreaSource,
  /document\.exitFullscreen/,
  "ChartArea should support exiting fullscreen mode"
);

assert.match(
  chartAreaSource,
  /fixed inset-0 z-\[60\]/,
  "Fullscreen mode should promote the chart into a full-viewport shell"
);

assert.match(
  overlaySource,
  /drawings,\s*\n\s*drawingsVisible,\s*\n\s*hoveredDrawingId,\s*\n\s*preview,\s*\n\s*renderTick,\s*\n\s*selectedDrawingId,\s*\n\s*candles,/,
  "Drawing overlay should re-render when candle data changes so drawings stay aligned with chart updates"
);
