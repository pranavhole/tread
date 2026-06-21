import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(import.meta.dirname, "../components/ChartDrawing/SaveChartButton.tsx"),
  "utf8"
);

assert.match(
  source,
  /document\.createElement\(["']a["']\)/,
  "Chart snapshot button should create a download link"
);

assert.match(
  source,
  /anchor\.download\s*=\s*`tokentrade-chart-/,
  "Chart snapshot button should download a named PNG file"
);

assert.match(
  source,
  /anchor\.href\s*=\s*image/,
  "Chart snapshot button should use the exported chart image as the download href"
);

assert.doesNotMatch(
  source,
  /fetch\(\s*`\$\{API_URL\}\/save-chart`/,
  "Chart snapshot button should not depend on the backend save endpoint for local downloads"
);
