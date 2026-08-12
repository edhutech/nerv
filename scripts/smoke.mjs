import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(root, "dist/index.js");
const packageVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const assert = (value, message) => { if (!value) throw new Error(message); };
function run(cwd, args, expected = 0) { const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" }); const output = `${result.stdout}${result.stderr}`; if (result.status !== expected) throw new Error(`${args.join(" ")} expected ${expected}: ${output}`); return output; }
function managedSkill(content) { const marker = content.match(/^nerv_managed_sha256: "[a-f0-9]{64}"$/m); const normalized = content.replace(marker[0], "nerv_managed_sha256: \"\""); return normalized.replace("nerv_managed_sha256: \"\"", `nerv_managed_sha256: "${createHash("sha256").update(normalized).digest("hex")}"`); }
function hasWorkPlanningContract(content) { return ["Proposed Work Item:", "Goal:", "Scope:", "Expected touchpoints:", "Out of scope:", "Tasks:", "Acceptance criteria:", "Full validation:", "meaningful exclusions", "integrated Work-level criteria"].every((marker) => content.includes(marker)); }
function hasTaskPlanningContract(content) { return ["Objective:", "Implementation approach:", "Expected touchpoints:", "Acceptance criteria:", "Targeted validation:", "not ready for approval", "remediation Tasks", "Work-level Expected touchpoints describe the Work boundary", "Task-level Expected touchpoints describe where that Task is expected to act", "including repository-evidenced Task-level Expected touchpoints"].every((marker) => content.includes(marker)); }
function hasExplicitReviewBoundary(content, command) { return ["stop before Work Review", `Recommended next operation: ${command} review WORK-###`, `Do not invoke or simulate \`${command} review\``, "Apply the same stop boundary after approved REWORK remediation execution", "narrative analysis alone is not a completed Nerv Review", "including a Review after remediation"].every((marker) => content.includes(marker)); }
function hasApprovalExecutionContract(content) { return ["approved title, intent, goal, scope", "Task acceptance criteria, and targeted validation", "then activate the Work", "start the pending Task", "then mark it done with validation evidence and attributable paths"].every((marker) => content.includes(marker)); }
function hasSharedContextContract(content) { const normalized = content.toLowerCase(); return [".nerv-context/product.md", ".nerv-context/repo.md", "do not load either file ritualistically", "minimum confirmed truth", "do not infer speculative product strategy", "repository facts may be derived from authoritative repository evidence", "appending work history"].every((marker) => normalized.includes(marker)); }
function hasExternalContextContract(content) { const normalized = content.toLowerCase(); return ["relevant external context sources", "optional", "do not replace nerv governance"].every((marker) => normalized.includes(marker)) && !normalized.includes("knowledge"); }
function finding(severity, text, accepted = false) { return JSON.stringify([{ severity, finding: text, ...(accepted ? { accepted_as_residual_risk: true } : {}) }]); }
function git(cwd, args) { return spawnSync("git", args, { cwd, encoding: "utf8" }); }
function setup() { const repo = mkdtempSync(join(tmpdir(), "nerv-smoke-")); git(repo, ["init"]); git(repo, ["config", "user.email", "test@example.com"]); git(repo, ["config", "user.name", "Test"]); writeFileSync(join(repo, "README.md"), "base\n"); git(repo, ["add", "README.md"]); git(repo, ["commit", "-m", "initial"]); run(repo, ["init"]); return repo; }
function createWork(repo, title = "Smoke work") { const output = run(repo, ["work", "create", title, "--intent", "intent", "--goal", "goal", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "full"]); const stableId = /Stable ID: ([0-9a-f-]{36})/.exec(output)?.[1]; assert(stableId, "work creation did not report UUID identity"); return stableId; }
function addAndActivate(repo, ref = "WORK-001") { run(repo, ["work", "add-task", ref, "Implement", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "targeted"]); run(repo, ["work", "activate", ref]); }
function finish(repo, ref = "WORK-001", position = "1", file = "feature.txt") { run(repo, ["work", "task", "start", ref, position]); writeFileSync(join(repo, file), "feature\n"); run(repo, ["work", "task", "done", ref, position, "--evidence", "targeted passed", "--files", file]); }

{
  const readme = readFileSync(join(root, "README.md"), "utf8"); const productContext = readFileSync(join(root, ".nerv-context/product.md"), "utf8"); const repoContext = readFileSync(join(root, ".nerv-context/repo.md"), "utf8"); const publicSkill = readFileSync(join(root, ".agents/skills/nerv/SKILL.md"), "utf8"); const developmentSkill = readFileSync(join(root, ".agents/skills/nerv-development/SKILL.md"), "utf8");
  assert(readme.includes("nerv plan") && readme.includes("nerv approve") && readme.includes("nerv review") && readme.includes("nerv close"), "README does not expose the simplified public workflow");
    assert(publicSkill.includes("## Public Workflow") && publicSkill.includes("not necessarily literal shell commands") && publicSkill.includes("Never probe whether `nerv plan` or `nerv approve` exists as a literal command") && publicSkill.includes("Recommended next operation") && publicSkill.includes("continue through approved Execution in the same agent interaction") && developmentSkill.includes("protocol syntax, not shell commands") && developmentSkill.includes("never to discover whether `nerv-dev` exists") && developmentSkill.includes("Before the `nerv-dev plan` protocol operation") && developmentSkill.includes("Skills, MCPs, plugins") && developmentSkill.includes("Recommended next operation") && developmentSkill.includes("continue through approved Execution in the same agent interaction") && hasWorkPlanningContract(publicSkill) && hasWorkPlanningContract(developmentSkill) && hasTaskPlanningContract(publicSkill) && hasTaskPlanningContract(developmentSkill) && hasApprovalExecutionContract(publicSkill) && hasApprovalExecutionContract(developmentSkill) && hasSharedContextContract(publicSkill) && hasSharedContextContract(developmentSkill) && hasExternalContextContract(publicSkill) && hasExternalContextContract(developmentSkill) && hasExplicitReviewBoundary(publicSkill, "nerv") && hasExplicitReviewBoundary(developmentSkill, "nerv-dev"), "public and development skills are not semantically aligned on external context, approval, execution, or the explicit Review boundary");
  assert(existsSync(join(root, ".nerv-context/product.md")) && existsSync(join(root, ".nerv-context/repo.md")) && productContext.includes("# Product") && repoContext.includes("# Repository"), "Nerv lacks canonical tracked shared context");
  assert(productContext.includes("Semantic Versioning") && readme.includes("## Releases"), "lightweight versioning policy is not documented");
  assert(productContext.includes("Human approval precedes durable Work") && readme.includes("normally continues through approved Execution in the same agent interaction"), "automatic execution after approval is not documented");
  assert(!readFileSync(join(root, "src/workspace.ts"), "utf8").includes("LEGACY_PUBLIC_SKILL_HASHES"), "obsolete managed-skill compatibility remains");
}
{
  const repo = setup(); try {
    assert(run(repo, ["--version"]).trim() === packageVersion, "CLI version does not match package metadata");
    const initOutput = run(repo, ["init"]); assert(initOutput.includes("already initialized") && !initOutput.includes("Recommended next operation"), "initialization is not idempotent or included lifecycle guidance");
    const db = new Database(join(repo, ".nerv/nerv.db"), { readonly: true });
    const columns = db.prepare("PRAGMA table_info(work_items)").all().map((row) => row.name); const taskColumns = db.prepare("PRAGMA table_info(tasks)").all().map((row) => row.name);
    const schemaNames = db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view')").all().map((row) => row.name); assert(columns.includes("id") && columns.includes("ref") && taskColumns.includes("position") && !schemaNames.includes("knowledge") && !schemaNames.includes("knowledge_fts"), "fresh schema lacks lifecycle identity or retains Knowledge persistence"); db.close();
    const initializedProduct = join(repo, ".nerv-context/product.md"); const initializedRepo = join(repo, ".nerv-context/repo.md");
    assert(git(repo, ["check-ignore", "-q", ".nerv/nerv.db"]).status === 0 && git(repo, ["check-ignore", "-q", ".nerv-context/product.md"]).status !== 0 && existsSync(initializedProduct) && existsSync(initializedRepo) && !existsSync(join(repo, ".nerv-context/product")) && !existsSync(join(repo, ".nerv-context/repo")), "init did not create only canonical shared context files");
    assert(readFileSync(initializedProduct, "utf8") === "# Product\n\n## What it is\n\n## Users and problem\n\n## Core capabilities\n\n## Product invariants\n\n## Boundaries\n\n## Current direction\n" && readFileSync(initializedRepo, "utf8") === "# Repository\n\n## Stack\n\n## Architecture\n\n## Important paths\n\n## Development rules\n\n## Generated and local state\n\n## Validation\n\n## Repository invariants\n", "init fabricated shared context facts");
    writeFileSync(initializedProduct, "# Product\n\nConfirmed truth.\n"); writeFileSync(initializedRepo, "# Repository\n\nConfirmed repository truth.\n"); run(repo, ["init"]); assert(readFileSync(initializedProduct, "utf8").includes("Confirmed truth.") && readFileSync(initializedRepo, "utf8").includes("Confirmed repository truth."), "init overwrote existing shared context");
    run(repo, ["product"]); run(repo, ["product", "write", "product.md", "--content", "# Product\n\nShared truth."]); run(repo, ["repo"]); assert(existsSync(initializedProduct) && existsSync(initializedRepo) && existsSync(join(repo, ".nerv/repo/development.md")), "shared and local context separation failed");
    assert(run(repo, ["work", "create", "Missing intent", "--goal", "goal", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "full"], 1).includes("--intent"), "approval materialization allowed a Work without intent");
    const stableId = createWork(repo); createWork(repo, "Future work"); assert(run(repo, ["work", "status", stableId]).includes("WORK-001") && run(repo, ["work", "status", "WORK-002"]).includes("State: planned") && run(repo, ["work", "status", "WORK-001"]).includes("nerv approve"), "UUID lookup, local work references, or planned recommendation failed");
    const materialization = run(repo, ["work", "add-task", "WORK-002", "Persisted Task", "--scope", "task scope", "--acceptance-criteria", "task criteria", "--validation", "task validation"]); assert(!materialization.includes("Recommended next operation"), "Task materialization emitted circular lifecycle guidance"); const taskData = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }).prepare("SELECT scope, acceptance_criteria, validation FROM tasks WHERE work_item_id = (SELECT id FROM work_items WHERE ref = ?)").get("WORK-002"); assert(taskData.scope === "task scope" && taskData.acceptance_criteria === "task criteria" && taskData.validation === "task validation", "approved Task materialization did not preserve required fields");
    assert(run(repo, ["knowledge"], 1).includes("unknown command") && !existsSync(join(repo, ".nerv-context/knowledge")), "Knowledge remains in the CLI or shared context surface");
    const approvalOutput = run(repo, ["work", "create", "Guidance check", "--intent", "intent", "--goal", "goal", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "full"]); assert(!approvalOutput.includes("Recommended next operation"), "Work materialization emitted circular lifecycle guidance");
    addAndActivate(repo); const active = join(repo, ".nerv/agent/active/WORK-001.md"); assert(readFileSync(active, "utf8").includes("Task 1: Implement") && run(repo, ["work", "status", "WORK-001"]).includes("Continue with Task 1.") && run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "premature", "--files", "feature.txt"], 1).includes("must be active"), "active context, execution recommendation, or start-before-done enforcement failed");
    finish(repo); run(repo, ["checkpoint", "WORK-001", "--summary", "resume", "--task", "1", "--next-step", "review"]); assert(run(repo, ["work", "status", "WORK-001"]).includes("Recommended next operation:") && readFileSync(active, "utf8").includes("Checkpoint next step: review"), "checkpoint recovery state failed");
     assert(run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "needs remediation", "--validation-evidence", "full", "--findings", finding("medium", "add check")], 1).includes("execution-ready remediation Task"), "REWORK accepted incomplete remediation"); const reworkOutput = run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "needs remediation", "--validation-evidence", "full", "--findings", finding("medium", "add check"), "--remediation-title", "Add check", "--remediation-objective", "Cover the missing check.", "--remediation-approach", "Add the check to the affected flow.", "--remediation-touchpoints", "feature.txt", "--remediation-acceptance-criteria", "The check covers the finding.", "--remediation-validation", "pnpm smoke"]); assert(reworkOutput.includes("MEDIUM") && reworkOutput.includes("Blocking findings:") && reworkOutput.includes("Expected touchpoints:\nfeature.txt") && reworkOutput.includes("Remediation Plan Preview:") && reworkOutput.indexOf("Remediation Plan Preview:") < reworkOutput.indexOf("Recommended next operation: nerv approve"), "REWORK did not show remediation before approval"); assert(run(repo, ["close", "WORK-001", "--message", "no"], 1).includes("not ready"), "latest REWORK did not block close"); run(repo, ["work", "add-task", "WORK-001", "Remediate", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "targeted"]); run(repo, ["work", "activate", "WORK-001"]); finish(repo, "WORK-001", "2", "fix.txt"); assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "complete", "--validation-evidence", "full"]).includes("then nerv close WORK-001"), "PASS did not recommend Close after optional verification"); assert(run(repo, ["work", "status", "WORK-001"]).includes("Optional user or external verification"), "PASS next guidance implies immediate close"); assert(run(repo, ["close", "WORK-001", "--message", "complete smoke work"]).includes("No further Nerv lifecycle operation is required"), "Close did not end the lifecycle recommendation");
    assert(!existsSync(active), "active context remained after close"); const trailers = git(repo, ["log", "-1", "--format=%B"]).stdout; assert(trailers.includes(`Nerv-Work: ${stableId}`) && trailers.includes("Nerv-Work-Ref: WORK-001"), "canonical stable and friendly Git trailers were not written");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const first = setup(); const second = setup(); try {
    const firstId = createWork(first); const secondId = createWork(second);
    assert(firstId !== secondId && run(first, ["work", "status", "WORK-001"]).includes(firstId) && run(second, ["work", "status", "WORK-001"]).includes(secondId), "independent workspaces did not keep local refs and distinct stable IDs");
  } finally { rmSync(first, { recursive: true, force: true }); rmSync(second, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    const dbPath = join(repo, ".nerv/nerv.db"); const db = new Database(dbPath); db.exec("CREATE TABLE knowledge (id INTEGER PRIMARY KEY); CREATE VIRTUAL TABLE knowledge_fts USING fts5(content); CREATE TRIGGER knowledge_ai AFTER INSERT ON knowledge BEGIN SELECT 1; END"); db.prepare("UPDATE metadata SET value = '2' WHERE key = 'schema_version'").run(); db.close();
    run(repo, ["init"]); const migrated = new Database(dbPath, { readonly: true }); const names = migrated.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'trigger')").all().map((row) => row.name); const version = migrated.prepare("SELECT value FROM metadata WHERE key = 'schema_version'").get().value; assert(!names.some((name) => name.startsWith("knowledge")) && version === "3", "v2 generated state did not migrate away from Knowledge persistence"); migrated.close();
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const legacy = mkdtempSync(join(tmpdir(), "nerv-legacy-context-")); const customized = mkdtempSync(join(tmpdir(), "nerv-custom-context-")); try {
    for (const repo of [legacy, customized]) { git(repo, ["init"]); git(repo, ["config", "user.email", "test@example.com"]); git(repo, ["config", "user.name", "Test"]); writeFileSync(join(repo, "README.md"), "base\n"); git(repo, ["add", "README.md"]); git(repo, ["commit", "-m", "initial"]); }
    mkdirSync(join(legacy, ".nerv-context/product"), { recursive: true }); mkdirSync(join(legacy, ".nerv-context/repo"), { recursive: true }); writeFileSync(join(legacy, ".nerv-context/product/product.md"), "# Legacy Product\n\nKeep me.\n"); writeFileSync(join(legacy, ".nerv-context/repo/facts.md"), "# Legacy Repo\n\nKeep me.\n");
    const legacyInit = run(legacy, ["init"]); assert(legacyInit.includes("Legacy shared context preserved") && existsSync(join(legacy, ".nerv-context/product.md")) && existsSync(join(legacy, ".nerv-context/repo.md")) && readFileSync(join(legacy, ".nerv-context/product/product.md"), "utf8").includes("Keep me.") && readFileSync(join(legacy, ".nerv-context/repo/facts.md"), "utf8").includes("Keep me."), "legacy shared context was not safely preserved and detected");
    mkdirSync(join(customized, ".nerv-context/product"), { recursive: true }); writeFileSync(join(customized, ".nerv-context/product.md"), "# Product\n\nCustom current truth.\n"); writeFileSync(join(customized, ".nerv-context/repo.md"), "# Repository\n\nCustom repository truth.\n"); writeFileSync(join(customized, ".nerv-context/product/problem.md"), "# Legacy Problem\n\nKeep me.\n"); run(customized, ["init"]); assert(readFileSync(join(customized, ".nerv-context/product.md"), "utf8").includes("Custom current truth.") && readFileSync(join(customized, ".nerv-context/repo.md"), "utf8").includes("Custom repository truth.") && readFileSync(join(customized, ".nerv-context/product/problem.md"), "utf8").includes("Keep me."), "init overwrote customized or legacy shared context");
  } finally { rmSync(legacy, { recursive: true, force: true }); rmSync(customized, { recursive: true, force: true }); }
}
{
  for (const severity of ["critical", "high", "medium"]) {
    const repo = setup(); try {
      createWork(repo, `${severity} finding`); addAndActivate(repo); finish(repo);
      const output = run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", `${severity} blocks`, "--validation-evidence", "full", "--findings", finding(severity, `${severity} issue`), "--remediation-title", "Fix issue", "--remediation-objective", "Resolve the blocking issue.", "--remediation-approach", "Change the affected implementation.", "--remediation-touchpoints", "feature.txt", "--remediation-acceptance-criteria", "The issue is resolved.", "--remediation-validation", "pnpm smoke"]);
      assert(output.includes(severity.toUpperCase()) && output.includes("Blocking findings:"), `${severity} finding did not produce clear REWORK`);
    } finally { rmSync(repo, { recursive: true, force: true }); }
  }
}
{
  const repo = setup(); try {
    createWork(repo, "Repeated REWORK"); addAndActivate(repo); finish(repo);
    const incomplete = run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "narrative-only finding", "--validation-evidence", "full", "--findings", finding("medium", "first blocker")], 1);
    assert(incomplete.includes("execution-ready remediation Task"), "narrative-only REWORK was accepted");
    let db = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); assert(db.prepare("SELECT COUNT(*) AS count FROM work_reviews").get().count === 0 && db.prepare("SELECT status FROM work_items WHERE ref = ?").get("WORK-001").status === "active", "unpersisted narrative was treated as a completed Nerv Review"); db.close();
    run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "first remediation", "--validation-evidence", "full", "--findings", finding("medium", "first blocker"), "--remediation-title", "First fix", "--remediation-objective", "Resolve the first blocker.", "--remediation-approach", "Update the affected flow.", "--remediation-touchpoints", "feature.txt", "--remediation-acceptance-criteria", "The first blocker is resolved.", "--remediation-validation", "pnpm smoke"]);
    run(repo, ["work", "add-task", "WORK-001", "First fix", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "targeted"]); run(repo, ["work", "activate", "WORK-001"]); finish(repo, "WORK-001", "2", "first-fix.txt");
    assert(run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "second remediation", "--validation-evidence", "full", "--findings", finding("high", "second blocker")], 1).includes("execution-ready remediation Task"), "subsequent REWORK accepted incomplete remediation");
    const subsequent = run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "second remediation", "--validation-evidence", "full", "--findings", finding("high", "second blocker"), "--remediation-title", "Second fix", "--remediation-objective", "Resolve the second blocker.", "--remediation-approach", "Update the affected flow.", "--remediation-touchpoints", "first-fix.txt", "--remediation-acceptance-criteria", "The second blocker is resolved.", "--remediation-validation", "pnpm smoke"]);
    assert(subsequent.includes("HIGH") && subsequent.includes("Blocking findings:") && subsequent.includes("Remediation Plan Preview:") && subsequent.indexOf("Remediation Plan Preview:") < subsequent.indexOf("Recommended next operation: nerv approve"), "subsequent REWORK did not present remediation before approval");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    createWork(repo, "Residual findings"); addAndActivate(repo); finish(repo);
    const residual = run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "accepted risk", "--validation-evidence", "full", "--findings", JSON.stringify([{ severity: "medium", finding: "known tradeoff", accepted_as_residual_risk: true }, { severity: "low", finding: "minor cleanup" }])]);
    assert(residual.includes("Residual findings:") && residual.includes("MEDIUM (accepted residual risk)") && residual.includes("LOW") && residual.includes("do not block Close") && readFileSync(join(repo, ".nerv/agent/active/WORK-001.md"), "utf8").includes("accepted residual risk"), "PASS did not preserve and surface residual findings");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    createWork(repo, "Blocked PASS"); addAndActivate(repo); finish(repo);
    assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "incorrect", "--validation-evidence", "full", "--findings", finding("medium", "unaccepted issue")], 1).includes("PASS is not permitted"), "unaccepted medium finding allowed PASS");
    assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "incorrect", "--validation-evidence", "full", "--findings", finding("low", "low issue", true)], 1).includes("Only medium findings"), "non-medium residual acceptance was allowed");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    const skill = join(repo, ".agents/skills/nerv/SKILL.md"); const packaged = readFileSync(join(root, ".agents/skills/nerv/SKILL.md"), "utf8");
    assert(readFileSync(skill, "utf8") === packaged, "public skill was not installed");
    writeFileSync(skill, managedSkill(packaged.replace("# Nerv", "# Nerv Guide"))); run(repo, ["init"]); assert(readFileSync(skill, "utf8") === packaged, "managed public skill was not updated");
    writeFileSync(skill, `${managedSkill(packaged)}\nconsumer note\n`); assert(run(repo, ["init"]).includes("preserved") && readFileSync(skill, "utf8").includes("consumer note"), "consumer-modified skill was not preserved");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try { createWork(repo, "Blocked work"); run(repo, ["work", "add-task", "WORK-001", "Implement", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "targeted"]); run(repo, ["work", "add-task", "WORK-001", "Second", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "targeted"]); run(repo, ["work", "activate", "WORK-001"]); run(repo, ["work", "task", "start", "WORK-001", "1"]); run(repo, ["work", "task", "block", "WORK-001", "1", "--reason", "missing requirement"]); assert(run(repo, ["work", "task", "start", "WORK-001", "2"], 1).includes("cannot start"), "blocked task allowed sequential execution"); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try { createWork(repo, "Unsafe close"); addAndActivate(repo); finish(repo); writeFileSync(join(repo, "unrelated.txt"), "unrelated\n"); run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "ok", "--validation-evidence", "full"]); assert(run(repo, ["close", "WORK-001", "--message", "unsafe"], 1).includes("unattributed"), "unsafe unrelated changes did not block close"); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try { createWork(repo, "Stale attribution"); run(repo, ["work", "add-task", "WORK-001", "Implement", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "targeted"]); run(repo, ["work", "add-task", "WORK-001", "Record stale evidence", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "targeted"]); run(repo, ["work", "activate", "WORK-001"]); finish(repo); run(repo, ["work", "task", "start", "WORK-001", "2"]); run(repo, ["work", "task", "done", "WORK-001", "2", "--evidence", "stale", "--files", "stale-attribution.txt"]); run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "ok", "--validation-evidence", "full"]); run(repo, ["close", "WORK-001", "--message", "stale attribution"]); const committed = git(repo, ["show", "--format=", "--name-only", "HEAD"]).stdout; assert(committed.includes("feature.txt") && !committed.includes("stale-attribution.txt"), "stale task attribution was staged during close"); } finally { rmSync(repo, { recursive: true, force: true }); }
}
{
  const repo = setup(); try {
    createWork(repo, "No-diff close");
    run(repo, ["work", "add-task", "WORK-001", "Restore baseline", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "targeted"]);
    writeFileSync(join(repo, "README.md"), "preexisting change\n");
    run(repo, ["work", "activate", "WORK-001"]);
    run(repo, ["work", "task", "start", "WORK-001", "1"]);
    writeFileSync(join(repo, "README.md"), "base\n");
    run(repo, ["work", "task", "done", "WORK-001", "1", "--evidence", "restored baseline", "--files", "README.md"]);
    run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "no diff", "--validation-evidence", "full"]);
    const baselineStatus = git(repo, ["status", "--porcelain"]).stdout;
    assert(run(repo, ["close", "WORK-001", "--message", "no-diff work"]).includes("no tracked Git diff"), "no-diff close did not complete");
    assert(git(repo, ["status", "--porcelain"]).stdout === baselineStatus && git(repo, ["rev-list", "--count", "HEAD"]).stdout.trim() === "1", "no-diff close changed Git state");
    const db = new Database(join(repo, ".nerv/nerv.db"), { readonly: true });
    const work = db.prepare("SELECT status, commit_hash FROM work_items WHERE ref = ?").get("WORK-001");
    assert(work.status === "closed" && work.commit_hash === null, "no-diff close did not persist a closed Work without a commit");
    db.close();
    assert(!existsSync(join(repo, ".nerv/agent/active/WORK-001.md")), "no-diff close left active context behind");
  } finally { rmSync(repo, { recursive: true, force: true }); }
}
console.log("ok - smoke and E2E coverage");
