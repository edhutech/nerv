import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
if (args[0] === "--") args.shift();
const result = spawnSync(process.execPath, ["dist/index.js", ...args], { stdio: "inherit" });
process.exit(result.status ?? 1);
