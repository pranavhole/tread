import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const mustExist = [
  "app/page.tsx",
  "app/login/page.tsx",
  "app/dashboard/page.tsx",
  "app/profile/page.tsx",
  "app/providers.tsx",
  "components/HeroPage/HeroPage.tsx",
  "components/Dashboard/Dashboard.tsx",
  "components/ChartArea/ChartArea.tsx",
  "components/TradingPanel/TradingPanel.tsx",
  "features/auth/authSlice.ts",
  "services/api.ts",
];

for (const file of mustExist) {
  assert.ok(existsSync(resolve(root, file)), `${file} should exist`);
}

const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8")
);

for (const dependency of [
  "@reduxjs/toolkit",
  "axios",
  "chart.js",
  "lucide-react",
  "react-chartjs-2",
  "react-redux",
  "socket.io-client",
]) {
  assert.ok(
    packageJson.dependencies?.[dependency],
    `${dependency} should be installed in frontend2`
  );
}

const rootLayout = readFileSync(resolve(root, "app", "layout.tsx"), "utf8");
assert.match(rootLayout, /<Providers>/);
assert.match(rootLayout, /{children}/);
assert.match(rootLayout, /<\/Providers>/);

const heroPage = readFileSync(resolve(root, "app", "page.tsx"), "utf8");
assert.match(heroPage, /<HeroPage\s*\/>/);

const dashboardPage = readFileSync(
  resolve(root, "app", "dashboard", "page.tsx"),
  "utf8"
);
assert.match(dashboardPage, /<ProtectedShell>/);
assert.match(dashboardPage, /<Dashboard\s*\/>/);

const heroComponent = readFileSync(
  resolve(root, "components", "HeroPage", "HeroPage.tsx"),
  "utf8"
);
assert.match(heroComponent, /virtual token money/i);
assert.match(heroComponent, /stock market/i);
assert.match(heroComponent, /crypto/i);
