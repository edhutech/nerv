import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(root, "dist/index.js");
const temp = mkdtempSync(join(tmpdir(), "nerv-task-sync-"));
function run(args) { const result = spawnSync(process.execPath, [cli, ...args], { cwd: temp, encoding: "utf8" }); if (result.status !== 0) throw new Error(`${args.join(" ")}: ${result.stdout}${result.stderr}`); return `${result.stdout}${result.stderr}`; }
try {
  spawnSync("git", ["init", temp]);
  run(["init"]); run(["new", "task", "Synchronize task markdown"]); run(["task", "sync", "TASK-001"]);
  run(["start", "TASK-001"]); run(["review", "--run", "RUN-001", "--outcome", "passed", "--summary", "verified", "--validation", "passed", "--evidence", "test"]); run(["close", "--run", "RUN-001"]);
  const content = readFileSync(join(temp, ".nerv/agent/tasks/TASK-001.md"), "utf8");
  if (!content.includes("## Status\n\nClosed") || !content.includes("## Close summary\n\nClosed at")) throw new Error("normal close did not synchronize Task Markdown");
  if (!run(["task", "sync", "TASK-001"]).includes("Synchronized TASK-001")) throw new Error("public task sync did not run");
  console.log("ok - public Task sync and normal close keep Markdown coherent");
} finally { rmSync(temp, { recursive: true, force: true }); }
