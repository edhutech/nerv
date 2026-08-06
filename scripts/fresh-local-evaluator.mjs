import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { spawnSync } from "node:child_process";

const [repoRoot, cli] = process.argv.slice(2);

if (!repoRoot || !cli) {
  throw new Error("Usage: node fresh-local-evaluator.mjs <repo-root> <cli-path>");
}

const requiredPaths = [
  "AGENTS.md",
  ".agents/skills/nerv-development/SKILL.md",
  ".nerv/product/product.md",
  ".nerv/repo/development.md",
  ".nerv/agent/runs/RUN-001/run.md",
  ".nerv/agent/runs/RUN-001/task.md",
  ".nerv/agent/runs/RUN-001/checkpoints/checkpoint-001.md",
];

for (const path of requiredPaths) {
  const absolutePath = `${repoRoot}/${path}`;
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing persisted path: ${path}`);
  }
  readFileSync(absolutePath, "utf8");
}

function readCli(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`CLI ${args.join(" ")} failed: ${result.stdout}${result.stderr}`);
  }
  return `${result.stdout}${result.stderr}`;
}

const current = readCli(["current"]);
const status = readCli(["status"]);

console.log(JSON.stringify({
  paths: requiredPaths.map((path) => relative(repoRoot, `${repoRoot}/${path}`)),
  current: current.match(/RUN-\d+/)?.[0] ?? null,
  status,
}));
