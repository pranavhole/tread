import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const initializerSource = readFileSync(
  resolve(import.meta.dirname, "../components/AppInitializer/AppInitializer.tsx"),
  "utf8"
);
const socketSource = readFileSync(
  resolve(import.meta.dirname, "../services/socket.ts"),
  "utf8"
);

assert.match(
  initializerSource,
  /const userId = user\?\.id/,
  "AppInitializer should derive a stable userId from user?.id"
);

assert.doesNotMatch(
  initializerSource,
  /\[dispatch,\s*isAuthenticated,\s*user\]/,
  "AppInitializer must not depend on the whole user object"
);

assert.match(
  initializerSource,
  /\[dispatch,\s*isAuthenticated,\s*userId\]/,
  "AppInitializer should depend on stable userId instead of user"
);

assert.match(
  initializerSource,
  /usePathname/,
  "AppInitializer should inspect the current route before opening sockets"
);

assert.match(
  initializerSource,
  /pathname === ["']\/login["']/,
  "AppInitializer should skip socket initialization on the login page"
);

assert.match(
  socketSource,
  /reconnectionAttempts:\s*[1-9]\d*/,
  "Socket.IO should cap reconnect attempts instead of retrying forever"
);

const loginSource = readFileSync(
  resolve(import.meta.dirname, "../components/Login/Login.tsx"),
  "utf8"
);

assert.match(loginSource, /const \{ isAuthenticated, status \} = useAppSelector/);
assert.match(loginSource, /const isSubmitting = status === "loading"/);
assert.match(loginSource, /if \(isSubmitting\) return;/);
assert.match(loginSource, /disabled=\{isSubmitting\}/);
