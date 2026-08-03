import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(root, "dist/index.js");
const temp = mkdtempSync(join(tmpdir(), "nerv-product-apply-"));

function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: temp, encoding: "utf8" });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== expected) throw new Error(`${args.join(" ")} expected ${expected}, got ${result.status}: ${output}`);
  return output;
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function runAt(cwd, args, expected = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
  if (result.status !== expected) throw new Error(`${args.join(" ")} expected ${expected}, got ${result.status}: ${result.stdout}${result.stderr}`);
}
function proposal(changes) {
  return { schemaVersion: 1, assessment: { mode: "creation", confirmedFacts: [], gaps: [], contradictions: [], assumptions: [], pendingQuestions: [] }, changes };
}

try {
  const rejected = mkdtempSync(join(tmpdir(), "nerv-product-rejected-"));
  try {
    spawnSync("git", ["init", rejected], { encoding: "utf8" });
    runAt(rejected, ["init"]); runAt(rejected, ["product"]);
    const canonical = join(rejected, ".nerv/product/product.md"); const before = readFileSync(canonical, "utf8"); const source = join(rejected, "rejected.json");
    writeFileSync(source, JSON.stringify(proposal([{ document: "product.md", action: "update", summary: "Rejected", rationale: "Test rejection.", proposedContent: "# Product\n\nMust not apply.\n" }])), "utf8");
    runAt(rejected, ["product", "propose", "PRODUCT-001", "--proposal", source]);
    runAt(rejected, ["product", "review-proposal", "PRODUCT-001-PROPOSAL-001", "--action", "rejected"]);
    runAt(rejected, ["product", "apply", "PRODUCT-001-PROPOSAL-001"], 1);
    assert(readFileSync(canonical, "utf8") === before, "rejected proposal changed canonical context");
  } finally { rmSync(rejected, { recursive: true, force: true }); }
  spawnSync("git", ["init", temp], { encoding: "utf8" });
  run(["init"]);
  run(["product"]);
  const productPath = join(temp, ".nerv/product/product.md");
  const decisionsPath = join(temp, ".nerv/product/decisions.md");
  const evolutionPath = join(temp, ".nerv/product/evolution.md");
  writeFileSync(decisionsPath, "# Decisions\n\n## Decision log\n\n### Keep local state\n\n**Status**: Accepted\n**Context**: The product is local-first.\n", "utf8");
  const originalProduct = readFileSync(productPath, "utf8");
  const originalDecisions = readFileSync(decisionsPath, "utf8");
  const originalEvolution = readFileSync(evolutionPath, "utf8");
  const v1 = join(temp, "v1.json");
  writeFileSync(v1, JSON.stringify(proposal([{ document: "product.md", action: "update", summary: "Test change", rationale: "Test explicit review.", proposedContent: "# Product\n\nChanged only after approval.\n" }])), "utf8");
  run(["product", "propose", "PRODUCT-001", "--proposal", v1]);
  run(["product", "review-proposal", "PRODUCT-001-PROPOSAL-001", "--action", "changes-requested"]);
  run(["product", "apply", "PRODUCT-001-PROPOSAL-001"], 1);
  assert(readFileSync(productPath, "utf8") === originalProduct, "changes-requested proposal changed canonical context");
  const v2 = join(temp, "v2.json");
  const preserved = originalDecisions.match(/^### Keep local state[\s\S]*$/m)?.[0] ?? originalDecisions;
  writeFileSync(v2, JSON.stringify(proposal([
    { document: "product.md", action: "update", summary: "Apply product update", rationale: "Approved evidence.", proposedContent: "# Product\n\nChanged only after approval.\n" },
    { document: "decisions.md", action: "update", summary: "Replace accepted decision", rationale: "Human-approved change.", proposedContent: "# Decisions\n\n## Decision log\n\n### Replacement decision\n\n**Status**: Accepted\n" },
    { document: "evolution.md", action: "update", summary: "Preserve replaced decision", rationale: "Keep decision history.", proposedContent: `${originalEvolution}\n\n## Replaced decisions\n\n${preserved}` },
  ])), "utf8");
  run(["product", "propose", "PRODUCT-001", "--proposal", v2]);
  run(["product", "review-proposal", "PRODUCT-001-PROPOSAL-002", "--action", "approved"]);
  run(["product", "apply", "PRODUCT-001-PROPOSAL-002"], 1);
  assert(readFileSync(productPath, "utf8") === originalProduct, "unconfirmed decision replacement changed canonical context");
  run(["product", "apply", "PRODUCT-001-PROPOSAL-002", "--confirm-decision-replacement"]);
  assert(readFileSync(productPath, "utf8").includes("Changed only after approval."), "approved proposal was not applied");
  assert(readFileSync(evolutionPath, "utf8").includes("### Keep local state"), "replaced decision was not preserved in evolution");
  const database = new Database(join(temp, ".nerv/nerv.db"));
  const materialization = database.prepare("SELECT id, status, decision_replacement_confirmed_at, plan_json FROM product_context_materializations").get();
  assert(materialization?.status === "complete" && materialization.decision_replacement_confirmed_at, "apply ledger did not complete with decision confirmation");
  database.prepare("UPDATE product_context_materializations SET status = 'pending_markdown' WHERE id = ?").run(materialization.id);
  database.prepare("UPDATE product_context_proposals SET status = 'applying' WHERE id = ?").run("PRODUCT-001-PROPOSAL-002");
  database.close();
  run(["product", "apply", "PRODUCT-001-PROPOSAL-002"]);
  const reloaded = new Database(join(temp, ".nerv/nerv.db"), { readonly: true });
  assert(reloaded.prepare("SELECT COUNT(*) AS count FROM product_context_materializations").get().count === 1, "retry duplicated the materialization ledger");
  assert(reloaded.prepare("SELECT status FROM product_context_materializations").get().status === "complete", "retry did not complete pending Markdown");
  assert(reloaded.prepare("SELECT COUNT(*) AS count FROM runs").get().count === 0 && reloaded.prepare("SELECT COUNT(*) AS count FROM checkpoints").get().count === 0, "apply created automatic work state");
  reloaded.close();
  console.log("ok - Product Context review, decision barrier, recoverable apply, and idempotence");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
