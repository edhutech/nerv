import test from "node:test";
import { assert, finish, join, materialize, rmSync, run, setup, writeFileSync } from "./helpers.mjs";

test("attribution rejects malformed comma lists but accepts literal comma filenames", () => {
  const repo = setup();
  try {
    materialize(repo);
    writeFileSync(join(repo, "one.txt"), "one\n");
    writeFileSync(join(repo, "two.txt"), "two\n");
    assert(run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "targeted", "--files", "one.txt,two.txt"], 1).includes("pass each path separately"), "comma-combined attribution was accepted");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
  const comma = setup();
  try {
    materialize(comma);
    writeFileSync(join(comma, "comma,name.txt"), "feature\n");
    run(comma, ["work", "task", "done", "WORK-001", "1", "--evidence", "targeted", "--files", "comma,name.txt"]);
    finish(comma, 2, "two.txt");
    assert(run(comma, ["review", "WORK-001", "--outcome", "PASS", "--summary", "complete", "--validation-evidence", "full"]).includes("PASS"), "literal comma filename was rejected");
  } finally {
    rmSync(comma, { recursive: true, force: true });
  }
});

test("Review blocks new unattributed changes without claiming protected baseline paths", () => {
  const repo = setup();
  try {
    writeFileSync(join(repo, "baseline.txt"), "before\n");
    materialize(repo);
    finish(repo, 1, "one.txt");
    finish(repo, 2, "two.txt");
    writeFileSync(join(repo, "unattributed.txt"), "after\n");
    assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "complete", "--validation-evidence", "full"], 1).includes("Unattributed changes"), "Review ignored a new unattributed path");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
