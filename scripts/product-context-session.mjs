import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(root, "dist/index.js");
const temp = mkdtempSync(join(tmpdir(), "nerv-product-session-"));

function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: temp, encoding: "utf8" });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== expected) throw new Error(`${args.join(" ")} expected ${expected}, got ${result.status}: ${output}`);
  return output;
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function proposal() {
  const documents = {
    "product.md": "# Product\n\nA local product context harness.\n",
    "problem.md": "# Problem\n\nProduct context must survive agent restarts.\n",
    "users.md": "# Users\n\nDevelopers coordinating coding agents.\n",
    "prd.md": "# Product Requirements\n\n## MVP features\n\nDurable product context.\n",
    "roadmap.md": "# Roadmap\n\n## Current priorities\n\nComplete the context lifecycle.\n",
    "scope.md": "# Scope\n\n## In scope\n\nProduct context lifecycle.\n",
    "decisions.md": "# Decisions\n\n## Decision log\n\n### Keep state local\n\n**Status**: Accepted\n",
    "architecture.md": "# Architecture\n\n## System overview\n\nSQLite is the source of truth.\n",
    "evolution.md": "# Evolution\n\n## Product evolution\n\nInitial applied context.\n",
  };
  return {
    schemaVersion: 1,
    assessment: { mode: "creation", confirmedFacts: [], gaps: [], contradictions: [], assumptions: [], pendingQuestions: [] },
    changes: Object.entries(documents).map(([document, proposedContent]) => ({ document, action: "update", summary: `Update ${document}`, rationale: "Complete coherent product context.", proposedContent })),
  };
}

try {
  spawnSync("git", ["init", temp], { encoding: "utf8" });
  run(["init"]);
  run(["product"]);
  const source = join(temp, "proposal.json");
  writeFileSync(source, JSON.stringify(proposal()), "utf8");
  run(["product", "propose", "PRODUCT-001", "--proposal", source]);
  assert(run(["product", "status"]).includes("PRODUCT-001-PROPOSAL-001: proposed"), "status did not expose the pending proposal by ID");
  assert(run(["product", "review"], 1).includes("Proposal decisions: pending PRODUCT-001-PROPOSAL-001"), "review accepted a pending proposal");
  run(["product", "review-proposal", "PRODUCT-001-PROPOSAL-001", "--action", "approved"]);
  assert(run(["product", "review"], 1).includes("Applied proposal: no applied proposal"), "review accepted an unapplied proposal");
  run(["product", "apply", "PRODUCT-001-PROPOSAL-001"]);
  const status = run(["product", "status"]);
  assert(status.includes("Current Product Session: PRODUCT-001 (active, creation)") && status.includes("PRODUCT-001-PROPOSAL-001: applied") && status.includes("passed: Applied Markdown") && status.includes("resume: nerv product proposal PRODUCT-001-PROPOSAL-001"), "status did not report resumable applied state and document checks");
  run(["product", "review"]);
  run(["product", "close"]);
  assert(run(["product", "status"]).includes("Product Session: None"), "close did not clear the current product session");

  // A session created before proposal lifecycle use remains inspectable and fails with a single recovery path.
  run(["product"]);
  const historical = run(["product", "status"]);
  assert(historical.includes("PRODUCT-002") && historical.includes("no applied proposal; historical sessions must be resumed with an approved proposal"), "historical session state is ambiguous");
  assert(run(["product", "review"], 1).includes("Applied proposal: no applied proposal"), "historical session bypassed the applied proposal gate");
  console.log("ok - Product Context status, review, close, reload recovery, and historical-session gate");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
