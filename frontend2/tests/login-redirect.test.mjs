import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const loginSource = readFileSync(
  resolve(import.meta.dirname, "../components/Login/Login.tsx"),
  "utf8"
);
const loginPageSource = readFileSync(
  resolve(import.meta.dirname, "../app/login/page.tsx"),
  "utf8"
);

assert.match(loginSource, /useRouter/);
assert.match(loginSource, /useSearchParams/);
assert.match(loginSource, /const redirectTo = searchParams\.get\("from"\) \|\| "\/dashboard"/);
assert.match(loginSource, /if \(isAuthenticated\) {\s*router\.replace\(redirectTo\);/s);
assert.match(loginSource, /\[isAuthenticated,\s*redirectTo,\s*router\]/);

const authSource = readFileSync(
  resolve(import.meta.dirname, "../features/auth/authSlice.ts"),
  "utf8"
);

assert.match(authSource, /localStorage\.setItem\('token', token\)/);
assert.match(loginPageSource, /<Suspense/);
assert.match(loginPageSource, /<Login \/>/);
