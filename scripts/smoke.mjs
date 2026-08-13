import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { openRepository } from "../dist/repository.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(root, "dist/index.js");
const assert = (value, message) => { if (!value) throw new Error(message); };
function run(cwd, args, expected = 0, env = {}) { const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } }); const output = `${result.stdout}${result.stderr}`; if (result.status !== expected) throw new Error(`${args.join(" ")}: ${output}`); return output; }
function git(cwd, args) { return spawnSync("git", args, { cwd, encoding: "utf8" }); }
const gitPath = spawnSync("which", ["git"], { encoding: "utf8" }).stdout.trim();
const sqliteModule = join(root, "node_modules", "better-sqlite3");
function setup(establish = true) { const repo = mkdtempSync(join(tmpdir(), "nerv-smoke-")); git(repo, ["init"]); git(repo, ["config", "user.email", "test@example.com"]); git(repo, ["config", "user.name", "Test"]); writeFileSync(join(repo, "README.md"), "base\n"); git(repo, ["add", "README.md"]); git(repo, ["commit", "-m", "initial"]); run(repo, ["init"]); if (establish) { git(repo, ["add", ".agents/skills/nerv/SKILL.md", ".nerv-context/product.md", ".nerv-context/repo.md"]); git(repo, ["commit", "-m", "establish nerv setup"]); } return repo; }
const plan = (title = "Persist plan") => ({ title, intent: "approved intent", goal: "approved goal", scope: "approved scope", expected_touchpoints: "src/database.ts", out_of_scope: "Git hardening", acceptance_criteria: "contract persists", validation: "pnpm validate", tasks: [{ title: "Persist fields", objective: "Store the plan", implementation_approach: "Use direct columns", expected_touchpoints: "src/repository.ts", acceptance_criteria: "fields round trip", validation: "pnpm smoke" }, { title: "Recover fields", objective: "Expose the plan", implementation_approach: "Render from SQLite", expected_touchpoints: "src/index.ts", acceptance_criteria: "show is complete", validation: "pnpm smoke" }] });
function materialize(repo, value = plan()) { const output = run(repo, ["work", "materialize", "--plan", JSON.stringify(value)]); return /Stable ID: ([0-9a-f-]{36})/.exec(output)?.[1]; }
function materializedRef(repo, value = plan()) { return /Materialized (WORK-[0-9]+)/.exec(run(repo, ["work", "materialize", "--plan", JSON.stringify(value)]))?.[1]; }
function finish(repo, position, file, ref = "WORK-001") { run(repo, ["work", "task", "start", ref, String(position)]); writeFileSync(join(repo, file), "feature\n"); run(repo, ["work", "task", "done", ref, String(position), "--evidence", "targeted passed", "--files", file]); }
function review(repo, outcome, extra = [], ref = "WORK-001") { return run(repo, ["review", ref, "--outcome", outcome, "--summary", "complete", "--validation-evidence", "full", ...extra]); }
function historyWork(repo, ref, id = "123e4567-e89b-42d3-a456-426614174000") { git(repo, ["commit", "--allow-empty", "-m", `history\n\nNerv-Work: ${id}\nNerv-Work-Ref: ${ref}`]); }
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
  const repo = mkdtempSync(join(tmpdir(), "nerv-unborn-")); try {
    git(repo, ["init"]); git(repo, ["config", "user.email", "test@example.com"]); git(repo, ["config", "user.name", "Test"]);
    assert(run(repo, ["init"]).includes("Initialized Nerv"), "unborn repository init failed");
    git(repo, ["add", ".agents/skills/nerv/SKILL.md", ".nerv-context/product.md", ".nerv-context/repo.md"]); git(repo, ["commit", "-m", "establish nervous setup"]);
    assert(materializedRef(repo) === "WORK-001", "unborn repository did not seed WORK-001");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    git(repo, ["commit", "--allow-empty", "-m", "ordinary discussion mentions WORK-999 but has no Nerv trailers"]);
    rmSync(join(repo, ".nerv"), { recursive: true, force: true }); run(repo, ["init"]);
    assert(materializedRef(repo) === "WORK-001", "plain WORK text affected fresh sequence recovery");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    const first = materializedRef(repo); finish(repo, 1, "one.txt", first); finish(repo, 2, "two.txt", first); review(repo, "PASS", [], first); run(repo, ["close", first, "--message", "first"]);
    const second = materializedRef(repo); finish(repo, 1, "three.txt", second); finish(repo, 2, "four.txt", second); review(repo, "PASS", [], second); run(repo, ["close", second, "--message", "second"]);
    assert(materializedRef(repo) === "WORK-003", "persistent SQLite allocation did not continue through WORK-003");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    const first = materializedRef(repo); finish(repo, 1, "one.txt", first); finish(repo, 2, "two.txt", first); review(repo, "PASS", [], first); run(repo, ["close", first, "--message", "first"]);
    const second = materializedRef(repo); finish(repo, 1, "three.txt", second); finish(repo, 2, "four.txt", second); review(repo, "PASS", [], second); run(repo, ["close", second, "--message", "second"]);
    const third = materializedRef(repo); finish(repo, 1, "five.txt", third); finish(repo, 2, "six.txt", third); review(repo, "PASS", [], third); run(repo, ["close", third, "--message", "third"]);
    rmSync(join(repo, ".nerv"), { recursive: true, force: true }); run(repo, ["init"]);
    assert(materializedRef(repo) === "WORK-004", "fresh local state did not continue after committed Work history");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    for (const [number, ref] of [[1, "WORK-001"], [10, "WORK-010"], [11, "WORK-011"], [999, "WORK-999"], [1000, "WORK-1000"]]) historyWork(repo, ref, `123e4567-e89b-42d3-a456-42661417${String(number).padStart(4, "0")}`);
    historyWork(repo, "WORK-001", "123e4567-e89b-42d3-a456-426614174999");
    for (const ref of ["WORK-1", "WORK-01", "WORK-000", "WORK-0001", "WORK-0010", "WORK-+1", "WORK--1", "WORK-1.0", "WORK- 001", "WORK-001 ", "work-001", "WORK-09999"]) historyWork(repo, ref, "123e4567-e89b-42d3-a456-426614174998");
    git(repo, ["commit", "--allow-empty", "-m", "arbitrary WORK-999\n\nNerv-Work: invalid\nNerv-Work-Ref: WORK-999"]);
    git(repo, ["commit", "--allow-empty", "-m", "unpaired\n\nNerv-Work-Ref: WORK-998"]);
    git(repo, ["commit", "--allow-empty", "-m", "malformed\n\nNerv-Work: 123e4567-e89b-42d3-a456-426614174000\nNerv-Work-Ref: WORK-000"]);
    rmSync(join(repo, ".nerv"), { recursive: true, force: true }); run(repo, ["init"]);
    const seeded = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }).prepare("SELECT value FROM metadata WHERE key='next_work_number'").get().value; const recovered = materializedRef(repo); assert(recovered === "WORK-1001", `fresh state did not recover highest valid canonical HEAD trailer: ${recovered}; seed ${seeded}`);
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    historyWork(repo, "WORK-003"); const branch = git(repo, ["branch", "--show-current"]).stdout.trim(); git(repo, ["checkout", "-b", "other"]); historyWork(repo, "WORK-999"); git(repo, ["checkout", branch]);
    rmSync(join(repo, ".nerv"), { recursive: true, force: true }); run(repo, ["init"]);
    assert(materializedRef(repo) === "WORK-004", "unreachable branch history affected sequence recovery");
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
    const recovery = run(repo, ["work", "show", "WORK-001"]); assert(recovery.includes("Persisted remediation proposal") && recovery.includes("Fix") && recovery.includes("Expected touchpoints: src/index.ts"), "fresh REWORK recovery omitted the persisted remediation contract");
    writeFileSync(join(repo, ".nerv-context/product.md"), "canonical drift\n");
    run(repo, ["work", "materialize-rework", "WORK-001"]);
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
    assert(taskColumns.includes("attribution_json") && !taskColumns.includes("block_reason") && checkpointColumns.join(",") === "id,work_item_id,task_id,summary,next_step,created_at" && reviewColumns.join(",") === "id,work_item_id,outcome,summary,findings,remediation_json,validation_evidence,git_fingerprint_json,verification_evidence,created_at" && indexes.includes("one_open_work_item") && !metadata.includes("product_context_updated_at") && !metadata.includes("repo_context_updated_at"), "schema is not the clean lifecycle baseline");
    assert(run(repo, ["init"]).includes("already initialized"), "current schema-v1 was not idempotently accepted");
    const failureDb = new Database(dbPath); failureDb.exec("CREATE TRIGGER fail_task_insert BEFORE INSERT ON tasks WHEN NEW.title = 'Fail inside transaction' BEGIN SELECT RAISE(ABORT, 'forced task insert failure'); END"); failureDb.close();
    const repository = openRepository(dbPath); let failure; try { repository.materializePlan({ ...plan("failed transaction"), tasks: [{ ...plan().tasks[0], title: "Fail inside transaction" }], git_baseline_json: "{}" }); } catch (error) { failure = error; } finally { repository.close(); } const afterFailure = new Database(dbPath); assert(failure instanceof Error && failure.message.includes("forced task insert failure") && afterFailure.prepare("SELECT COUNT(*) AS count FROM work_items").get().count === 0 && afterFailure.prepare("SELECT COUNT(*) AS count FROM tasks").get().count === 0 && afterFailure.prepare("SELECT value FROM metadata WHERE key='next_work_number'").get().value === "1", "transactional failure left rows or consumed a Work reference"); afterFailure.exec("DROP TRIGGER fail_task_insert"); afterFailure.close();
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
     run(repo, ["work", "materialize-rework", "WORK-001"]); finish(repo, 3, "fix.txt"); review(repo, "PASS");
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
  const repo = setup(); try {
    materialize(repo); run(repo, ["work", "task", "start", "WORK-001", "1"]);
    writeFileSync(join(repo, "binary.bin"), Buffer.from([0, 1, 2, 255])); writeFileSync(join(repo, "executable.sh"), "#!/bin/sh\nexit 0\n"); chmodSync(join(repo, "executable.sh"), 0o755); symlinkSync("missing-target", join(repo, "dangling-link"));
    run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "Git identity preserved", "--files", "binary.bin", "executable.sh", "dangling-link"]); finish(repo, 2, "two.txt"); review(repo, "PASS"); run(repo, ["close", "WORK-001", "--message", "special Git entries"]);
    assert(git(repo, ["ls-tree", "HEAD", "binary.bin"]).stdout.includes("100644") && git(repo, ["ls-tree", "HEAD", "executable.sh"]).stdout.includes("100755") && git(repo, ["ls-tree", "HEAD", "dangling-link"]).stdout.includes("120000"), "Git-native special file identity was not preserved");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  for (const [table, statement, marker] of [["metadata", "ALTER TABLE metadata ADD COLUMN legacy TEXT", "legacy"], ["tasks", "ALTER TABLE tasks ADD COLUMN block_reason TEXT", "block_reason"], ["checkpoints", "ALTER TABLE checkpoints ADD COLUMN files TEXT", "files"], ["work_reviews", "ALTER TABLE work_reviews ADD COLUMN extra TEXT", "extra"], ["extra_table", "CREATE TABLE extra_table (id TEXT)", "extra_table"], ["extra_index", "CREATE INDEX extra_index ON tasks(title)", "extra_index"], ["extra_view", "CREATE VIEW extra_view AS SELECT id FROM tasks", "extra_view"], ["extra_trigger", "CREATE TRIGGER extra_trigger AFTER INSERT ON tasks BEGIN SELECT 1; END", "extra_trigger"]]) {
    const repo = setup(); try { const dbPath = join(repo, ".nerv/nerv.db"); const db = new Database(dbPath); db.exec(statement); db.close(); const before = readFileSync(dbPath); assert(run(repo, ["init"], 1).includes("unsupported generated schema"), `stale ${table} schema was accepted`); assert(readFileSync(dbPath).equals(before), `stale ${table} schema was mutated`); } finally { rmSync(repo, { recursive: true, force: true }); }
  }
  const repo = setup(); try { const dbPath = join(repo, ".nerv/nerv.db"); const db = new Database(dbPath); db.exec("DROP INDEX one_open_work_item"); db.close(); const before = readFileSync(dbPath); assert(run(repo, ["init"], 1).includes("unsupported generated schema"), "missing one-open-Work index was accepted"); assert(readFileSync(dbPath).equals(before), "missing-index database was mutated"); } finally { rmSync(repo, { recursive: true, force: true }); }
  const metadataRepo = setup(); try { const dbPath = join(metadataRepo, ".nerv/nerv.db"); const db = new Database(dbPath); db.prepare("INSERT INTO metadata VALUES ('obsolete', 'value', 'now')").run(); db.close(); assert(run(metadataRepo, ["init"], 1).includes("unsupported generated schema"), "obsolete metadata was accepted"); } finally { rmSync(metadataRepo, { recursive: true, force: true }); }
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
       run(repo, ["work", "materialize-rework", "WORK-001"]);
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
  const repo = setup(); try {
    mkdirSync(join(repo, "src")); writeFileSync(join(repo, "src", "protected.txt"), "dirty\n"); materialize(repo); run(repo, ["work", "task", "start", "WORK-001", "1"]);
    assert(run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "unsafe", "--files", "src"], 1).includes("Invalid attributable"), "directory attribution swallowed protected path");
    writeFileSync(join(repo, "src", "normal.txt"), "feature\n"); assert(run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "exact", "--files", "src/normal.txt"], 0).includes("Completed"), "exact nested file was rejected");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    materialize(repo); run(repo, ["work", "task", "start", "WORK-001", "1"]); writeFileSync(join(repo, "space name.txt"), "feature\n"); writeFileSync(join(repo, ":(glob)literal.txt"), "feature\n");
    run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "exact paths", "--files", "space name.txt", ":(glob)literal.txt"]); finish(repo, 2, "two.txt"); review(repo, "PASS"); run(repo, ["close", "WORK-001", "--message", "literal paths"]);
    assert(git(repo, ["show", "--format=", "--name-only", "HEAD"]).stdout.includes(":(glob)literal.txt"), "literal pathspec-like filename was not committed");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    writeFileSync(join(repo, "delete.txt"), "base\n"); git(repo, ["add", "delete.txt"]); git(repo, ["commit", "-m", "deletion base"]); materialize(repo); run(repo, ["work", "task", "start", "WORK-001", "1"]); rmSync(join(repo, "delete.txt")); run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "deletion", "--files", "delete.txt"]); finish(repo, 2, "two.txt"); review(repo, "PASS"); run(repo, ["close", "WORK-001", "--message", "deletion"]); assert(!existsSync(join(repo, "delete.txt")), "exact deletion was not committed");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    materialize(repo); run(repo, ["work", "task", "start", "WORK-001", "1"]); run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "no tracked change"]); run(repo, ["work", "task", "start", "WORK-001", "2"]); run(repo, ["work", "task", "done", "WORK-001", "2", "--evidence", "no tracked change"]); const before = git(repo, ["rev-parse", "HEAD"]).stdout.trim(); review(repo, "PASS"); run(repo, ["close", "WORK-001", "--message", "no diff"]); const db = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); assert(git(repo, ["rev-parse", "HEAD"]).stdout.trim() === before && db.prepare("SELECT commit_hash FROM work_items WHERE ref='WORK-001'").get().commit_hash === null, "no-diff Close manufactured a commit"); db.close();
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try { materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); review(repo, "PASS"); writeFileSync(join(repo, "one.txt"), "changed after PASS\n"); assert(run(repo, ["close", "WORK-001", "--message", "stale"], 1).includes("changed after PASS"), "Close accepted a changed PASS fingerprint"); assert(run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "mutated", "--validation-evidence", "full", ...remediation, "--verification-evidence", "external verification failed"], 1).includes("changed after PASS"), "mutated PASS downgraded to REWORK"); writeFileSync(join(repo, "one.txt"), "feature\n"); const downgrade = review(repo, "REWORK", [...remediation, "--verification-evidence", "external verification failed"]); assert(downgrade.includes("REWORK"), "verification could not downgrade PASS to REWORK"); assert(run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "again", "--validation-evidence", "full", ...remediation], 1).includes("active Work"), "REWORK was accepted without PASS verification evidence"); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); const bin = mkdtempSync(join(tmpdir(), "nerv-git-race-")); try {
    materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); review(repo, "PASS");
    writeFileSync(join(bin, "git"), `#!/bin/sh\nif [ "$1" = update-ref ] && [ ! -e .git/nerv-race-fired ]; then\n  touch .git/nerv-race-fired\n  ref="$2"; old="$4"\n  external=$(${gitPath} commit-tree "$(${gitPath} rev-parse \"$old^{tree}\")" -p "$old" -m "external ref advance")\n  ${gitPath} update-ref "$ref" "$external" "$old"\nfi\nexec ${gitPath} "$@"\n`); chmodSync(join(bin, "git"), 0o755);
    const before = git(repo, ["rev-parse", "HEAD"]).stdout.trim(); const failed = run(repo, ["close", "WORK-001", "--message", "race"], 1, { PATH: `${bin}:${process.env.PATH}` }); const after = git(repo, ["rev-parse", "HEAD"]).stdout.trim();
    assert(failed.includes("publication failed") && after !== before && git(repo, ["diff", "--cached", "--quiet"]).status === 0 && git(repo, ["status", "--porcelain"]).stdout.includes("one.txt"), "initial publication CAS loss mutated Git after external authority advanced");
    const db = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); assert(db.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get().status === "review", "initial CAS loss closed the Work"); db.close();
  } finally { rmSync(bin, { recursive: true, force: true }); rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); const bin = mkdtempSync(join(tmpdir(), "nerv-git-durable-failure-")); try {
    materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); review(repo, "PASS");
    const baseline = git(repo, ["rev-parse", "HEAD"]).stdout.trim(); writeFileSync(join(bin, "git"), `#!/bin/sh\nif [ "$1" = update-ref ] && [ ! -e .git/nerv-durable-failure-fired ]; then\n  touch .git/nerv-durable-failure-fired\n  ${gitPath} "$@" || exit $?\n  ${process.execPath} -e "const Database=require('${sqliteModule}'); const db=new Database('.nerv/nerv.db'); db.exec(\\\"CREATE TRIGGER fail_close BEFORE UPDATE ON work_items WHEN NEW.status = 'closed' BEGIN SELECT RAISE(ABORT, 'forced durable Close failure'); END\\\"); db.close()"\n  exit 0\nfi\nexec ${gitPath} "$@"\n`); chmodSync(join(bin, "git"), 0o755);
    const failed = run(repo, ["close", "WORK-001", "--message", "durable failure"], 1, { PATH: `${bin}:${process.env.PATH}` });
    assert(failed.includes("forced durable Close failure") && git(repo, ["rev-parse", "HEAD"]).stdout.trim() === baseline && git(repo, ["diff", "--cached", "--quiet"]).status === 0 && git(repo, ["status", "--porcelain"]).stdout.includes("one.txt"), "durable Close failure did not safely compensate publication");
    const state = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); assert(state.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get().status === "review", "successful compensation closed the Work"); state.close();
  } finally { rmSync(bin, { recursive: true, force: true }); rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); const bin = mkdtempSync(join(tmpdir(), "nerv-git-compensation-race-")); try {
    materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); review(repo, "PASS");
    const boundary = join(bin, "boundary");
    writeFileSync(join(bin, "git"), `#!/bin/sh\nif [ "$1" = update-ref ] && [ ! -e .git/nerv-compensation-race-fired ]; then\n  touch .git/nerv-compensation-race-fired\n  ${gitPath} "$@" || exit $?\n  ${process.execPath} -e "const Database=require('${sqliteModule}'); const db=new Database('.nerv/nerv.db'); db.exec(\\\"CREATE TRIGGER fail_close BEFORE UPDATE ON work_items WHEN NEW.status = 'closed' BEGIN SELECT RAISE(ABORT, 'forced durable Close failure'); END\\\"); db.close()"\n  ref="$2"; published="$3"\n  external=$(${gitPath} commit-tree "$(${gitPath} rev-parse \"$published^{tree}\")" -p "$published" -m "external ref advance")\n  ${gitPath} update-ref "$ref" "$external" "$published" || exit $?\n  printf '%s\\n%s\\n' "$(${gitPath} rev-parse "$ref")" "$(${gitPath} write-tree)" > "${boundary}"\n  ${gitPath} status --porcelain=v1 -z | base64 >> "${boundary}"\n  exit 0\nfi\nexec ${gitPath} "$@"\n`); chmodSync(join(bin, "git"), 0o755);
    const failed = run(repo, ["close", "WORK-001", "--message", "compensation race"], 1, { PATH: `${bin}:${process.env.PATH}` });
    const [ref, index, status] = readFileSync(boundary, "utf8").trimEnd().split("\n"); const after = { ref: git(repo, ["rev-parse", "HEAD"]).stdout.trim(), index: git(repo, ["write-tree"]).stdout.trim(), status: Buffer.from(git(repo, ["status", "--porcelain=v1", "-z"]).stdout).toString("base64") };
    assert(failed.includes("Git/Nerv consistency failure") && JSON.stringify(after) === JSON.stringify({ ref, index, status }), "failed compensation mutated Git after external authority advanced");
    const state = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); assert(state.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get().status === "review", "compensation authority loss closed the Work"); state.close();
  } finally { rmSync(bin, { recursive: true, force: true }); rmSync(repo, { recursive: true, force: true }); }
}
{
  const publicSkill = readFileSync(join(root, ".agents/skills/nerv/SKILL.md"), "utf8"); const marker = publicSkill.match(/^nerv_managed_sha256: "([a-f0-9]{64})"$/m); assert(!publicSkill.includes("Task scopes") && marker && marker[1] === createHash("sha256").update(publicSkill.replace(marker[0], "nerv_managed_sha256: \"\"")).digest("hex"), "public skill is invalid");
}
console.log("ok - lifecycle integrity smoke coverage");
