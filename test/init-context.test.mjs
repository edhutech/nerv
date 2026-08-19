import test from "node:test";
import { Database, assert, finish, git, gitResult, join, materialize, materializedRef, mkdtempSync, plan, readFileSync, remediation, review, rmSync, run, setup, tmpdir, writeFileSync } from "./helpers.mjs";

test("init establishes local exclusions and gates uncommitted setup", () => {
  const repo = setup(false); try {
    const initial = run(repo, ["init"]); assert(initial.includes("Repository setup: not established") && gitResult(repo, ["check-ignore", "-v", ".nerv/nerv.db"]).status === 0, "fresh init did not report unestablished setup or locally ignore .nerv");
    assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan())], 1).includes("setup/context must be committed"), "uncommitted setup materialized a Work");
    git(repo, ["add", ".nerv-context/product.md"]); assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan())], 1).includes("setup/context must be committed"), "clean index bypassed untracked setup"); git(repo, ["reset", "--", ".nerv-context/product.md"]);
    git(repo, ["add", ".agents/skills/nerv/SKILL.md", ".nerv-context/product.md", ".nerv-context/repo.md"]); git(repo, ["commit", "-m", "establish nerv setup"]); assert(materialize(repo), "committed setup did not permit materialization without reinit");
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("status deterministically distinguishes missing, scaffold, and established canonical context", () => {
  const repo = setup(false);
  try {
    assert(run(repo, ["status"]).includes("Product Context: scaffold\nRepo Context: scaffold"), "untouched scaffolds were not reported");
    rmSync(join(repo, ".nerv-context/product.md"));
    assert(run(repo, ["status"]).includes("Product Context: missing\nRepo Context: scaffold"), "missing Product Context was not reported independently");
    run(repo, ["init"]);
    writeFileSync(join(repo, ".nerv-context/product.md"), "# Product\n\nConfirmed behavior.\n");
    assert(run(repo, ["status"]).includes("Product Context: established\nRepo Context: scaffold"), "non-template Product Context was not established");
    writeFileSync(join(repo, ".nerv-context/repo.md"), "# Repository\n\nConfirmed stack.\n");
    assert(run(repo, ["status"]).includes("Product Context: established\nRepo Context: established"), "non-template Repo Context was not established");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("init preserves customized Product and Repo Context", () => {
  const repo = setup(false);
  try {
    const product = "# Product\n\nProject-specific truth.\n";
    const repository = "# Repository\n\nProject-specific rules.\n";
    writeFileSync(join(repo, ".nerv-context/product.md"), product);
    writeFileSync(join(repo, ".nerv-context/repo.md"), repository);
    run(repo, ["init"]);
    assert(readFileSync(join(repo, ".nerv-context/product.md"), "utf8") === product, "init overwrote customized Product Context");
    assert(readFileSync(join(repo, ".nerv-context/repo.md"), "utf8") === repository, "init overwrote customized Repo Context");
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("init supports unborn repositories and linked worktree exclusions", () => {
  const repo = mkdtempSync(join(tmpdir(), "nerv-unborn-")); try { git(repo, ["init"]); git(repo, ["config", "user.email", "test@example.com"]); git(repo, ["config", "user.name", "Test"]); assert(run(repo, ["init"]).includes("Initialized Nerv"), "unborn repository init failed"); assert(readFileSync(join(repo, "AGENTS.md"), "utf8").includes(".agents/skills/nerv/SKILL.md") && readFileSync(join(repo, "CLAUDE.md"), "utf8").includes("Follow `AGENTS.md` when it exists."), "unborn repository received a broken discovery bridge"); git(repo, ["add", ".agents/skills/nerv/SKILL.md", ".nerv-context/product.md", ".nerv-context/repo.md"]); git(repo, ["commit", "-m", "establish nervous setup"]); assert(/^W-[0-9A-F]{16}$/.test(materializedRef(repo)), "unborn repository did not create a canonical Work ref"); } finally { rmSync(repo, { recursive: true, force: true }); }
  const linked = setup(); const worktree = join(linked, "../nerv-linked-worktree"); try { rmSync(worktree, { recursive: true, force: true }); git(linked, ["worktree", "add", "-b", "smoke-linked", worktree]); run(worktree, ["init"]); assert(gitResult(worktree, ["check-ignore", "-v", ".nerv/nerv.db"]).status === 0, "Git-resolved linked-worktree exclusion did not ignore .nerv"); } finally { git(linked, ["worktree", "remove", "--force", worktree]); rmSync(linked, { recursive: true, force: true }); }
});

test("canonical context blocks new Work but permits attributed rework", () => {
  const repo = setup(); try { git(repo, ["rm", "--cached", ".nerv-context/product.md"]); assert(run(repo, ["init"]).includes("not established"), "existing untracked canonical setup was reported established"); assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan())], 1).includes("setup/context must be committed"), "existing untracked canonical setup materialized a Work"); git(repo, ["add", ".nerv-context/product.md"]); gitResult(repo, ["commit", "-m", "restore setup"]); rmSync(join(repo, ".nerv"), { recursive: true, force: true }); run(repo, ["init"]); writeFileSync(join(repo, ".nerv-context/repo.md"), "drift\n"); assert(run(repo, ["work", "materialize", "--plan", JSON.stringify(plan())], 1).includes("setup/context must be committed"), "regenerated local state bypassed canonical setup gate"); } finally { rmSync(repo, { recursive: true, force: true }); }
  for (const path of [".nerv-context/product.md", ".nerv-context/repo.md", ".agents/skills/nerv/SKILL.md"]) { const drift = setup(); try { materialize(drift); finish(drift, 1, "one.txt"); finish(drift, 2, "two.txt"); review(drift, "PASS"); run(drift, ["close", "WORK-001", "--message", "close"]); writeFileSync(join(drift, path), "manual drift\n"); assert(run(drift, ["work", "materialize", "--plan", JSON.stringify(plan("next"))], 1).includes("setup/context must be committed"), `${path} drift did not block next Work`); git(drift, ["add", path]); git(drift, ["commit", "-m", "resolve canonical drift"]); assert(materialize(drift, plan("next")), `${path} resolution did not permit next Work`); } finally { rmSync(drift, { recursive: true, force: true }); } }
  const rework = setup(); try { materialize(rework); finish(rework, 1, "one.txt"); finish(rework, 2, "two.txt"); review(rework, "REWORK", remediation); const recovery = run(rework, ["work", "show", "WORK-001"]); assert(recovery.includes("Persisted remediation proposal") && recovery.includes("Fix") && recovery.includes("Expected touchpoints: src/index.ts"), "fresh REWORK recovery omitted the persisted remediation contract"); writeFileSync(join(rework, ".nerv-context/product.md"), "canonical drift\n"); run(rework, ["work", "materialize-rework", "WORK-001"]); const db = new Database(join(rework, ".nerv/nerv.db"), { readOnly: true }); const item = db.prepare("SELECT status FROM work_items ORDER BY created_at DESC LIMIT 1").get(); const tasks = db.prepare("SELECT position, status FROM tasks WHERE work_item_id=(SELECT id FROM work_items ORDER BY created_at DESC LIMIT 1) ORDER BY position").all(); const count = db.prepare("SELECT COUNT(*) AS count FROM work_items").get().count; db.close(); assert(item.status === "active" && count === 1 && JSON.stringify(tasks) === JSON.stringify([{ position: 1, status: "done" }, { position: 2, status: "done" }, { position: 3, status: "active" }]) && readFileSync(join(rework, ".nerv-context/product.md"), "utf8") === "canonical drift\n", "canonical drift blocked or normalized same-Work remediation"); writeFileSync(join(rework, "fix.txt"), "feature\n"); run(rework, ["work", "task", "done", "WORK-001", "3", "--evidence", "targeted", "--files", "fix.txt", ".nerv-context/product.md"]); review(rework, "PASS"); run(rework, ["close", "WORK-001", "--message", "close rework"]); assert(materialize(rework, plan("next")), "attributed canonical drift did not permit a subsequent Work"); } finally { rmSync(rework, { recursive: true, force: true }); }
});
