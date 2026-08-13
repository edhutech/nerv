import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(root, "dist/index.js");
const assert = (value, message) => { if (!value) throw new Error(message); };
function run(cwd, args, expected = 0, env = {}) { const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } }); const output = `${result.stdout}${result.stderr}`; if (result.status !== expected) throw new Error(`${args.join(" ")}: ${output}`); return output; }
function git(cwd, args) { return spawnSync("git", args, { cwd, encoding: "utf8" }); }
function setup(establish = true) { const repo = mkdtempSync(join(tmpdir(), "nerv-smoke-")); git(repo, ["init"]); git(repo, ["config", "user.email", "test@example.com"]); git(repo, ["config", "user.name", "Test"]); writeFileSync(join(repo, "README.md"), "base\n"); git(repo, ["add", "README.md"]); git(repo, ["commit", "-m", "initial"]); run(repo, ["init"]); if (establish) { git(repo, ["add", ".agents/skills/nerv/SKILL.md", ".nerv-context/product.md", ".nerv-context/repo.md"]); git(repo, ["commit", "-m", "establish nerv setup"]); } return repo; }
const plan = (title = "Persist plan") => ({ title, intent: "approved intent", goal: "approved goal", scope: "approved scope", expected_touchpoints: "src/database.ts", out_of_scope: "Git hardening", acceptance_criteria: "contract persists", validation: "pnpm validate", tasks: [{ title: "Persist fields", objective: "Store the plan", implementation_approach: "Use direct columns", expected_touchpoints: "src/repository.ts", acceptance_criteria: "fields round trip", validation: "pnpm smoke" }, { title: "Recover fields", objective: "Expose the plan", implementation_approach: "Render from SQLite", expected_touchpoints: "src/index.ts", acceptance_criteria: "show is complete", validation: "pnpm smoke" }] });
function materialize(repo, value = plan()) { const output = run(repo, ["work", "materialize", "--plan", JSON.stringify(value)]); return /Stable ID: ([0-9a-f-]{36})/.exec(output)?.[1]; }
function finish(repo, position, file, ref = "WORK-001") { run(repo, ["work", "task", "start", ref, String(position)]); writeFileSync(join(repo, file), "feature\n"); run(repo, ["work", "task", "done", ref, String(position), "--evidence", "targeted passed", "--files", file]); }
function review(repo, outcome, extra = [], ref = "WORK-001") { return run(repo, ["review", ref, "--outcome", outcome, "--summary", "complete", "--validation-evidence", "full", ...extra]); }
const remediation = ["--findings", JSON.stringify([{ severity: "high", finding: "fix" }]), "--remediation-title", "Fix", "--remediation-objective", "Resolve", "--remediation-approach", "Change", "--remediation-touchpoints", "src/index.ts", "--remediation-acceptance-criteria", "Resolved", "--remediation-validation", "pnpm smoke"];

