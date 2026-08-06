import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
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
];

const contents = new Map();
for (const path of requiredPaths) {
  const absolutePath = `${repoRoot}/${path}`;
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing persisted path: ${path}`);
  }
  contents.set(path, readFileSync(absolutePath, "utf8"));
}

const checkpointDirectory = join(repoRoot, ".nerv/agent/runs/RUN-001/checkpoints");
const checkpoint = readdirSync(checkpointDirectory)
  .map((path) => ({ path, sequence: Number(/^checkpoint-(\d+)\.md$/.exec(path)?.[1]) }))
  .filter(({ sequence }) => Number.isInteger(sequence))
  .sort((left, right) => left.sequence - right.sequence)
  .at(-1)?.path;

if (!checkpoint) {
  throw new Error("Missing checkpoint artifact");
}

const checkpointPath = ".nerv/agent/runs/RUN-001/checkpoints/" + checkpoint;
const checkpointContent = readFileSync(join(repoRoot, checkpointPath), "utf8");

function section(content, heading) {
  const match = content.match(new RegExp(`## ${heading}\\n\\n([^\\n]+)`));
  if (!match) {
    throw new Error(`Missing ${heading} in recovery artifact`);
  }
  return match[1];
}

const run = contents.get(".nerv/agent/runs/RUN-001/run.md");
const task = contents.get(".nerv/agent/runs/RUN-001/task.md");
const activeTaskId = run?.match(/^## Active Task\n\n(TASK-\d+):/m)?.[1];
const taskId = task?.match(/^# (TASK-\d+):/m)?.[1];

if (!run?.match(/^# RUN-001$/m) || !activeTaskId || !taskId || activeTaskId !== taskId) {
  throw new Error("Run or Task artifact did not match the active Run");
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
  commands: [`node ${cli} current`, `node ${cli} status`],
  current: current.match(/RUN-\d+/)?.[0] ?? null,
  recovery: {
    task: activeTaskId,
    checkpoint: checkpointPath,
    pending: section(checkpointContent, "Pending work"),
    next: section(checkpointContent, "Next steps"),
  },
  status,
}));
