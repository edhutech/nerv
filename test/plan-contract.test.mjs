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