{
  const repo = setup(false); try {
    const initial = run(repo, ["init"]); assert(initial.includes("Repository setup: not established") && git(repo, ["check-ignore", "-v", ".nerv/nerv.db"]).status === 0, "fresh init did not report unestablished setup or locally ignore .nerv");
    assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan())], 1).includes("setup/context must be committed"), "uncommitted setup materialized a Work");
    git(repo, ["add", ".nerv-context/product.md"]); assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan())], 1).includes("setup/context must be committed"), "clean index bypassed untracked setup"); git(repo, ["reset", "--", ".nerv-context/product.md"]);
    git(repo, ["add", ".agents/skills/nerv/SKILL.md", ".nerv-context/product.md", ".nerv-context/repo.md"]); git(repo, ["commit", "-m", "establish nerv setup"]); assert(materialize(repo), "committed setup did not permit materialization without reinit");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); const worktree = mkdtempSync(join(tmpdir(), "nerv-worktree-")); rmSync(worktree, { recursive: true, force: true }); try {
    assert(git(repo, ["worktree", "add", "-b", "smoke-linked", worktree]).status === 0, "linked worktree was not created"); run(worktree, ["init"]); assert(git(worktree, ["check-ignore", "-v", ".nerv/nerv.db"]).status === 0, "Git-resolved linked-worktree exclusion did not ignore .nerv");
  } finally { git(repo, ["worktree", "remove", "--force", worktree]); rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    git(repo, ["rm", "--cached", ".nerv-context/product.md"]); assert(run(repo, ["init"]).includes("not established"), "existing untracked canonical setup was reported established"); assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan())], 1).includes("setup/context must be committed"), "existing untracked canonical setup materialized a Work"); git(repo, ["add", ".nerv-context/product.md"]); git(repo, ["commit", "-m", "restore setup"]); rmSync(join(repo, ".nerv"), { recursive: true, force: true }); run(repo, ["init"]); writeFileSync(join(repo, ".nerv-context/repo.md"), "drift\n"); assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan())], 1).includes("setup/context must be committed"), "regenerated local state bypassed canonical setup gate");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  for (const path of [".nerv-context/product.md", ".nerv-context/repo.md", ".agents/skills/nerv/SKILL.md"]) {
    const repo = setup(); try {
      materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); review(repo, "PASS"); run(repo, ["close", "WORK-001", "--message", "close"]);
      writeFileSync(join(repo, path), "manual drift\n"); assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan("next"))], 1).includes("setup/context must be committed"), `${path} drift did not block next Work`);
      git(repo, ["add", path]); git(repo, ["commit", "-m", "resolve canonical drift"]); assert(materialize(repo, plan("next")), `${path} resolution did not permit next Work`);
    } finally { rmSync(repo, { recursive: true, force: true }); }
  }
}
{
  const repo = setup(); try { writeFileSync(join(repo, "unrelated.txt"), "dirty\n"); assert(materialize(repo), "unrelated dirty path blocked new Work"); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); review(repo, "REWORK", remediation);
    writeFileSync(join(repo, ".nerv-context/product.md"), "canonical drift\n");
    run(repo, ["work", "materialize-rework", "WORK-001", "--tasks", JSON.stringify([plan().tasks[0]])]);
    const db = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); const item = db.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get(); const tasks = db.prepare("SELECT position, status FROM tasks WHERE work_item_id=(SELECT id FROM work_items WHERE ref='WORK-001') ORDER BY position").all(); const count = db.prepare("SELECT COUNT(*) AS count FROM work_items").get().count; db.close();
    assert(item.status === "active" && count === 1 && JSON.stringify(tasks) === JSON.stringify([{ position: 1, status: "done" }, { position: 2, status: "done" }, { position: 3, status: "pending" }]) && readFileSync(join(repo, ".nerv-context/product.md"), "utf8") === "canonical drift\n", "canonical drift blocked or normalized same-Work remediation");
    finish(repo, 3, "fix.txt"); review(repo, "PASS"); run(repo, ["close", "WORK-001", "--message", "close rework"]);
    assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan("next"))], 1).includes("setup/context must be committed"), "canonical drift did not block a subsequent new Work");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}

