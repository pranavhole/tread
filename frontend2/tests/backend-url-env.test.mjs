import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const apiSource = readFileSync(
  resolve(import.meta.dirname, "../services/api.ts"),
  "utf8"
);

assert.match(
  apiSource,
  /process\.env\.NEXT_PUBLIC_API_URL/,
  "API_URL should be configurable for deployed backends"
);

const socketSource = readFileSync(
  resolve(import.meta.dirname, "../services/socket.ts"),
  "utf8"
);

assert.match(
  socketSource,
  /process\.env\.NEXT_PUBLIC_SOCKET_URL/,
  "Socket.IO URL should be configurable for deployed backends"
);

const graphqlClientSource = readFileSync(
  resolve(import.meta.dirname, "../services/graphql/client.ts"),
  "utf8"
);

assert.match(
  graphqlClientSource,
  /process\.env\.NEXT_PUBLIC_GRAPHQL_HTTP_URL/,
  "GraphQL HTTP URL should be configurable for deployed backends"
);

assert.match(
  graphqlClientSource,
  /process\.env\.NEXT_PUBLIC_GRAPHQL_WS_URL/,
  "GraphQL WebSocket URL should be configurable for deployed backends"
);
