import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const serverSource = readFileSync(
  resolve(import.meta.dirname, "../src/server.ts"),
  "utf8"
);

assert.doesNotMatch(
  serverSource,
  /new WebSocketServer\(\{\s*server:\s*httpServer,\s*path:\s*['"]\/graphql['"]/,
  "GraphQL websocket server must not attach directly to the HTTP server because it can intercept Socket.IO upgrades"
);

assert.match(
  serverSource,
  /new WebSocketServer\(\{\s*noServer:\s*true\s*\}\)/,
  "GraphQL websocket server should be created in noServer mode"
);

assert.match(
  serverSource,
  /httpServer\.on\(['"]upgrade['"]/,
  "HTTP upgrade requests should be routed explicitly"
);

assert.match(
  serverSource,
  /pathname\s*===\s*['"]\/graphql['"]/,
  "Only /graphql upgrades should be handled by the GraphQL websocket server"
);
