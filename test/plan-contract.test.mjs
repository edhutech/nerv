import test from "node:test";
import { assert, currentRef, finish, materialize, minimalPlan, plan, rmSync, run, setup } from "./helpers.mjs";

test("minimal approved plans persist optional fields as empty strings", () => {
  const repo = setup();
  try {
    materialize(repo, minimalPlan());
    const shown = run(repo, ["work", "show", "WORK-001"]);
    assert(shown.includes("Intent: \n") && shown.includes("Implementation approach: \n"), "minimal plan did not retain deterministic optional values");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("rich approved plans retain optional details", () => {
  const repo = setup();
  try {
    materialize(repo, plan());
    const shown = run(repo, ["work", "show", "WORK-001"]);
    assert(shown.includes("approved intent") && shown.includes("Use direct columns"), "rich plan optional details did not round trip");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("materialize help exposes a parser-valid typed plan contract", () => {
  const repo = setup();
  const example = { title: "Add status", goal: "Expose context state", scope: "Read-only status output", acceptance_criteria: "Status reports context state", validation: "pnpm test", tasks: [{ title: "Report state", objective: "Render context state", acceptance_criteria: "Status output is clear", validation: "pnpm test" }] };
  try {
    const help = run(repo, ["work", "materialize", "--help"]);
    for (const expected of [
      "Work object required string fields: title, goal, scope, acceptance_criteria, validation.",
      "Optional Work string fields: intent, expected_touchpoints, out_of_scope.",
      "Required tasks field: non-empty array of Task objects.",
      "Task object required string fields: title, objective, acceptance_criteria, validation.",
      "Optional Task string fields: implementation_approach, expected_touchpoints.",
       JSON.stringify({ ...example, tasks: example.tasks }),
    ]) assert(help.includes(expected), `materialize help omitted ${expected}`);
    materialize(repo, example);
    assert(run(repo, ["work", "show", "WORK-001"]).includes("Add status"), "documented materialize example was not accepted");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("review help exposes and accepts the parser-valid findings contract", () => {
  const repo = setup();
  const example = JSON.stringify([{ severity: "high", issue: "Describe the finding", pass_impact: "This finding blocks PASS because the approved outcome is not met.", evidence: "Relevant validation or review evidence.", affected_work_criterion: "The affected Work acceptance criterion." }]);
  try {
    const help = run(repo, ["review", "--help"]);
    for (const expected of [
      "Optional non-empty JSON array of finding objects.",
       "Required finding fields: severity, issue, pass_impact, evidence, affected_work_criterion.",
      "severity must be one of: critical, high, medium, low.",
       "Optional fields: medium_residual_risk_decision (required for medium findings); accepted_as_residual_risk (boolean; true only for medium findings).",
      example,
    ]) assert(help.includes(expected), `review help omitted ${expected}`);
    materialize(repo);
    const ref = currentRef(repo);
    finish(repo, 1, "one.txt");
    finish(repo, 2, "two.txt");
    const unsupported = JSON.stringify([{ severity: "medium", title: "Unsupported", detail: "Wrong field" }]);
    assert(run(repo, ["review", ref, "--outcome", "PASS", "--summary", "invalid", "--validation-evidence", "full", "--findings", unsupported], 1).includes("finding field"), "unsupported finding fields did not produce a useful contract error");
    assert(run(repo, ["review", ref, "--outcome", "REWORK", "--summary", "needs correction", "--validation-evidence", "full", "--findings", example, "--remediation-title", "Fix", "--remediation-objective", "Resolve", "--remediation-acceptance-criteria", "Resolved", "--remediation-validation", "pnpm test"]).includes("REWORK"), "documented findings example was rejected by the parser");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
