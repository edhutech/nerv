import test from "node:test";
import { Database, assert, join, openRepository, plan, readFileSync, rmSync, run, setup } from "./helpers.mjs";

test("schema and failed plan materialization remain atomic", () => {
  const repo = setup(); try {
    const dbPath = join(repo, ".nerv/nerv.db"); const db = new Database(dbPath, { readOnly: true }); const taskColumns = db.prepare("PRAGMA table_info(tasks)").all().map((row) => row.name); const checkpointColumns = db.prepare("PRAGMA table_info(checkpoints)").all().map((row) => row.name); const reviewColumns = db.prepare("PRAGMA table_info(work_reviews)").all().map((row) => row.name); const indexes = db.prepare("PRAGMA index_list(work_items)").all().map((row) => row.name); const metadata = db.prepare("SELECT key FROM metadata").all().map((row) => row.key); db.close(); assert(taskColumns.includes("attribution_json") && !taskColumns.includes("block_reason") && checkpointColumns.join(",") === "id,work_item_id,task_id,summary,next_step,created_at" && reviewColumns.join(",") === "id,work_item_id,outcome,summary,findings,remediation_json,validation_evidence,git_fingerprint_json,verification_evidence,created_at" && indexes.includes("one_open_work_item") && !metadata.includes("product_context_updated_at") && !metadata.includes("repo_context_updated_at"), "schema is not the clean lifecycle baseline"); assert(run(repo, ["init"]).includes("already initialized"), "current schema-v1 was not idempotently accepted");
    const failureDb = new Database(dbPath); failureDb.exec("CREATE TRIGGER fail_task_insert BEFORE INSERT ON tasks WHEN NEW.title = 'Fail inside transaction' BEGIN SELECT RAISE(ABORT, 'forced task insert failure'); END"); failureDb.close(); const repository = openRepository(dbPath); let failure; try { repository.materializePlan({ ...plan("failed transaction"), tasks: [{ ...plan().tasks[0], title: "Fail inside transaction" }], git_baseline_json: "{}" }); } catch (error) { failure = error; } finally { repository.close(); } const afterFailure = new Database(dbPath); assert(failure instanceof Error && failure.message.includes("forced task insert failure") && afterFailure.prepare("SELECT COUNT(*) AS count FROM work_items").get().count === 0 && afterFailure.prepare("SELECT COUNT(*) AS count FROM tasks").get().count === 0 && afterFailure.prepare("SELECT value FROM metadata WHERE key='next_work_number'").get().value === "1", "transactional failure left rows or consumed a Work reference"); afterFailure.close();
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("an existing schema-v1 database reopens for lifecycle writes", () => {
  const repo = setup();
  try {
    const dbPath = join(repo, ".nerv/nerv.db");
    const initial = new Database(dbPath, { readOnly: true });
    initial.close();
    const repository = openRepository(dbPath);
    try {
      const item = repository.materializePlan({ ...plan("reopened database"), git_baseline_json: "{}" });
      const task = repository.getTaskAt(item.id, 1);
      assert(task && repository.completeTask(task.id, "targeted", "[]").status === "done", "reopened schema-v1 database did not accept lifecycle writes");
    } finally { repository.close(); }
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("unsupported generated schema is rejected without mutation", () => {
  for (const [table, statement] of [["metadata", "ALTER TABLE metadata ADD COLUMN legacy TEXT"], ["tasks", "ALTER TABLE tasks ADD COLUMN block_reason TEXT"], ["checkpoints", "ALTER TABLE checkpoints ADD COLUMN files TEXT"], ["work_reviews", "ALTER TABLE work_reviews ADD COLUMN extra TEXT"], ["extra_table", "CREATE TABLE extra_table (id TEXT)"], ["extra_index", "CREATE INDEX extra_index ON tasks(title)"], ["extra_view", "CREATE VIEW extra_view AS SELECT id FROM tasks"], ["extra_trigger", "CREATE TRIGGER extra_trigger AFTER INSERT ON tasks BEGIN SELECT 1; END"]]) { const repo = setup(); try { const dbPath = join(repo, ".nerv/nerv.db"); const db = new Database(dbPath); db.exec(statement); db.close(); const before = readFileSync(dbPath); const result = run(repo, ["init"], 1); assert(result.includes("unsupported generated schema") && result.includes("back up .nerv") && !result.includes("remove .nerv"), `stale ${table} schema did not provide preservation-first guidance`); assert(readFileSync(dbPath).equals(before), `stale ${table} schema was mutated`); } finally { rmSync(repo, { recursive: true, force: true }); } }
  const repo = setup(); try { const dbPath = join(repo, ".nerv/nerv.db"); const db = new Database(dbPath); db.exec("DROP INDEX one_open_work_item"); db.close(); const before = readFileSync(dbPath); assert(run(repo, ["init"], 1).includes("unsupported generated schema"), "missing one-open-Work index was accepted"); assert(readFileSync(dbPath).equals(before), "missing-index database was mutated"); } finally { rmSync(repo, { recursive: true, force: true }); }
  const metadataRepo = setup(); try { const dbPath = join(metadataRepo, ".nerv/nerv.db"); const db = new Database(dbPath); db.prepare("INSERT INTO metadata VALUES ('obsolete', 'value', 'now')").run(); db.close(); assert(run(metadataRepo, ["init"], 1).includes("unsupported generated schema"), "obsolete metadata was accepted"); } finally { rmSync(metadataRepo, { recursive: true, force: true }); }
});
