import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(root, "dist/index.js");
const productFiles = [
  ["product.md", "# Product\n\nA recoverable local-first product context harness.\n"],
  ["problem.md", "# Problem\n\nProduct decisions must survive agent restarts.\n"],
  ["users.md", "# Users\n\nDevelopers coordinating external coding agents.\n"],
  ["prd.md", "# Product Requirements\n\n## MVP features\n\nDurable approved Product Context.\n"],
  ["roadmap.md", "# Roadmap\n\n## Current priorities\n\nComplete the approval lifecycle.\n"],
  ["scope.md", "# Scope\n\n## In scope\n\nExplicitly approved Product Context changes.\n"],
  ["decisions.md", "# Decisions\n\n## Decision log\n\n### Keep state local\n\n**Status**: Accepted\n"],
  ["architecture.md", "# Architecture\n\n## System overview\n\nSQLite is authoritative; Markdown is synchronized.\n"],
  ["evolution.md", "# Evolution\n\n## Product evolution\n\nApplied changes are recoverable.\n"],
];

function assert(condition, message) { if (!condition) throw new Error(message); }
function run(cwd, args, expected = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== expected) throw new Error(`${args.join(" ")} expected ${expected}, got ${result.status}: ${output}`);
  return output;
}
function proposal(changes) {
  return JSON.stringify({
    schemaVersion: 1,
    assessment: { mode: "creation", confirmedFacts: [], gaps: [], contradictions: [], assumptions: [], pendingQuestions: [] },
    changes,
  });
}
function changesForAllDocuments() {
  return productFiles.map(([document, proposedContent]) => ({
    document,
    action: "update",
    summary: `Apply ${document}`,
    rationale: "Approved Product Context evidence.",
    proposedContent,
  }));
}

