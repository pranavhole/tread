import { spawnSync } from "node:child_process";

const [, , mode] = process.argv;
const service = (process.env.RAILWAY_SERVICE_NAME || "").toLowerCase();

const commands = {
  build: {
    backend: ["npm", ["run", "build:backend"]],
    worker: ["npm", ["run", "build:backend"]],
    tread: ["npm", ["run", "build:frontend"]],
    frontend: ["npm", ["run", "build:frontend"]],
    default: ["npm", ["run", "build:frontend"]],
  },
  start: {
    backend: ["npm", ["--prefix", "backend", "run", "start"]],
    worker: ["node", ["backend/dist/workers/matchEngine.js"]],
    tread: ["npm", ["--prefix", "frontend2", "run", "start"]],
    frontend: ["npm", ["--prefix", "frontend2", "run", "start"]],
    default: ["npm", ["--prefix", "frontend2", "run", "start"]],
  },
};

if (mode !== "build" && mode !== "start") {
  console.error("Usage: node scripts/railway-service-command.mjs <build|start>");
  process.exit(1);
}

const [command, args] = commands[mode][service] || commands[mode].default;
console.log(`Railway ${mode}: service=${service || "default"} command=${command} ${args.join(" ")}`);

const result = spawnSync(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
