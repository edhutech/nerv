import test from "node:test";
import { activeContextPath, assert, existsSync, finish, join, materialize, plan, readFileSync, remediation, review, rmSync, root, run, setup, writeFileSync } from "./helpers.mjs";

test("active context is a compact handoff and work show retains durable detail", () => {
  const repo = setup();
  try {
    const materializeOutput = run(repo, ["work", "materialize", "--plan", JSON.stringify(plan())]);
    assert(materializeOutput.includes("Execution: Task 1 is active; completing it activates the next Task.") && !materializeOutput.includes("Recommended next action") && !materializeOutput.includes("Continue with Task"), "materialization exposed an active Task as a developer action");
    const activePath = activeContextPath(repo);
    const active = readFileSync(activePath, "utf8");
    assert(active.includes("## Current Task\n\nTask 1 - Persist fields") && active.includes("Implementation approach:\nUse direct columns") && active.includes("## Execution\n\nTask 1 is active; completing it activates the next Task.") && !active.includes("Continue with Task"), "active Task operational contract was omitted or presented as a developer action");
    assert(active.includes("## Pending\n\n- Task 2 - Recover fields") && !active.includes("### Task 2"), "pending Task was not compact");
    assert(!active.includes("## Intent") && !active.includes("Persisted Remediation Proposal") && !active.includes("## Checkpoint"), "active context mirrors durable Work state");
    const shown = run(repo, ["work", "show", "WORK-001"]);
    assert(shown.includes("approved intent") && shown.includes("Task 2: Recover fields [pending]") && shown.includes("Implementation approach: Render from SQLite"), "work show omitted durable contracts");

    writeFileSync(join(repo, "one.txt"), "feature\n");
    run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "targeted passed", "--files", "one.txt"]);
    finish(repo, 2, "two.txt");
    const reworkOutput = review(repo, "REWORK", remediation);
    const rework = readFileSync(activePath, "utf8");
    assert(reworkOutput.includes("Remediation proposal:") && reworkOutput.includes("Task: Fix") && reworkOutput.includes("Objective: Resolve") && reworkOutput.includes("Implementation approach: Change") && reworkOutput.includes("Expected touchpoints: src/index.ts") && reworkOutput.includes("Acceptance criteria: Resolved") && reworkOutput.includes("Validation: pnpm test") && reworkOutput.includes("Recommended next action: approve"), "REWORK output omitted the complete persisted remediation preview before approval");
    assert(rework.includes("State: rework") && rework.includes("## REWORK") && rework.includes("nerv work show W-") && !rework.includes("Task: Fix") && !rework.includes("Objective: Resolve") && !rework.includes("Validation: pnpm test") && !rework.includes("approved intent"), "rework context did not retain minimal recovery orientation");
    const status = run(repo, ["work", "status", "WORK-001"]);
    assert(status.includes("State: rework") && status.includes("Tasks: 2/2 done") && status.includes("Latest review: REWORK") && status.includes("Recommended next action: approve") && !status.includes("Remediation proposal:") && !status.includes("Task: Fix") && !status.includes("Objective: Resolve"), "rework status was not compact");
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

test("fresh-session REWORK approval preview is reconstructible from durable state", () => {
  const repo = setup();
  try {
    materialize(repo);
    finish(repo, 1, "one.txt");
    finish(repo, 2, "two.txt");
    const finding = { severity: "medium", issue: "Product Context coverage is incomplete", pass_impact: "the approved ownership regression boundary is not fully proven", evidence: "Review validation found no current Product scaffold assertion", affected_work_criterion: "provenance regressions cover every supported current scaffold", medium_residual_risk_decision: "not accepted because this is a required regression" };
    review(repo, "REWORK", ["--findings", JSON.stringify([finding]), "--remediation-title", "Add Product assertion", "--remediation-objective", "Prove current Product ownership", "--remediation-approach", "Add current classification assertions", "--remediation-touchpoints", "test/managed-skill.test.mjs", "--remediation-acceptance-criteria", "Current Product ownership is classified", "--remediation-validation", "pnpm test"]);
    const shown = run(repo, ["work", "show", "WORK-001"]);
    const status = run(repo, ["work", "status", "WORK-001"]);
    const active = readFileSync(activeContextPath(repo), "utf8");
     assert(/^W-[0-9A-F]{16}:/.test(shown) && shown.includes("rework") && shown.includes("Severity: medium") && shown.includes("Issue: Product Context coverage is incomplete") && shown.includes("PASS impact: the approved ownership regression boundary is not fully proven") && shown.includes("Evidence: Review validation found no current Product scaffold assertion") && shown.includes("Affected Work-level acceptance criterion: provenance regressions cover every supported current scaffold") && shown.includes("Add Product assertion") && shown.includes("Prove current Product ownership") && shown.includes("Add current classification assertions") && shown.includes("Current Product ownership is classified") && shown.includes("pnpm test"), "fresh-session work show omitted durable REWORK fields");
     assert(status.includes("Recommended next action: approve") && !status.includes("Add Product assertion") && !status.includes("Product Context coverage is incomplete"), "fresh-session status exposed or omitted compact REWORK orientation");
     assert(active.includes("nerv work show W-") && !active.includes("Add Product assertion") && !active.includes("Product Context coverage is incomplete"), "fresh-session active context exposed durable REWORK details");
    assert(shown.includes("Scope: approved scope") && shown.includes("Acceptance criteria: contract persists"), "fresh-session recovery omitted the durable Work boundary");
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("REWORK review output formats the created persisted record", () => {
  const source = readFileSync(join(root, "src/index.ts"), "utf8");
  assert(source.includes("const createdReview = repo.createReview(") && source.includes("remediationPreview(createdReview)"), "REWORK review output did not format the created persisted Review record");
});
