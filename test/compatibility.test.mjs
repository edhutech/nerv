import test from "node:test";
import { assert, git, join, materialize, minimalPlan, mkdirSync, review, rmSync, run, setup, writeFileSync } from "./helpers.mjs";

test("mixed host discovery files do not select a host or alter Nerv lifecycle", () => {
  const repo = setup();
  try {
    mkdirSync(join(repo, ".cursor/rules"), { recursive: true });
    mkdirSync(join(repo, ".claude/skills/example"), { recursive: true });
    mkdirSync(join(repo, ".opencode/skills/example"), { recursive: true });
    writeFileSync(join(repo, ".cursor/rules/example.mdc"), "---\nalwaysApply: false\n---\nCursor fixture\n");
    writeFileSync(join(repo, ".claude/skills/example/SKILL.md"), "---\nname: example\ndescription: fixture\n---\nClaude fixture\n");
    writeFileSync(join(repo, ".opencode/skills/example/SKILL.md"), "---\nname: example\ndescription: fixture\n---\nOpenCode fixture\n");
    materialize(repo, minimalPlan("Mixed host lifecycle"));
    writeFileSync(join(repo, "change.txt"), "feature\n");
    run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "targeted", "--files", "change.txt"], 0, { NERV_HOST: "cursor", CODEX_HOME: join(repo, ".codex-fixture") });
    review(repo, "PASS");
    run(repo, ["close", "WORK-001"]);
    assert(git(repo, ["show", "--format=", "--name-only", "HEAD"]).stdout.trim() === "change.txt", "host discovery files altered the reviewed Work tree");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
