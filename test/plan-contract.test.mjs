import test from "node:test";
import { assert, materialize, minimalPlan, plan, rmSync, run, setup } from "./helpers.mjs";

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
      JSON.stringify(example),
    ]) assert(help.includes(expected), `materialize help omitted ${expected}`);
    materialize(repo, example);
    assert(run(repo, ["work", "show", "WORK-001"]).includes("Add status"), "documented materialize example was not accepted");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
