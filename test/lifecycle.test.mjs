import test from "node:test";
import { Database, assert, existsSync, finish, join, materialize, minimalPlan, plan, readFileSync, remediation, review, rmSync, run, setup, writeFileSync } from "./helpers.mjs";

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

test("closed Work status is terminal and has no lifecycle recommendation", () => {
  const repo = setup();
  try {
    materialize(repo);
    finish(repo, 1, "one.txt");
    finish(repo, 2, "two.txt");
    review(repo, "PASS");
    const closed = run(repo, ["close", "WORK-001", "--message", "close"]);
    assert(closed.includes("Closed Work is terminal") && closed.includes("No further Nerv lifecycle operation is required"), "close output did not state terminal behavior");
    const status = run(repo, ["work", "status", "WORK-001"]);
    assert(status.includes("State: closed") && status.includes("Terminal: no further Nerv lifecycle operation is required") && !status.includes("Recommended next action"), "closed status exposed a fake next lifecycle action");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("materialization keeps Task progression operational for one and multiple Tasks", () => {
  for (const value of [minimalPlan("One Task"), plan("Multiple Tasks")]) {
    const repo = setup();
    try {
      const output = run(repo, ["work", "materialize", "--plan", JSON.stringify(value)]);
      assert(output.includes("Execution: Task 1 is active; completing it activates the next Task.") && !output.includes("Recommended next action") && !/execute Task|Continue with Task/i.test(output), "materialization presented Task execution as a developer action");
      assert(run(repo, ["work", "status", "WORK-001"]).includes("Execution: Task 1 is active; completing it activates the next Task."), "status omitted operational Task state");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  }
});

test("tasks activate and progress automatically through rework", () => {
  const repo = setup();
  try {
    const dbPath = join(repo, ".nerv/nerv.db");
    materialize(repo);
    const statuses = () => { const db = new Database(dbPath, { readOnly: true }); const value = db.prepare("SELECT position, status FROM tasks WHERE work_item_id=(SELECT id FROM work_items WHERE ref='WORK-001') ORDER BY position").all(); db.close(); return value; };
    assert(JSON.stringify(statuses()) === JSON.stringify([{ position: 1, status: "active" }, { position: 2, status: "pending" }]), "first Task was not activated on materialization");
    assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "early", "--validation-evidence", "full"], 1).includes("all Tasks done"), "Review became available before all Tasks were done");
    assert(run(repo, ["work", "task", "done", "WORK-001", "2", "--evidence", "bad"], 1).includes("active Task"), "pending Task completed out of order");
    run(repo, ["checkpoint", "WORK-001", "--summary", "interruption", "--task", "1", "--next-step", "continue"]);
    writeFileSync(join(repo, "one.txt"), "feature\n");
    run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "targeted", "--files", "one.txt"]);
    assert(JSON.stringify(statuses()) === JSON.stringify([{ position: 1, status: "done" }, { position: 2, status: "active" }]), "completion did not activate the next Task");
    writeFileSync(join(repo, "two.txt"), "feature\n");
    const completed = run(repo, ["work", "task", "done", "WORK-001", "2", "--evidence", "targeted", "--files", "two.txt"]);
    assert(completed.includes("Recommended next action: review"), "completed Tasks did not expose the Review handoff");
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

test("blank Task, Review, and Checkpoint evidence fail without lifecycle mutation", () => {
  const repo = setup();
  const dbPath = join(repo, ".nerv/nerv.db");
  const snapshot = () => {
    const db = new Database(dbPath, { readOnly: true });
    const value = {
      work: db.prepare("SELECT status, validation_evidence FROM work_items WHERE ref='WORK-001'").get(),
      tasks: db.prepare("SELECT position, status, validation_evidence, attribution_json FROM tasks WHERE work_item_id=(SELECT id FROM work_items WHERE ref='WORK-001') ORDER BY position").all(),
      reviews: db.prepare("SELECT COUNT(*) AS count FROM work_reviews").get(),
      checkpoints: db.prepare("SELECT COUNT(*) AS count FROM checkpoints").get(),
    };
    db.close();
    return value;
  };
  try {
    materialize(repo);
    const activePath = join(repo, ".nerv/agent/active/WORK-001.md");
    const beforeTask = snapshot();
    const activeBeforeTask = readFileSync(activePath, "utf8");
    assert(run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "   "], 1).includes("must be non-empty"), "blank Task evidence was accepted");
    assert(JSON.stringify(snapshot()) === JSON.stringify(beforeTask) && readFileSync(activePath, "utf8") === activeBeforeTask, "blank Task evidence mutated lifecycle state");

    const beforeCheckpoint = snapshot();
    const activeBeforeCheckpoint = readFileSync(activePath, "utf8");
    assert(run(repo, ["checkpoint", "WORK-001", "--summary", "   "], 1).includes("must be non-empty"), "blank Checkpoint summary was accepted");
    assert(JSON.stringify(snapshot()) === JSON.stringify(beforeCheckpoint) && readFileSync(activePath, "utf8") === activeBeforeCheckpoint, "blank Checkpoint summary mutated lifecycle state");
    assert(run(repo, ["checkpoint", "WORK-001", "--summary", "\t\r\n"], 1).includes("must be non-empty"), "whitespace-only Checkpoint summary was accepted");
    assert(JSON.stringify(snapshot()) === JSON.stringify(beforeCheckpoint) && readFileSync(activePath, "utf8") === activeBeforeCheckpoint, "whitespace-only Checkpoint summary mutated lifecycle state");

    finish(repo, 1, "one.txt");
    finish(repo, 2, "two.txt");
    const beforeReview = snapshot();
    const activeBeforeReview = readFileSync(activePath, "utf8");
    assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "", "--validation-evidence", "full"], 1).includes("must be non-empty"), "blank Review summary was accepted");
    assert(JSON.stringify(snapshot()) === JSON.stringify(beforeReview) && readFileSync(activePath, "utf8") === activeBeforeReview, "blank Review summary mutated lifecycle state");
    assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", " \t\r\n", "--validation-evidence", "full"], 1).includes("must be non-empty"), "whitespace-only Review summary was accepted");
    assert(JSON.stringify(snapshot()) === JSON.stringify(beforeReview) && readFileSync(activePath, "utf8") === activeBeforeReview, "whitespace-only Review summary mutated lifecycle state");

    run(repo, ["checkpoint", "WORK-001", "--summary", " valid checkpoint "]);
    const checkpoint = snapshot();
    assert(checkpoint.checkpoints.count === 1, "valid Checkpoint summary was not persisted");
    assert(run(repo, ["work", "show", "WORK-001"]).includes("Summary: valid checkpoint"), "valid Checkpoint summary was not trimmed and shown");
    assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", " valid review ", "--validation-evidence", "full"]).includes("PASS"), "valid Review summary was rejected");
    assert(run(repo, ["work", "show", "WORK-001"]).includes("Summary: valid review"), "valid Review summary was not trimmed and shown");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
