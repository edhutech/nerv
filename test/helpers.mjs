import { accessSync, chmodSync, constants, copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { delimiter, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { openRepository } from "../dist/repository.js";

export { chmodSync, createHash, Database, existsSync, join, mkdirSync, mkdtempSync, openRepository, readFileSync, rmSync, symlinkSync, tmpdir, writeFileSync };

export const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const cli = join(root, "dist/index.js");
export const sqliteModule = join(root, "node_modules", "better-sqlite3");

export function assert(value, message) { if (!value) throw new Error(message); }
export function run(cwd, args, expected = 0, env = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== expected) throw new Error(`${args.join(" ")}: ${output}`);
  return output;
}
export function git(cwd, args, env = {}) { return spawnSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, ...env } }); }
function realGitPath() {
  const names = process.platform === "win32" ? ["git.exe", "git.cmd", "git.bat"] : ["git"];
  for (const directory of (process.env.PATH ?? "").split(delimiter)) for (const name of names) {
    const candidate = join(directory, name);
    try { accessSync(candidate, process.platform === "win32" ? constants.F_OK : constants.X_OK); return candidate; } catch { /* Try the next candidate. */ }
  }
  throw new Error("Unable to resolve the real Git executable.");
}
export function installGitRaceWrapper(directory) {
  const wrapper = join(directory, "git-race-wrapper.mjs");
  writeFileSync(wrapper, `import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const [command, ...args] = process.argv.slice(2);
const realGit = process.env.NERV_REAL_GIT;
const evidencePath = process.env.NERV_GIT_RACE_EVIDENCE;
const evidence = existsSync(evidencePath) ? JSON.parse(readFileSync(evidencePath, "utf8")) : [];
const record = (event, details = {}) => { evidence.push({ event, ...details }); writeFileSync(evidencePath, JSON.stringify(evidence)); };
const call = (gitArgs, options = {}) => { record("delegating", { command: gitArgs[0] }); const result = spawnSync(realGit, gitArgs, { cwd: process.cwd(), encoding: "buffer", ...options }); record("delegated", { command: gitArgs[0], status: result.status }); if (result.status !== 0) process.exit(result.status ?? 1); return result.stdout; };
const text = (gitArgs) => call(gitArgs).toString("utf8").trim();
const marker = ".git/nerv-race-fired";
record("entered", { command, shim: process.execPath, realGit });
if (command === "update-ref" && !existsSync(marker)) {
  writeFileSync(marker, "fired\\n");
  record("mutation-started", { scenario: process.env.NERV_GIT_RACE_SCENARIO });
  if (process.env.NERV_GIT_RACE_SCENARIO === "initial") {
    const [ref, , old] = args;
    const external = text(["commit-tree", text(["rev-parse", old + "^{tree}"]), "-p", old, "-m", "external ref advance"]);
    call(["update-ref", ref, external, old]);
    record("mutation-completed", { scenario: "initial" });
  } else {
    call([command, ...args], { stdio: "inherit" });
    record("publication-succeeded", { scenario: process.env.NERV_GIT_RACE_SCENARIO });
    const Database = createRequire(import.meta.url)(process.env.NERV_SQLITE_MODULE);
    const db = new Database(".nerv/nerv.db");
    try { db.exec("CREATE TRIGGER fail_close BEFORE UPDATE ON work_items WHEN NEW.status = 'closed' BEGIN SELECT RAISE(ABORT, 'forced durable Close failure'); END"); } finally { db.close(); }
    record("durable-failure-injected", { scenario: process.env.NERV_GIT_RACE_SCENARIO });
    if (process.env.NERV_GIT_RACE_SCENARIO === "compensation") {
    }
    record("mutation-completed", { scenario: process.env.NERV_GIT_RACE_SCENARIO });
    process.exit(0);
  }
}
if (command === "update-ref" && process.env.NERV_GIT_RACE_SCENARIO === "compensation" && existsSync(marker)) {
  const [ref, , published] = args;
  record("compensation-reached");
  const external = text(["commit-tree", text(["rev-parse", published + "^{tree}"]), "-p", published, "-m", "external ref advance"]);
  call(["update-ref", ref, external, published]);
  writeFileSync(process.env.NERV_GIT_RACE_BOUNDARY, [text(["rev-parse", ref]), text(["write-tree"]), call(["status", "--porcelain=v1", "-z"]).toString("base64")].join("\\n"));
  record("compensation-authority-advanced");
}
record("delegating", { command });
const result = spawnSync(realGit, [command, ...args], { stdio: "inherit" });
record("delegated", { command, status: result.status });
process.exit(result.status ?? 1);
`);
  const realGit = realGitPath(); const evidence = join(directory, "evidence.json");
  if (process.platform === "win32") {
    const preload = join(directory, "git-race-preload.cjs");
    writeFileSync(preload, `const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
if (resolve(process.execPath) === resolve(process.env.NERV_GIT_RACE_SHIM)) { const result = spawnSync(process.env.NERV_NODE_EXECUTABLE, [process.env.NERV_GIT_RACE_WRAPPER, ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, NODE_OPTIONS: "" } }); process.exit(result.status ?? 1); }
`);
    copyFileSync(process.execPath, join(directory, "git.exe"));
    return { PATH: `${directory}${delimiter}${process.env.PATH}`, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require "${preload}"`.trim(), NERV_GIT_RACE_SHIM: join(directory, "git.exe"), NERV_GIT_RACE_WRAPPER: wrapper, NERV_GIT_RACE_EVIDENCE: evidence, NERV_NODE_EXECUTABLE: process.execPath, NERV_REAL_GIT: realGit, NERV_SQLITE_MODULE: sqliteModule };
  }
  writeFileSync(join(directory, "git"), `#!${process.execPath}\nimport "./git-race-wrapper.mjs";\n`); chmodSync(join(directory, "git"), 0o755);
  return { PATH: `${directory}${delimiter}${process.env.PATH}`, NERV_GIT_RACE_EVIDENCE: evidence, NERV_REAL_GIT: realGit, NERV_SQLITE_MODULE: sqliteModule };
}
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
