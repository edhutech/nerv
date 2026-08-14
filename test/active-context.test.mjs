import test from "node:test";
import { assert, existsSync, finish, join, materialize, plan, readFileSync, remediation, review, rmSync, run, setup, writeFileSync } from "./helpers.mjs";

test("active context is a compact handoff and work show retains durable detail", () => {
  const repo = setup();
  try {
    materialize(repo, plan());
    run(repo, ["work", "task", "start", "WORK-001", "1"]);
    const activePath = join(repo, ".nerv/agent/active/WORK-001.md");
    const active = readFileSync(activePath, "utf8");
    assert(active.includes("## Current Task\n\nTask 1 - Persist fields") && active.includes("Implementation approach:\nUse direct columns"), "active Task contract was omitted");
    assert(active.includes("## Pending\n\n- Task 2 - Recover fields") && !active.includes("### Task 2"), "pending Task was not compact");
    assert(!active.includes("## Intent") && !active.includes("Persisted Remediation Proposal") && !active.includes("## Checkpoint"), "active context mirrors durable Work state");
    const shown = run(repo, ["work", "show", "WORK-001"]);
    assert(shown.includes("approved intent") && shown.includes("Task 2: Recover fields [pending]") && shown.includes("Implementation approach: Render from SQLite"), "work show omitted durable contracts");

    writeFileSync(join(repo, "one.txt"), "feature\n");
    run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "targeted passed", "--files", "one.txt"]);
    finish(repo, 2, "two.txt");
    review(repo, "REWORK", remediation);
    const rework = readFileSync(activePath, "utf8");
    assert(rework.includes("State: rework") && !rework.includes("Fix\n\nObjective: Resolve"), "rework context retained remediation history");
    assert(run(repo, ["work", "show", "WORK-001"]).includes("Persisted remediation proposal") && run(repo, ["work", "show", "WORK-001"]).includes("Fix"), "rework recovery omitted persisted remediation");

    run(repo, ["work", "materialize-rework", "WORK-001"]);
    finish(repo, 3, "fix.txt");
    review(repo, "PASS");
    const pass = readFileSync(activePath, "utf8");
    assert(pass.includes("Optional local or user verification") && !pass.includes("external verification"), "PASS handoff suggests external verification");
    run(repo, ["close", "WORK-001", "--message", "close"]);
    assert(!existsSync(activePath), "Close did not remove active context");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
