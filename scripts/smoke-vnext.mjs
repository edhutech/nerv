import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
function git(cwd, args) { return spawnSync("git", args, { cwd, encoding: "utf8" }); }
function setup() { const repo = mkdtempSync(join(tmpdir(), "nerv-vnext-")); git(repo, ["init"]); git(repo, ["config", "user.email", "test@example.com"]); git(repo, ["config", "user.name", "Test"]); writeFileSync(join(repo, "README.md"), "base\n"); git(repo, ["add", "README.md"]); git(repo, ["commit", "-m", "initial"]); run(repo, ["init"]); return repo; }
function createWork(repo, title = "Smoke work") { const output = run(repo, ["work", "create", title, "--intent", "intent", "--goal", "goal", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "full"]); const stableId = /Stable ID: ([0-9a-f-]{36})/.exec(output)?.[1]; assert(stableId, "work creation did not report UUID identity"); return stableId; }
function addAndActivate(repo, ref = "WORK-001") { run(repo, ["work", "add-task", ref, "Implement", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "targeted"]); run(repo, ["work", "activate", ref]); }
function finish(repo, ref = "WORK-001", position = "1", file = "feature.txt") { run(repo, ["work", "task", "start", ref, position]); writeFileSync(join(repo, file), "feature\n"); run(repo, ["work", "task", "done", ref, position, "--evidence", "targeted passed", "--files", file]); }