const temp = mkdtempSync(join(tmpdir(), "nerv-product-e2e-"));
try {
  spawnSync("git", ["init", temp], { encoding: "utf8" });
  run(temp, ["init"]);

  const created = run(temp, ["product"]);
  assert(created.includes("Started Product Session PRODUCT-001 (creation)."), "initial Product Session was not created");
  const entrypoint = join(temp, ".nerv/agent/product/run.md");
  assert(existsSync(entrypoint) && readFileSync(entrypoint, "utf8").includes("Nerv does not invoke models or APIs."), "agent-neutral entrypoint is missing");
  assert(run(temp, ["product"]).includes("Resumed Product Session PRODUCT-001 (creation)."), "active Product Session did not recover from SQLite");

  const v1 = join(temp, "proposal-v1.json");
  writeFileSync(v1, proposal([{ document: "product.md", action: "update", summary: "First draft", rationale: "Exercise requested changes.", proposedContent: "# Product\n\nFirst draft must not apply.\n" }]), "utf8");
  run(temp, ["product", "propose", "PRODUCT-001", "--proposal", v1]);
  const v1Markdown = join(temp, ".nerv/agent/product/PRODUCT-001/proposal-001.md");
  assert(existsSync(v1Markdown) && readFileSync(v1Markdown, "utf8").includes("First draft"), "proposal record Markdown is missing");
  run(temp, ["product", "review-proposal", "PRODUCT-001-PROPOSAL-001", "--action", "changes-requested"]);
  assert(run(temp, ["product", "apply", "PRODUCT-001-PROPOSAL-001"], 1).includes("must be explicitly approved"), "changes-requested proposal was allowed to apply");

  const v2 = join(temp, "proposal-v2.json");
  writeFileSync(v2, proposal(changesForAllDocuments()), "utf8");
  run(temp, ["product", "propose", "PRODUCT-001", "--proposal", v2]);
  run(temp, ["product", "review-proposal", "PRODUCT-001-PROPOSAL-002", "--action", "approved"]);
  const firstApply = run(temp, ["product", "apply", "PRODUCT-001-PROPOSAL-002"]);
  const secondApply = run(temp, ["product", "apply", "PRODUCT-001-PROPOSAL-002"]);
  assert(firstApply === secondApply && firstApply.includes('"runs": "none"'), "repeat apply was not safe and idempotent");

  const status = run(temp, ["product", "status"]);
  assert(status.includes("PRODUCT-001-PROPOSAL-001: changes_requested") && status.includes("PRODUCT-001-PROPOSAL-002: applied") && status.includes("passed: Proposal Markdown") && status.includes("passed: Applied Markdown") && status.includes("passed: Decision index"), "status did not report coherent proposal and Markdown state");
  assert(readFileSync(join(temp, ".nerv/product/product.md"), "utf8") === productFiles[0][1], "applied canonical Markdown does not match the approved proposal");
  assert(readFileSync(v1Markdown, "utf8").includes("changes_requested"), "prior proposal history was not retained in Markdown");

  const database = new Database(join(temp, ".nerv/nerv.db"), { readonly: true });
  try {
    assert(database.prepare("SELECT status FROM product_sessions WHERE id = ?").get("PRODUCT-001")?.status === "active", "session did not reload as active from SQLite");
    assert(database.prepare("SELECT COUNT(*) AS count FROM product_context_proposal_reviews").get().count === 2, "human decisions were not durably recorded");
    assert(database.prepare("SELECT COUNT(*) AS count FROM product_context_materializations WHERE status = 'complete'").get().count === 1, "apply did not retain exactly one complete ledger");
    assert(database.prepare("SELECT COUNT(*) AS count FROM runs").get().count === 0 && database.prepare("SELECT COUNT(*) AS count FROM checkpoints").get().count === 0, "Product Context apply created automatic work state");
  } finally { database.close(); }

  run(temp, ["product", "review"]);
  assert(run(temp, ["product", "status"]).includes("PRODUCT-001 (reviewed, creation)"), "review did not preserve coherent session state");
  run(temp, ["product", "close"]);
  assert(run(temp, ["product", "status"]).includes("Product Session: None"), "close did not clear the current coherent session");

  // Simulate additive Product Context columns missing from a compatible older workspace.
  const migration = mkdtempSync(join(tmpdir(), "nerv-product-migration-"));
  try {
    spawnSync("git", ["init", migration], { encoding: "utf8" });
    run(migration, ["init"]);
    const legacy = new Database(join(migration, ".nerv/nerv.db"));
    try {
      legacy.prepare("INSERT INTO product_sessions (id, status, mode, created_at, updated_at, closed_at, input_manifest) VALUES (?, ?, ?, ?, ?, ?, ?)").run("PRODUCT-007", "active", "creation", "now", "now", null, "[]");
      legacy.prepare("INSERT INTO product_context_proposals (id, session_id, version, status, proposal_json, input_manifest, created_at, updated_at, markdown_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("PRODUCT-007-PROPOSAL-001", "PRODUCT-007", 1, "applied", "{}", "[]", "now", "now", "legacy.md");
      legacy.prepare("INSERT INTO product_context_materializations (id, session_id, proposal_id, status, plan_json, decision_replacement_confirmed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run("legacy-materialization", "PRODUCT-007", "PRODUCT-007-PROPOSAL-001", "complete", "{}", null, "now", "now");
      legacy.exec("ALTER TABLE product_sessions DROP COLUMN input_manifest");
      legacy.exec("ALTER TABLE product_context_materializations DROP COLUMN decision_replacement_confirmed_at");
    } finally { legacy.close(); }
    run(migration, ["init"]);
    const migrated = new Database(join(migration, ".nerv/nerv.db"), { readonly: true });
    try {
      assert(migrated.prepare("SELECT status FROM product_sessions WHERE id = ?").get("PRODUCT-007")?.status === "active", "migration did not preserve legacy Product Session data");
      assert(migrated.prepare("SELECT status FROM product_context_materializations WHERE id = ?").get("legacy-materialization")?.status === "complete", "migration did not preserve legacy materialization data");
      assert(migrated.prepare("PRAGMA table_info(product_sessions)").all().some((column) => column.name === "input_manifest"), "session migration did not restore input_manifest");
      assert(migrated.prepare("PRAGMA table_info(product_context_materializations)").all().some((column) => column.name === "decision_replacement_confirmed_at"), "materialization migration did not restore confirmation column");
    } finally { migrated.close(); }
  } finally { rmSync(migration, { recursive: true, force: true }); }

  console.log("ok - Product Context public E2E lifecycle, recovery, coherence, idempotence, and migration");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
