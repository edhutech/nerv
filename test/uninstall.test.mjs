import test from "node:test";
import { Database, assert, existsSync, finish, git, gitResult, join, materialize, remediation, readFileSync, root, rmSync, review, run, setup, writeFileSync } from "./helpers.mjs";
import { normalizedText } from "../dist/managed-artifacts.js";

const managedPaths = ["AGENTS.md", "CLAUDE.md", ".agents/skills/nerv/SKILL.md", ".nerv-context/product.md", ".nerv-context/repo.md"];

test("uninstall help describes repository removal, safety, and global package separation", () => {
  const repo = setup(false);
  try {
    const help = run(repo, ["uninstall", "--help"]);
    for (const expected of ["repository-level Nerv setup", "does not uninstall the global npm package", "unresolved Work", "never stages or commits", "npm uninstall -g @edhutech/nerv"]) {
      assert(help.includes(expected), `uninstall help omitted ${expected}`);
    }
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("clean uninstall removes Nerv setup, preserves project files, is repeatable, and permits init again", () => {
  const repo = setup(false);
  try {
    const removed = run(repo, ["uninstall"]);
    assert(removed.includes(".nerv/") && removed.includes("AGENTS.md") && removed.includes(".nerv-context/product.md") && removed.includes("No Git changes were staged or committed"), "clean uninstall did not report owned removal and Git safety");
    for (const path of managedPaths) assert(!existsSync(join(repo, path)), `uninstall retained owned setup ${path}`);
    assert(!existsSync(join(repo, ".nerv")) && existsSync(join(repo, "README.md")), "uninstall did not remove local state or preserve project files");
    assert(gitResult(repo, ["check-ignore", ".nerv/nerv.db"]).status !== 0, "uninstall retained the new Nerv exclusion block");
    assert(run(repo, ["status"]).includes("Nerv status: not initialized"), "uninstall left Nerv initialized");
    assert(run(repo, ["uninstall"]).includes("already absent"), "repeated uninstall was not a safe no-op");
    run(repo, ["init"]);
    for (const path of managedPaths) assert(existsSync(join(repo, path)), `init did not restore ${path} after uninstall`);
    assert(existsSync(join(repo, ".nerv/nerv.db")) && gitResult(repo, ["check-ignore", ".nerv/nerv.db"]).status === 0, "init did not restore local state and its exclusion");
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("uninstall strips only managed bridge blocks and preserves custom content", () => {
  const repo = setup(false);
  try {
    const agents = "Developer instructions\n\n" + readFileSync(join(repo, "AGENTS.md"), "utf8") + "\nMore instructions\n";
    const claude = "Claude instructions\n\n" + readFileSync(join(repo, "CLAUDE.md"), "utf8") + "\nMore Claude instructions\n";
    writeFileSync(join(repo, "AGENTS.md"), agents);
    writeFileSync(join(repo, "CLAUDE.md"), claude);
    writeFileSync(join(repo, ".agents/skills/nerv/SKILL.md"), `${readFileSync(join(repo, ".agents/skills/nerv/SKILL.md"), "utf8")}Local skill modification.\n`);
    writeFileSync(join(repo, ".nerv-context/product.md"), "# Product\n\nProject-specific truth.\n");
    const output = run(repo, ["uninstall"]);
    assert(output.includes("Preserved developer-owned or modified content"), "uninstall did not report preserved custom content");
    assert(readFileSync(join(repo, "AGENTS.md"), "utf8") === "Developer instructions\n\n\nMore instructions\n", "uninstall damaged custom AGENTS content");
    assert(readFileSync(join(repo, "CLAUDE.md"), "utf8") === "Claude instructions\n\n\nMore Claude instructions\n", "uninstall damaged custom CLAUDE content");
    assert(readFileSync(join(repo, ".agents/skills/nerv/SKILL.md"), "utf8").endsWith("Local skill modification.\n"), "uninstall removed a modified skill");
    assert(readFileSync(join(repo, ".nerv-context/product.md"), "utf8") === "# Product\n\nProject-specific truth.\n", "uninstall removed project-specific Product Context");
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("uninstall removes a supported historical skill and preserves modified historical content", () => {
  const repo = setup(false);
  const skill = join(repo, ".agents/skills/nerv/SKILL.md");
  try {
    const fixture = readFileSync(join(root, "test/fixtures/v0.2.0/SKILL.md"), "utf8");
    const historicalLf = normalizedText(fixture);
    const historicalCrlf = historicalLf.replaceAll("\n", "\r\n");
    writeFileSync(skill, historicalLf);
    run(repo, ["uninstall"]);
    assert(!existsSync(skill), "uninstall retained a recognized historical LF skill");

    run(repo, ["init"]);
    writeFileSync(skill, historicalCrlf);
    run(repo, ["uninstall"]);
    assert(!existsSync(skill), "uninstall retained a recognized historical CRLF skill");

    run(repo, ["init"]);
    writeFileSync(skill, `${historicalCrlf}\r\nDeveloper change.\r\n`);
    run(repo, ["uninstall"]);
    assert(readFileSync(skill, "utf8").includes("Developer change."), "uninstall removed modified historical content");
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("uninstall fails closed when local state is absent but repository setup remains", () => {
  const repo = setup(false);
  try {
    rmSync(join(repo, ".nerv"), { recursive: true, force: true });
    const result = run(repo, ["uninstall"], 1);
    assert(result.includes(".nerv is absent") && existsSync(join(repo, ".agents/skills/nerv/SKILL.md")), "uninstall bypassed missing-state safety");
    const historicalLf = normalizedText(readFileSync(join(root, "test/fixtures/v0.2.0/SKILL.md"), "utf8"));
    writeFileSync(join(repo, ".agents/skills/nerv/SKILL.md"), historicalLf);
    run(repo, ["init"]);
    assert(readFileSync(join(repo, ".agents/skills/nerv/SKILL.md"), "utf8") === readFileSync(join(process.cwd(), ".agents/skills/nerv/SKILL.md"), "utf8"), "init could not classify setup after local state recreation");
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("uninstall preserves duplicate or modified managed bridge blocks and removes only an exact single block", () => {
  const repo = setup(false);
  try {
    const managedAgents = readFileSync(join(repo, "AGENTS.md"), "utf8");
    const managedExclude = "# Nerv local state (managed)\n.nerv/\n# End Nerv local state\n";
    writeFileSync(join(repo, "AGENTS.md"), `${managedAgents}Custom content\n${managedAgents}`);
    writeFileSync(join(repo, ".git/info/exclude"), `${managedExclude}custom exclusion\n${managedExclude}`);
    run(repo, ["uninstall"]);
    assert(readFileSync(join(repo, "AGENTS.md"), "utf8") === `${managedAgents}Custom content\n${managedAgents}`, "uninstall removed ambiguous duplicate bridge blocks");
    assert(readFileSync(join(repo, ".git/info/exclude"), "utf8") === "custom exclusion\n" + managedExclude, "uninstall removed more than one matching exclusion block");
    writeFileSync(join(repo, "AGENTS.md"), managedAgents.replace(".agents/skills/nerv/SKILL.md", ".agents/skills/custom/SKILL.md"));
    run(repo, ["init"]);
    run(repo, ["uninstall"]);
    assert(readFileSync(join(repo, "AGENTS.md"), "utf8").includes("custom/SKILL.md"), "uninstall removed a modified managed bridge block");
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("uninstall refuses every unresolved Work state before mutation", () => {
  for (const state of ["active", "review", "rework"]) {
    const repo = setup();
    try {
      materialize(repo);
      if (state !== "active") {
        finish(repo, 1, "one.txt");
        finish(repo, 2, "two.txt");
        review(repo, state === "review" ? "PASS" : "REWORK", state === "rework" ? remediation : []);
      }
      const before = readFileSync(join(repo, ".nerv/nerv.db"));
      const result = run(repo, ["uninstall"], 1);
      assert(result.includes(`WORK-001 (${state})`), `uninstall did not identify ${state} Work`);
      assert(existsSync(join(repo, ".nerv/nerv.db")) && readFileSync(join(repo, ".nerv/nerv.db")).equals(before), `${state} Work uninstall mutated local state`);
      for (const path of managedPaths) assert(existsSync(join(repo, path)), `${state} Work uninstall removed ${path}`);
    } finally { rmSync(repo, { recursive: true, force: true }); }
  }
});

test("uninstall fails closed before mutation for missing, unsupported, and corrupt local state", () => {
  const scenarios = [
    ["missing database", (repo) => rmSync(join(repo, ".nerv/nerv.db"))],
    ["unsupported database", (repo) => { const db = new Database(join(repo, ".nerv/nerv.db")); db.exec("ALTER TABLE metadata ADD COLUMN legacy TEXT"); db.close(); }],
    ["corrupt database", (repo) => writeFileSync(join(repo, ".nerv/nerv.db"), "not a SQLite database\n")],
    ["workspace without database", (repo) => { rmSync(join(repo, ".nerv/nerv.db")); rmSync(join(repo, ".nerv/agent/active"), { recursive: true }); }],
  ];
  for (const [label, corrupt] of scenarios) {
    const repo = setup(false);
    try {
      const before = Object.fromEntries(managedPaths.map((path) => [path, readFileSync(join(repo, path))]));
      corrupt(repo);
      const result = run(repo, ["uninstall"], 1);
      assert(result.includes("Cannot uninstall Nerv safely"), `${label} did not fail closed`);
      for (const path of managedPaths) assert(readFileSync(join(repo, path)).equals(before[path]), `${label} mutated ${path} before inspection failed`);
      assert(existsSync(join(repo, ".nerv")), `${label} removed local state before inspection failed`);
    } finally { rmSync(repo, { recursive: true, force: true }); }
  }
});

test("uninstall preserves unrelated dirty files and legacy unmarked exclusions", () => {
  const repo = setup(false);
  try {
    const exclude = join(repo, ".git/info/exclude");
    writeFileSync(exclude, ".nerv/\nlegacy developer exclusion\n");
    writeFileSync(join(repo, "unrelated.txt"), "developer work\n");
    run(repo, ["uninstall"]);
    assert(readFileSync(join(repo, "unrelated.txt"), "utf8") === "developer work\n", "uninstall deleted an unrelated dirty file");
    assert(readFileSync(exclude, "utf8") === ".nerv/\nlegacy developer exclusion\n", "uninstall removed an ambiguous legacy exclusion");
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("linked worktree uninstall removes its owned exclusion block", () => {
  const repo = setup();
  const worktree = join(repo, "../nerv-uninstall-linked-worktree");
  try {
    rmSync(worktree, { recursive: true, force: true });
    git(repo, ["worktree", "add", "-b", "uninstall-linked", worktree]);
    run(worktree, ["init"]);
    assert(gitResult(worktree, ["check-ignore", ".nerv/nerv.db"]).status === 0, "linked worktree did not receive the local exclusion");
    run(worktree, ["uninstall"]);
    assert(gitResult(worktree, ["check-ignore", ".nerv/nerv.db"]).status !== 0, "linked worktree uninstall retained its owned exclusion");
  } finally {
    git(repo, ["worktree", "remove", "--force", worktree]);
    rmSync(repo, { recursive: true, force: true });
  }
});
