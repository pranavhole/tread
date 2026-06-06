import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const loginSource = readFileSync(
  resolve(import.meta.dirname, "../components/Login/Login.tsx"),
  "utf8"
);

assert.match(
  loginSource,
  /if \(isRegister\) {\s*dispatch\(signUp\(\{ email, password \}\)\);\s*} else {\s*dispatch\(loginUser\(\{ email, password \}\)\);/s,
  "register mode should dispatch signUp, login mode should dispatch loginUser"
);