{
  const readme = readFileSync(join(root, "README.md"), "utf8"); const productContext = readFileSync(join(root, ".nerv-context/product/product.md"), "utf8"); const design = readFileSync(join(root, "NERV_VNEXT_DESIGN.md"), "utf8"); const publicSkill = readFileSync(join(root, ".agents/skills/nerv/SKILL.md"), "utf8"); const developmentSkill = readFileSync(join(root, ".agents/skills/nerv-development/SKILL.md"), "utf8");
  assert(readme.includes("nerv plan") && readme.includes("nerv approve") && readme.includes("nerv review") && readme.includes("nerv close"), "README does not expose the simplified public workflow");
  assert(publicSkill.includes("## Public Workflow") && publicSkill.includes("Recommended next operation") && publicSkill.includes("continue through approved Execution in the same agent interaction") && developmentSkill.includes("Before planning, inspect relevant Product Context") && developmentSkill.includes("Skills, MCPs, plugins") && developmentSkill.includes("Recommended next operation") && developmentSkill.includes("continue through approved Execution in the same agent interaction"), "public and development skills are not semantically aligned");
  assert(existsSync(join(root, ".nerv-context/product/product.md")), "Nerv lacks tracked Product Context");
  assert(productContext.includes("Semantic Versioning") && design.includes("## 21.1 Versioning And Releases") && readme.includes("## Releases"), "lightweight versioning policy is not documented");
  assert(productContext.includes("normally continues into Execution in the same agent interaction") && design.includes("normally continues through approved Execution in the same interaction") && readme.includes("normally continues through approved Execution in the same agent interaction"), "automatic execution after approval is not documented");
  assert(!readFileSync(join(root, "src/workspace.ts"), "utf8").includes("LEGACY_PUBLIC_SKILL_HASHES"), "obsolete managed-skill compatibility remains");
}
{
  const repo = setup(); try {
    assert(run(repo, ["--version"]).trim() === packageVersion, "CLI version does not match package metadata");
    assert(run(repo, ["init"]).includes("already initialized"), "initialization is not idempotent");
    const db = new Database(join(repo, ".nerv/nerv.db"), { readonly: true });
    const columns = db.prepare("PRAGMA table_info(work_items)").all().map((row) => row.name); const taskColumns = db.prepare("PRAGMA table_info(tasks)").all().map((row) => row.name);
    assert(columns.includes("id") && columns.includes("ref") && taskColumns.includes("position"), "fresh schema lacks UUID work identity, ref, or scoped position"); db.close();
    assert(git(repo, ["check-ignore", "-q", ".nerv/nerv.db"]).status === 0 && git(repo, ["check-ignore", "-q", ".nerv-context/product/product.md"]).status !== 0, "only local .nerv state is ignored");
    run(repo, ["product"]); run(repo, ["product", "write", "product.md", "--content", "# Product\n\nShared truth."]); run(repo, ["repo"]); run(repo, ["repo", "scaffold"]);
    assert(existsSync(join(repo, ".nerv-context/product/product.md")) && existsSync(join(repo, ".nerv-context/repo/facts.md")) && existsSync(join(repo, ".nerv/repo/development.md")), "shared and local context separation failed");
    const stableId = createWork(repo); createWork(repo, "Future work"); assert(run(repo, ["work", "status", stableId]).includes("WORK-001") && run(repo, ["work", "status", "WORK-002"]).includes("State: planned") && run(repo, ["work", "status", "WORK-001"]).includes("nerv approve"), "UUID lookup, local work references, or planned recommendation failed");
    run(repo, ["knowledge", "add", "--type", "discovery", "--title", "Searchable fact", "--content", "small durable observation", "--work", "WORK-001"]); assert(run(repo, ["knowledge", "search", "durable"]).includes("Searchable fact") && run(repo, ["knowledge", "show", "1"]).includes("small durable observation"), "local knowledge retrieval failed"); run(repo, ["knowledge", "promote", "1"]); const sharedName = readdirSync(join(repo, ".nerv-context/knowledge")).find((name) => /^[0-9a-f-]{36}\.md$/.test(name)); assert(sharedName, "explicit knowledge promotion failed");
    const reconstructed = setup(); try { mkdirSync(join(reconstructed, ".nerv-context/knowledge"), { recursive: true }); writeFileSync(join(reconstructed, ".nerv-context/knowledge", sharedName), readFileSync(join(repo, ".nerv-context/knowledge", sharedName), "utf8")); const sharedRef = `shared:${sharedName.slice(0, -3)}`; assert(run(reconstructed, ["knowledge", "search", "durable"]).includes(sharedRef) && run(reconstructed, ["knowledge", "show", sharedRef]).includes("small durable observation"), "shared promoted Knowledge was not discoverable after reconstruction"); } finally { rmSync(reconstructed, { recursive: true, force: true }); }
    addAndActivate(repo); const active = join(repo, ".nerv/agent/active/WORK-001.md"); assert(readFileSync(active, "utf8").includes("Task 1: Implement") && run(repo, ["work", "status", "WORK-001"]).includes("Continue with Task 1."), "active context or execution recommendation failed");
    finish(repo); run(repo, ["checkpoint", "WORK-001", "--summary", "resume", "--task", "1", "--next-step", "review"]); assert(run(repo, ["work", "status", "WORK-001"]).includes("Recommended next operation:") && readFileSync(active, "utf8").includes("Checkpoint next step: review"), "checkpoint recovery state failed");
    assert(run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "needs remediation", "--validation-evidence", "full", "--findings", "add check"]).includes("Recommended next operation: nerv approve"), "REWORK did not recommend approval"); assert(run(repo, ["close", "WORK-001", "--message", "no"], 1).includes("not ready"), "latest REWORK did not block close"); run(repo, ["work", "add-task", "WORK-001", "Remediate", "--scope", "scope", "--acceptance-criteria", "criteria", "--validation", "targeted"]); run(repo, ["work", "activate", "WORK-001"]); finish(repo, "WORK-001", "2", "fix.txt"); assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "complete", "--validation-evidence", "full"]).includes("then nerv close WORK-001"), "PASS did not recommend Close after optional verification"); assert(run(repo, ["work", "status", "WORK-001"]).includes("Optional user or external verification"), "PASS next guidance implies immediate close"); assert(run(repo, ["close", "WORK-001", "--message", "complete smoke work"]).includes("No further Nerv lifecycle operation is required"), "Close did not end the lifecycle recommendation");
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
console.log("ok - vNext smoke and E2E coverage");
