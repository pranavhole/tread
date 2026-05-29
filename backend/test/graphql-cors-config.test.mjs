import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appSource = readFileSync(resolve(import.meta.dirname, "../src/app.ts"), "utf8");

for (const origin of [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]) {
  assert.ok(appSource.includes(origin), `${origin} should be allowed by CORS`);
}

assert.match(appSource, /origin:\s*\(/, "CORS should use an origin callback");