{
  const repo = setup(); try {
    const dbPath = join(repo, ".nerv/nerv.db"); const db = new Database(dbPath, { readonly: true });
    const taskColumns = db.prepare("PRAGMA table_info(tasks)").all().map((row) => row.name); const checkpointColumns = db.prepare("PRAGMA table_info(checkpoints)").all().map((row) => row.name); const reviewColumns = db.prepare("PRAGMA table_info(work_reviews)").all().map((row) => row.name); const indexes = db.prepare("PRAGMA index_list(work_items)").all().map((row) => row.name); const metadata = db.prepare("SELECT key FROM metadata").all().map((row) => row.key); db.close();
    assert(taskColumns.includes("attribution_json") && !taskColumns.includes("block_reason") && checkpointColumns.join(",") === "id,work_item_id,task_id,summary,next_step,created_at" && reviewColumns.join(",") === "id,work_item_id,outcome,summary,findings,validation_evidence,git_fingerprint_json,verification_evidence,created_at" && indexes.includes("one_open_work_item") && !metadata.includes("product_context_updated_at") && !metadata.includes("repo_context_updated_at"), "schema is not the clean lifecycle baseline");
    assert(run(repo, ["init"]).includes("already initialized"), "current schema-v1 was not idempotently accepted");
    const failureDb = new Database(dbPath); failureDb.exec("CREATE TRIGGER fail_task_insert BEFORE INSERT ON tasks WHEN NEW.title = 'Fail inside transaction' BEGIN SELECT RAISE(ABORT, 'forced task insert failure'); END"); failureDb.close();
    const failed = run(repo, ["work", "materialize", "--plan", JSON.stringify({ ...plan("failed transaction"), tasks: [{ ...plan().tasks[0], title: "Fail inside transaction" }] })], 1); const afterFailure = new Database(dbPath, { readonly: true }); assert(failed.includes("forced task insert failure") && afterFailure.prepare("SELECT COUNT(*) AS count FROM work_items").get().count === 0 && afterFailure.prepare("SELECT COUNT(*) AS count FROM tasks").get().count === 0 && afterFailure.prepare("SELECT value FROM metadata WHERE key='next_work_number'").get() === undefined, "transactional failure left rows or consumed a Work reference"); afterFailure.close();
    const id = materialize(repo); assert(id, "first Work did not materialize"); const baseline = JSON.parse(new Database(dbPath, { readonly: true }).prepare("SELECT git_baseline_json FROM work_items WHERE ref='WORK-001'").get().git_baseline_json); assert(JSON.stringify(Object.keys(baseline).sort()) === JSON.stringify(["head", "protected_paths", "protected_tree"]) && !("dirty" in baseline), "activation baseline retains obsolete dirty state");
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
     run(repo, ["work", "materialize-rework", "WORK-001", "--tasks", JSON.stringify([plan().tasks[0]])]); finish(repo, 3, "fix.txt"); review(repo, "PASS"); const reviewed = run(repo, ["work", "show", "WORK-001"]); for (const marker of ["Completion validation evidence: targeted passed", "Attribution:", "Latest review:", "ID: 2", "Outcome: PASS", "Summary: complete", "Validation evidence: full", "Git fingerprint:", "Created at:", "Latest checkpoint:", "Summary: task interruption"]) assert(reviewed.includes(marker), `review recovery omitted ${marker}`);
    assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "again", "--validation-evidence", "full"], 1).includes("Only REWORK"), "Review from review accepted");
    assert(run(repo, ["checkpoint", "WORK-001", "--summary", "bad"], 1).includes("active Work"), "PASS checkpoint accepted");
    assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan("pass blocked"))], 1).includes("already open"), "PASS Work allowed another Work");
    const active = join(repo, ".nerv/agent/active/WORK-001.md"); assert(readFileSync(active, "utf8").includes("task interruption") && !run(repo, ["work", "show", "WORK-001"]).includes("Files:"), "simplified checkpoint recovery is incorrect");
    run(repo, ["close", "WORK-001", "--message", "smoke"]); assert(!existsSync(active), "closed Work retained active context");
    assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "closed", "--validation-evidence", "full"], 1).includes("active Work"), "Review from closed accepted"); assert(run(repo, ["checkpoint", "WORK-001", "--summary", "closed"], 1).includes("active Work") && !existsSync(active), "closed checkpoint recreated context");
    assert(materialize(repo, plan("after close")), "closed Work did not allow a new Work");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  for (const [environment, message] of [[{ NERV_TEST_FAIL_COMMIT_CREATE: "1" }, "simulated commit creation failure"], [{ NERV_TEST_FAIL_PUBLICATION: "1" }, "simulated guarded publication failure"]]) {
    const repo = setup(); try { materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); review(repo, "PASS"); const baseline = git(repo, ["rev-parse", "HEAD"]).stdout.trim(); const failure = run(repo, ["close", "WORK-001", "--message", "injected failure"], 1, environment); assert(failure.includes(message) && git(repo, ["rev-parse", "HEAD"]).stdout.trim() === baseline && git(repo, ["diff", "--cached", "--name-only"]).stdout.trim() === "" && git(repo, ["status", "--porcelain"]).stdout.includes("one.txt"), `${message} was not safely recoverable`); const db = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); assert(db.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get().status === "review", `${message} closed Work`); db.close(); run(repo, ["close", "WORK-001", "--message", "retry"]); } finally { rmSync(repo, { recursive: true, force: true }); }
  }
  const repo = setup(); try { materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); review(repo, "PASS"); const beforeHead = git(repo, ["rev-parse", "HEAD"]).stdout.trim(); const failure = run(repo, ["close", "WORK-001", "--message", "consistency failure"], 1, { NERV_TEST_FAIL_CLOSE_PERSISTENCE: "1", NERV_TEST_EXTERNAL_REF_ADVANCE: "1", NERV_TEST_CAPTURE_BOUNDARY: "1" }); const boundary = JSON.parse(/NERV_TEST_BOUNDARY:(.+)/.exec(failure)?.[1] ?? "null"); const after = { ref: git(repo, ["rev-parse", "HEAD"]).stdout.trim(), index: git(repo, ["write-tree"]).stdout.trim(), status: Buffer.from(git(repo, ["status", "--porcelain=v1", "-z"]).stdout).toString("base64") }; assert(failure.includes("Git/Nerv consistency failure") && failure.includes(beforeHead) && failure.includes(boundary.ref) && boundary.ref !== beforeHead && JSON.stringify(after) === JSON.stringify(boundary), "compensation CAS mutated Git after the captured boundary"); const db = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); assert(db.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get().status === "review", "consistency failure closed Work"); db.close(); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); review(repo, "PASS");
    const baseline = git(repo, ["rev-parse", "HEAD"]).stdout.trim(); const failed = run(repo, ["close", "WORK-001", "--message", "durable failure"], 1, { NERV_TEST_FAIL_CLOSE_PERSISTENCE: "1" });
    assert(failed.includes("simulated durable Close persistence failure"), "durable Close failure was not surfaced"); assert(git(repo, ["rev-parse", "HEAD"]).stdout.trim() === baseline, "durable Close failure did not compensate publication"); assert(git(repo, ["diff", "--cached", "--name-only"]).stdout.trim() === "", "durable Close failure retained Nerv staging"); assert(git(repo, ["status", "--porcelain"]).stdout.includes("one.txt"), "durable Close failure changed the working tree");
    const db = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); assert(db.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get().status === "review", "durable Close failure closed Work"); db.close();
    run(repo, ["close", "WORK-001", "--message", "retry"]); assert(git(repo, ["rev-parse", "HEAD"]).stdout.trim() !== baseline, "Close retry did not publish after compensation");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  for (const [table, statement, marker] of [["tasks", "ALTER TABLE tasks ADD COLUMN block_reason TEXT", "block_reason"], ["checkpoints", "ALTER TABLE checkpoints ADD COLUMN files TEXT", "files"], ["work_reviews", "ALTER TABLE work_reviews ADD COLUMN extra TEXT", "extra"]]) {
    const repo = setup(); try { const dbPath = join(repo, ".nerv/nerv.db"); const db = new Database(dbPath); db.exec(statement); db.close(); const before = readFileSync(dbPath); assert(run(repo, ["init"], 1).includes("unsupported generated schema"), `stale ${table} schema was accepted`); assert(readFileSync(dbPath).equals(before), `stale ${table} schema was mutated`); } finally { rmSync(repo, { recursive: true, force: true }); }
  }
  const repo = setup(); try { const dbPath = join(repo, ".nerv/nerv.db"); const db = new Database(dbPath); db.exec("DROP INDEX one_open_work_item"); db.close(); const before = readFileSync(dbPath); assert(run(repo, ["init"], 1).includes("unsupported generated schema"), "missing one-open-Work index was accepted"); assert(readFileSync(dbPath).equals(before), "missing-index database was mutated"); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try { materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); assert(run(repo, ["close", "WORK-001", "--message", "early"], 1).includes("not ready"), "Close did not require PASS"); review(repo, "PASS", ["--findings", JSON.stringify([{ severity: "low", finding: "minor" }])]); writeFileSync(join(repo, "unrelated.txt"), "unrelated\n"); run(repo, ["close", "WORK-001", "--message", "exact tree"]); assert(git(repo, ["show", "--format=", "--name-only", "HEAD"]).stdout.trim().split("\n").sort().join(",") === "one.txt,two.txt" && existsSync(join(repo, "unrelated.txt")), "Close did not commit the exact PASS-reviewed tree"); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    materialize(repo); finish(repo, 1, "nested path.txt"); finish(repo, 2, "two.txt"); review(repo, "PASS");
    const db = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); const fingerprint = JSON.parse(db.prepare("SELECT git_fingerprint_json FROM work_reviews ORDER BY id DESC LIMIT 1").get().git_fingerprint_json); const baseline = JSON.parse(db.prepare("SELECT git_baseline_json FROM work_items WHERE ref='WORK-001'").get().git_baseline_json); db.close();
    const hook = join(repo, ".git/hooks/pre-commit"); writeFileSync(hook, "#!/bin/sh\necho hook >> hook-mutated.txt\nexit 1\n"); chmodSync(hook, 0o755); run(repo, ["close", "WORK-001", "--message", "exact identity"]);
    const actual = git(repo, ["rev-parse", "HEAD"]).stdout.trim(); assert(git(repo, ["rev-parse", "HEAD^"]).stdout.trim() === baseline.head && git(repo, ["rev-parse", "HEAD^{tree}"]).stdout.trim() === fingerprint.tree && !existsSync(join(repo, "hook-mutated.txt")) && git(repo, ["log", "-1", "--format=%B"]).stdout.includes("Nerv-Work:") && git(repo, ["log", "-1", "--format=%B"]).stdout.includes("Nerv-Work-Ref: WORK-001"), "exact-tree Close did not create the reviewed commit");
    const closed = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); assert(closed.prepare("SELECT commit_hash FROM work_items WHERE ref='WORK-001'").get().commit_hash === actual, "Close did not persist actual commit hash"); closed.close();
  } finally { rmSync(repo, { recursive: true, force: true }); }
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
  const repo = setup(); try { writeFileSync(join(repo, "README.md"), "preexisting change\n"); materialize(repo); run(repo, ["work", "task", "start", "WORK-001", "1"]); assert(run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "unsafe", "--files", "README.md"], 1).includes("Baseline-dirty"), "protected baseline path was attributable"); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try { materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); review(repo, "PASS"); writeFileSync(join(repo, "one.txt"), "changed after PASS\n"); assert(run(repo, ["close", "WORK-001", "--message", "stale"], 1).includes("changed after PASS"), "Close accepted a changed PASS fingerprint"); assert(run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "mutated", "--validation-evidence", "full", ...remediation, "--verification-evidence", "external verification failed"], 1).includes("changed after PASS"), "mutated PASS downgraded to REWORK"); writeFileSync(join(repo, "one.txt"), "feature\n"); const downgrade = review(repo, "REWORK", [...remediation, "--verification-evidence", "external verification failed"]); assert(downgrade.includes("REWORK"), "verification could not downgrade PASS to REWORK"); assert(run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "again", "--validation-evidence", "full", ...remediation], 1).includes("active Work"), "REWORK was accepted without PASS verification evidence"); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const publicSkill = readFileSync(join(root, ".agents/skills/nerv/SKILL.md"), "utf8"); const marker = publicSkill.match(/^nerv_managed_sha256: "([a-f0-9]{64})"$/m); assert(!publicSkill.includes("Task scopes") && marker && marker[1] === createHash("sha256").update(publicSkill.replace(marker[0], "nerv_managed_sha256: \"\"")).digest("hex"), "public skill is invalid");
}
console.log("ok - lifecycle integrity smoke coverage");
