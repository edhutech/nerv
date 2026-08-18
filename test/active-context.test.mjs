import test from "node:test";
import { assert, existsSync, finish, join, materialize, plan, readFileSync, remediation, review, rmSync, root, run, setup, writeFileSync } from "./helpers.mjs";

test("active context is a compact handoff and work show retains durable detail", () => {
  const repo = setup();
  try {
    materialize(repo, plan());
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
    const reworkOutput = review(repo, "REWORK", remediation);
    const rework = readFileSync(activePath, "utf8");
    assert(reworkOutput.includes("Remediation proposal:") && reworkOutput.includes("Objective: Resolve") && reworkOutput.includes("Implementation approach: Change") && reworkOutput.includes("Expected touchpoints: src/index.ts") && reworkOutput.includes("Acceptance criteria: Resolved") && reworkOutput.includes("Validation: pnpm test") && reworkOutput.includes("Recommended next action: approve"), "REWORK output omitted the persisted remediation preview before approval");
    assert(rework.includes("State: rework") && rework.includes("## Remediation proposal") && rework.includes("Objective: Resolve") && rework.includes("Validation: pnpm test") && !rework.includes("approved intent"), "rework context did not present the compact persisted remediation preview");
    const status = run(repo, ["work", "status", "WORK-001"]);
    assert(status.includes("Remediation proposal:") && status.includes("Objective: Resolve") && status.includes("Recommended next action: approve"), "rework status omitted persisted remediation before approval");
    assert(run(repo, ["work", "show", "WORK-001"]).includes("Persisted remediation proposal") && run(repo, ["work", "show", "WORK-001"]).includes("Fix"), "rework recovery omitted persisted remediation");

    run(repo, ["work", "materialize-rework", "WORK-001"]);
    finish(repo, 3, "fix.txt");
    review(repo, "PASS");
    const pass = readFileSync(activePath, "utf8");
    assert(pass.includes("\n\n## Next\n\nclose\n") && pass.includes("Optional additional local or user inspection") && pass.includes("required outcome verification was part of Review") && !pass.includes("external verification"), "PASS handoff did not preserve close action and required outcome verification");
    run(repo, ["close", "WORK-001", "--message", "close"]);
    assert(!existsSync(activePath), "Close did not remove active context");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("REWORK review output formats the created persisted record", () => {
  const source = readFileSync(join(root, "src/index.ts"), "utf8");
  assert(source.includes("const createdReview = repo.createReview(") && source.includes("remediationPreview(createdReview)"), "REWORK review output did not format the created persisted Review record");
});
