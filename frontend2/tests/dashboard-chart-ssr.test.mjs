import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(import.meta.dirname, "../components/Dashboard/Dashboard.tsx"),
  "utf8"
);

assert.match(
  source,
  /dynamic\s+from\s+["']next\/dynamic["']/,
  "Dashboard should use next/dynamic for browser-only chart code"
);

assert.match(
  source,
  /dynamic\(\s*\(\)\s*=>\s*import\(["']\.\.\/ChartArea\/ChartArea["']\)/,
  "Dashboard should load ChartArea dynamically"
);

assert.match(
  source,
  /ssr:\s*false/,
  "ChartArea should not be evaluated during server rendering"
);
