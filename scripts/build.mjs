import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

rmSync("dist", { recursive: true, force: true });
const tsc = fileURLToPath(new URL("../node_modules/typescript/bin/tsc", import.meta.url));
const result = spawnSync(process.execPath, [tsc, "-p", "tsconfig.json"], { stdio: "inherit" });
process.exit(result.status ?? 1);
