import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(root, "dist/index.js");
const assert = (value, message) => { if (!value) throw new Error(message); };
function run(cwd, args, expected = 0) { const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" }); const output = `${result.stdout}${result.stderr}`; if (result.status !== expected) throw new Error(`${args.join(" ")}: ${output}`); return output; }
function git(cwd, args) { return spawnSync("git", args, { cwd, encoding: "utf8" }); }
function setup() { const repo = mkdtempSync(join(tmpdir(), "nerv-smoke-")); git(repo, ["init"]); git(repo, ["config", "user.email", "test@example.com"]); git(repo, ["config", "user.name", "Test"]); writeFileSync(join(repo, "README.md"), "base\n"); git(repo, ["add", "README.md"]); git(repo, ["commit", "-m", "initial"]); run(repo, ["init"]); return repo; }
const plan = (title = "Persist plan") => ({ title, intent: "approved intent", goal: "approved goal", scope: "approved scope", expected_touchpoints: "src/database.ts", out_of_scope: "Git hardening", acceptance_criteria: "contract persists", validation: "pnpm validate", tasks: [{ title: "Persist fields", objective: "Store the plan", implementation_approach: "Use direct columns", expected_touchpoints: "src/repository.ts", acceptance_criteria: "fields round trip", validation: "pnpm smoke" }, { title: "Recover fields", objective: "Expose the plan", implementation_approach: "Render from SQLite", expected_touchpoints: "src/index.ts", acceptance_criteria: "show is complete", validation: "pnpm smoke" }] });
function materialize(repo, value = plan()) { const output = run(repo, ["work", "materialize", "--plan", JSON.stringify(value)]); return /Stable ID: ([0-9a-f-]{36})/.exec(output)?.[1]; }
function finish(repo, position, file, ref = "WORK-001") { run(repo, ["work", "task", "start", ref, String(position)]); writeFileSync(join(repo, file), "feature\n"); run(repo, ["work", "task", "done", ref, String(position), "--evidence", "targeted passed", "--files", file]); }
function review(repo, outcome, extra = [], ref = "WORK-001") { return run(repo, ["review", ref, "--outcome", outcome, "--summary", "complete", "--validation-evidence", "full", ...extra]); }
const remediation = ["--findings", JSON.stringify([{ severity: "high", finding: "fix" }]), "--remediation-title", "Fix", "--remediation-objective", "Resolve", "--remediation-approach", "Change", "--remediation-touchpoints", "src/index.ts", "--remediation-acceptance-criteria", "Resolved", "--remediation-validation", "pnpm smoke"];

{
  const repo = setup(); try {
    const dbPath = join(repo, ".nerv/nerv.db"); const db = new Database(dbPath, { readonly: true });
    const taskColumns = db.prepare("PRAGMA table_info(tasks)").all().map((row) => row.name); const checkpointColumns = db.prepare("PRAGMA table_info(checkpoints)").all().map((row) => row.name); const indexes = db.prepare("PRAGMA index_list(work_items)").all().map((row) => row.name); db.close();
    assert(taskColumns.includes("attribution_json") && !taskColumns.includes("block_reason") && checkpointColumns.join(",") === "id,work_item_id,task_id,summary,next_step,created_at" && indexes.includes("one_open_work_item"), "schema is not the clean lifecycle baseline");
    assert(run(repo, ["init"]).includes("already initialized"), "current schema-v1 was not idempotently accepted");
    const failureDb = new Database(dbPath); failureDb.exec("CREATE TRIGGER fail_task_insert BEFORE INSERT ON tasks WHEN NEW.title = 'Fail inside transaction' BEGIN SELECT RAISE(ABORT, 'forced task insert failure'); END"); failureDb.close();
    const failed = run(repo, ["work", "materialize", "--plan", JSON.stringify({ ...plan("failed transaction"), tasks: [{ ...plan().tasks[0], title: "Fail inside transaction" }] })], 1); const afterFailure = new Database(dbPath, { readonly: true }); assert(failed.includes("forced task insert failure") && afterFailure.prepare("SELECT COUNT(*) AS count FROM work_items").get().count === 0 && afterFailure.prepare("SELECT COUNT(*) AS count FROM tasks").get().count === 0 && afterFailure.prepare("SELECT value FROM metadata WHERE key='next_work_number'").get() === undefined, "transactional failure left rows or consumed a Work reference"); afterFailure.close();
    const id = materialize(repo); assert(id, "first Work did not materialize");
    const rejected = run(repo, ["work", "materialize", "--plan", JSON.stringify(plan("second"))], 1); const afterRejected = new Database(dbPath, { readonly: true }); assert(rejected.includes("already open") && afterRejected.prepare("SELECT COUNT(*) AS count FROM work_items").get().count === 1 && afterRejected.prepare("SELECT value FROM metadata WHERE key='next_work_number'").get().value === "2", "open Work materialization was not atomic"); afterRejected.close();
    assert(run(repo, ["work", "task", "start", "WORK-001", "2"], 1).includes("cannot start"), "later pending Task started first");
    run(repo, ["checkpoint", "WORK-001", "--summary", "work interruption", "--next-step", "continue"]); run(repo, ["work", "task", "start", "WORK-001", "1"]); run(repo, ["checkpoint", "WORK-001", "--summary", "task interruption", "--task", "1", "--next-step", "continue"]);
    const recovery = run(repo, ["work", "show", "WORK-001"]); for (const marker of [id, "State: active", "approved intent", "approved goal", "approved scope", "Expected touchpoints: src/database.ts", "Out of scope: Git hardening", "Acceptance criteria: contract persists", "Full validation: pnpm validate", "Task 1: Persist fields [active]", "Objective: Store the plan", "Implementation approach: Use direct columns", "Targeted validation: pnpm smoke", "ID: 2", "Task: Task 1: Persist fields", "Summary: task interruption", "Next step: continue", "Created at:"]) assert(recovery.includes(marker), `work recovery omitted ${marker}`);
    assert(run(repo, ["checkpoint", "WORK-001", "--summary", "wrong", "--task", "2"], 1).includes("active Work"), "pending Task checkpoint accepted");
    assert(run(repo, ["work", "task", "start", "WORK-001", "2"], 1).includes("cannot start"), "second active Task accepted");
    writeFileSync(join(repo, "one.txt"), "feature\n"); run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "targeted passed", "--files", "one.txt"]); assert(run(repo, ["checkpoint", "WORK-001", "--summary", "done", "--task", "1"], 1).includes("active Work"), "done Task checkpoint accepted");
    finish(repo, 2, "two.txt"); assert(review(repo, "REWORK", remediation).includes("REWORK"), "active completed Work did not review");
    assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan("review blocked"))], 1).includes("already open"), "rework Work allowed another Work");
    assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "bad", "--validation-evidence", "full"], 1).includes("active Work"), "Review from rework accepted");
    assert(run(repo, ["checkpoint", "WORK-001", "--summary", "bad"], 1).includes("active Work"), "rework checkpoint accepted");
    run(repo, ["work", "materialize-rework", "WORK-001", "--tasks", JSON.stringify([plan().tasks[0]])]); finish(repo, 3, "fix.txt"); review(repo, "PASS"); const reviewed = run(repo, ["work", "show", "WORK-001"]); for (const marker of ["Completion validation evidence: targeted passed", "Attribution:", "Latest review:", "ID: 2", "Outcome: PASS", "Summary: complete", "Validation evidence: full", "Created at:", "Latest checkpoint:", "Summary: task interruption"]) assert(reviewed.includes(marker), `review recovery omitted ${marker}`);
    assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "again", "--validation-evidence", "full"], 1).includes("active Work"), "Review from review accepted");
    assert(run(repo, ["checkpoint", "WORK-001", "--summary", "bad"], 1).includes("active Work"), "PASS checkpoint accepted");
    assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan("pass blocked"))], 1).includes("already open"), "PASS Work allowed another Work");
    const active = join(repo, ".nerv/agent/active/WORK-001.md"); assert(readFileSync(active, "utf8").includes("task interruption") && !run(repo, ["work", "show", "WORK-001"]).includes("Files:"), "simplified checkpoint recovery is incorrect");
    run(repo, ["close", "WORK-001", "--message", "smoke"]); assert(!existsSync(active), "closed Work retained active context");
    assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "closed", "--validation-evidence", "full"], 1).includes("active Work"), "Review from closed accepted"); assert(run(repo, ["checkpoint", "WORK-001", "--summary", "closed"], 1).includes("active Work") && !existsSync(active), "closed checkpoint recreated context");
    assert(materialize(repo, plan("after close")), "closed Work did not allow a new Work");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  for (const [table, statement, marker] of [["tasks", "ALTER TABLE tasks ADD COLUMN block_reason TEXT", "block_reason"], ["checkpoints", "ALTER TABLE checkpoints ADD COLUMN files TEXT", "files"]]) {
    const repo = setup(); try { const dbPath = join(repo, ".nerv/nerv.db"); const db = new Database(dbPath); db.exec(statement); db.close(); const before = readFileSync(dbPath); assert(run(repo, ["init"], 1).includes("unsupported generated schema"), `stale ${table} schema was accepted`); assert(readFileSync(dbPath).equals(before), `stale ${table} schema was mutated`); } finally { rmSync(repo, { recursive: true, force: true }); }
  }
  const repo = setup(); try { const dbPath = join(repo, ".nerv/nerv.db"); const db = new Database(dbPath); db.exec("DROP INDEX one_open_work_item"); db.close(); const before = readFileSync(dbPath); assert(run(repo, ["init"], 1).includes("unsupported generated schema"), "missing one-open-Work index was accepted"); assert(readFileSync(dbPath).equals(before), "missing-index database was mutated"); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try { materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); assert(run(repo, ["close", "WORK-001", "--message", "early"], 1).includes("not ready"), "Close did not require PASS"); review(repo, "PASS", ["--findings", JSON.stringify([{ severity: "low", finding: "minor" }])]); writeFileSync(join(repo, "unrelated.txt"), "unrelated\n"); assert(run(repo, ["close", "WORK-001", "--message", "unsafe"], 1).includes("unattributed"), "selective Close accepted unrelated changes"); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  for (const severity of ["critical", "high", "medium"]) {
    const repo = setup(); try {
      materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt");
      const findings = JSON.stringify([{ severity, finding: `${severity} issue` }]);
      assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "invalid", "--validation-evidence", "full", "--findings", findings], 1).includes("PASS is not permitted"), `${severity} finding did not block PASS`);
      assert(run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "missing proposal", "--validation-evidence", "full", "--findings", findings], 1).includes("execution-ready remediation Task"), `${severity} REWORK accepted no proposal`);
      review(repo, "REWORK", ["--findings", findings, "--remediation-title", "Fix", "--remediation-objective", "Resolve issue", "--remediation-approach", "Change implementation", "--remediation-touchpoints", "src/index.ts", "--remediation-acceptance-criteria", "Issue resolved", "--remediation-validation", "pnpm smoke"]);
      run(repo, ["work", "materialize-rework", "WORK-001", "--tasks", JSON.stringify([{ title: "Fix", objective: "Resolve issue", implementation_approach: "Change implementation", expected_touchpoints: "src/index.ts", acceptance_criteria: "Issue resolved", validation: "pnpm smoke" }])]);
      finish(repo, 3, "fix.txt"); assert(review(repo, "PASS").includes("PASS"), `${severity} remediation did not return to Review`);
    } finally { rmSync(repo, { recursive: true, force: true }); }
  }
  const repo = setup(); try {
    materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt");
    const residual = JSON.stringify([{ severity: "medium", finding: "accepted", accepted_as_residual_risk: true }, { severity: "low", finding: "minor" }]);
    const output = review(repo, "PASS", ["--findings", residual]);
    assert(output.includes("Residual findings") && output.includes("MEDIUM (accepted residual risk)") && output.includes("LOW") && output.includes("do not block Close"), "accepted medium and low residual findings did not coexist with PASS");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try { writeFileSync(join(repo, "README.md"), "preexisting change\n"); materialize(repo); run(repo, ["work", "task", "start", "WORK-001", "1"]); writeFileSync(join(repo, "README.md"), "base\n"); run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "restored", "--files", "README.md"]); run(repo, ["work", "task", "start", "WORK-001", "2"]); run(repo, ["work", "task", "done", "WORK-001", "2", "--evidence", "verified", "--files", "README.md"]); review(repo, "PASS"); const count = git(repo, ["rev-list", "--count", "HEAD"]).stdout.trim(); assert(run(repo, ["close", "WORK-001", "--message", "no diff"]).includes("no tracked Git diff") && git(repo, ["rev-list", "--count", "HEAD"]).stdout.trim() === count, "no-diff Close created a commit"); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const publicSkill = readFileSync(join(root, ".agents/skills/nerv/SKILL.md"), "utf8"); const marker = publicSkill.match(/^nerv_managed_sha256: "([a-f0-9]{64})"$/m); assert(!publicSkill.includes("Task scopes") && marker && marker[1] === createHash("sha256").update(publicSkill.replace(marker[0], "nerv_managed_sha256: \"\"")).digest("hex"), "public skill is invalid");
}
console.log("ok - lifecycle integrity smoke coverage");
