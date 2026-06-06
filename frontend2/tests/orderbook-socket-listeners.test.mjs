import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const socketSource = readFileSync(
  resolve(import.meta.dirname, "../services/socket.ts"),
  "utf8"
);

assert.match(
  socketSource,
  /transports:\s*\[\s*["']websocket["']\s*\]/,
  "Socket.IO should use websocket transport directly so the browser does not keep issuing polling XHR requests"
);

assert.match(
  socketSource,
  /typeof window === ["']undefined["']/,
  "Socket.IO should not open a browser connection during Next.js server prerendering"
);

assert.match(
  socketSource,
  /export const getSocket = \(\)/,
  "Socket.IO should be created lazily through getSocket"
);

const listenersSource = readFileSync(
  resolve(import.meta.dirname, "../services/socketListners.ts"),
  "utf8"
);

assert.doesNotMatch(
  listenersSource,
  /if\s*\(\s*!userId\s*\)\s*return;[\s\S]*socket\.on\(['"]orderbook:update['"]/,
  "Public market listeners should be registered even when the user profile has not hydrated yet"
);

assert.match(
  listenersSource,
  /let publicListenersInitialized = false/,
  "Socket listeners should guard public market subscriptions against duplicate registration"
);

assert.match(
  listenersSource,
  /socket\.on\(['"]orderbook:update['"],\s*\(data\)/,
  "Order book updates should be subscribed by the public market listener setup"
);

const initializerSource = readFileSync(
  resolve(import.meta.dirname, "../components/AppInitializer/AppInitializer.tsx"),
  "utf8"
);

assert.match(
  initializerSource,
  /initializeSocketListeners\(dispatch,\s*userId\)/,
  "AppInitializer should initialize public socket listeners regardless of whether userId is ready"
);

assert.match(
  initializerSource,
  /if\s*\(\s*isAuthenticated\s*&&\s*!userId\s*\)\s*\{[\s\S]*dispatch\(fetchUserProfile\(\)\)/,
  "AppInitializer should hydrate the user profile when a persisted token exists but userId is still missing"
);
