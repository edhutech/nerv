import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(root, "dist/index.js");

const checks = [
  {
    name: "top-level help lists MVP command groups",
    args: ["--help"],
    exitCode: 0,
    includes: ["Usage: nerv", "init", "product", "new", "build", "start <query>", "status", "clean"],
  },
  {
    name: "init help works",
    args: ["init", "--help"],
    exitCode: 0,
    includes: ["Usage: nerv init", "Initialize Nerv in the current repo."],
  },
  {
    name: "status help works",
    args: ["status", "--help"],
    exitCode: 0,
    includes: ["Usage: nerv status", "Show Nerv workspace status."],
  },
  {
    name: "new command exposes task and build",
    args: ["new", "--help"],
    exitCode: 0,
    includes: ["task <intent>", "build <intent>"],
  },
  {
    name: "build command exposes plan",
    args: ["build", "--help"],
    exitCode: 0,
    includes: ["plan <buildId>"],
  },
  {
    name: "placeholder command fails honestly",
    args: ["status"],
    exitCode: 1,
    includes: ["nerv status is not implemented yet"],
  },
];

for (const check of checks) {
  const result = spawnSync(process.execPath, [cli, ...check.args], {
    cwd: root,
    encoding: "utf8",
  });

  const output = `${result.stdout}${result.stderr}`;

  if (result.status !== check.exitCode) {
    fail(check.name, `expected exit ${check.exitCode}, got ${result.status}`, output);
  }

  for (const expected of check.includes) {
    if (!output.includes(expected)) {
      fail(check.name, `missing output: ${expected}`, output);
    }
  }

  console.log(`ok - ${check.name}`);
}

function fail(name, reason, output) {
  console.error(`not ok - ${name}`);
  console.error(reason);
  if (output.trim()) {
    console.error(output.trim());
  }
  process.exit(1);
}
