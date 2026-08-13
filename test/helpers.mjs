import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { openRepository } from "../dist/repository.js";

export { chmodSync, createHash, Database, existsSync, join, mkdirSync, mkdtempSync, openRepository, readFileSync, rmSync, symlinkSync, tmpdir, writeFileSync };

export const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const cli = join(root, "dist/index.js");
export const gitPath = spawnSync("which", ["git"], { encoding: "utf8" }).stdout.trim();
export const sqliteModule = join(root, "node_modules", "better-sqlite3");

export function assert(value, message) { if (!value) throw new Error(message); }
export function run(cwd, args, expected = 0, env = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== expected) throw new Error(`${args.join(" ")}: ${output}`);
  return output;
}
export function git(cwd, args) { return spawnSync("git", args, { cwd, encoding: "utf8" }); }
export function setup(establish = true) {
  const repo = mkdtempSync(join(tmpdir(), "nerv-smoke-"));
  git(repo, ["init"]); git(repo, ["config", "user.email", "test@example.com"]); git(repo, ["config", "user.name", "Test"]);
  writeFileSync(join(repo, "README.md"), "base\n"); git(repo, ["add", "README.md"]); git(repo, ["commit", "-m", "initial"]); run(repo, ["init"]);
  if (establish) { git(repo, ["add", ".agents/skills/nerv/SKILL.md", ".nerv-context/product.md", ".nerv-context/repo.md"]); git(repo, ["commit", "-m", "establish nerv setup"]); }
  return repo;
}
export const plan = (title = "Persist plan") => ({ title, intent: "approved intent", goal: "approved goal", scope: "approved scope", expected_touchpoints: "src/database.ts", out_of_scope: "Git hardening", acceptance_criteria: "contract persists", validation: "pnpm validate", tasks: [{ title: "Persist fields", objective: "Store the plan", implementation_approach: "Use direct columns", expected_touchpoints: "src/repository.ts", acceptance_criteria: "fields round trip", validation: "pnpm test" }, { title: "Recover fields", objective: "Expose the plan", implementation_approach: "Render from SQLite", expected_touchpoints: "src/index.ts", acceptance_criteria: "show is complete", validation: "pnpm test" }] });
export function materialize(repo, value = plan()) { return /Stable ID: ([0-9a-f-]{36})/.exec(run(repo, ["work", "materialize", "--plan", JSON.stringify(value)]))?.[1]; }
export function materializedRef(repo, value = plan()) { return /Materialized (WORK-[0-9]+)/.exec(run(repo, ["work", "materialize", "--plan", JSON.stringify(value)]))?.[1]; }
export function finish(repo, position, file, ref = "WORK-001") { run(repo, ["work", "task", "start", ref, String(position)]); writeFileSync(join(repo, file), "feature\n"); run(repo, ["work", "task", "done", ref, String(position), "--evidence", "targeted passed", "--files", file]); }
export function review(repo, outcome, extra = [], ref = "WORK-001") { return run(repo, ["review", ref, "--outcome", outcome, "--summary", "complete", "--validation-evidence", "full", ...extra]); }
export function historyWork(repo, ref, id = "123e4567-e89b-42d3-a456-426614174000") { git(repo, ["commit", "--allow-empty", "-m", `history\n\nNerv-Work: ${id}\nNerv-Work-Ref: ${ref}`]); }
export const remediation = ["--findings", JSON.stringify([{ severity: "high", finding: "fix" }]), "--remediation-title", "Fix", "--remediation-objective", "Resolve", "--remediation-approach", "Change", "--remediation-touchpoints", "src/index.ts", "--remediation-acceptance-criteria", "Resolved", "--remediation-validation", "pnpm test"];
