import test from "node:test";
import { Database, assert, existsSync, finish, join, materialize, remediation, review, rmSync, run, setup, writeFileSync } from "./helpers.mjs";

test("Close requires PASS review", () => {
  const repo = setup();
  try {
    materialize(repo);
    finish(repo, 1, "one.txt");
    finish(repo, 2, "two.txt");
    assert(run(repo, ["close", "WORK-001", "--message", "early"], 1).includes("not ready"), "Close did not require PASS");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("tasks activate and progress automatically through rework", () => {
  const repo = setup();
  try {
    const dbPath = join(repo, ".nerv/nerv.db");
    materialize(repo);
    const statuses = () => { const db = new Database(dbPath, { readonly: true }); const value = db.prepare("SELECT position, status FROM tasks WHERE work_item_id=(SELECT id FROM work_items WHERE ref='WORK-001') ORDER BY position").all(); db.close(); return value; };
    assert(JSON.stringify(statuses()) === JSON.stringify([{ position: 1, status: "active" }, { position: 2, status: "pending" }]), "first Task was not activated on materialization");
    assert(run(repo, ["work", "task", "done", "WORK-001", "2", "--evidence", "bad"], 1).includes("active Task"), "pending Task completed out of order");
    run(repo, ["checkpoint", "WORK-001", "--summary", "interruption", "--task", "1", "--next-step", "continue"]);
    writeFileSync(join(repo, "one.txt"), "feature\n");
    run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "targeted", "--files", "one.txt"]);
    assert(JSON.stringify(statuses()) === JSON.stringify([{ position: 1, status: "done" }, { position: 2, status: "active" }]), "completion did not activate the next Task");
    finish(repo, 2, "two.txt");
    assert(JSON.stringify(statuses()) === JSON.stringify([{ position: 1, status: "done" }, { position: 2, status: "done" }]), "final Task did not finish cleanly");
    review(repo, "REWORK", remediation);
    run(repo, ["work", "materialize-rework", "WORK-001"]);
    assert(JSON.stringify(statuses()) === JSON.stringify([{ position: 1, status: "done" }, { position: 2, status: "done" }, { position: 3, status: "active" }]), "remediation Task was not activated");
    finish(repo, 3, "fix.txt");
    review(repo, "PASS");
    run(repo, ["close", "WORK-001", "--message", "close"]);
    assert(!existsSync(join(repo, ".nerv/agent/active/WORK-001.md")), "Close did not remove active context");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
