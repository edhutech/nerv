import test from "node:test";
import { activeContextPath, assert, currentRef, finish, materialize, readFileSync, rmSync, run, setup } from "./helpers.mjs";

test("status identifies the current Work and show retains historical checkpoints", () => {
  const repo = setup();
  try {
    materialize(repo);
    const ref = currentRef(repo);
    const status = run(repo, ["status"]);
    assert(status.includes(`Current Work: ${ref}`) && status.includes("State: active") && status.includes("Execution: Task 1 is active"), "status omitted compact current-Work orientation");
    run(repo, ["checkpoint", ref, "--summary", "pause before task one", "--task", "1", "--next-step", "resume task one"]);
    assert(readFileSync(activeContextPath(repo), "utf8").includes("pause before task one"), "current checkpoint was omitted from active context");
    finish(repo, 1, "one.txt", ref);
    assert(!readFileSync(activeContextPath(repo), "utf8").includes("pause before task one"), "stale checkpoint polluted active context");
    assert(run(repo, ["work", "show", ref]).includes("Summary: pause before task one"), "durable work show omitted historical checkpoint");
  } finally { rmSync(repo, { recursive: true, force: true }); }
});
