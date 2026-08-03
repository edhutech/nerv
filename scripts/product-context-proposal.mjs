import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(root, "dist/index.js");
const temp = mkdtempSync(join(tmpdir(), "nerv-product-proposal-"));

function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: temp, encoding: "utf8" });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== expected) throw new Error(`${args.join(" ")} expected ${expected}, got ${result.status}: ${output}`);
  return output;
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function proposal(mode, document = "product.md") {
  return {
    schemaVersion: 1,
    assessment: {
      mode,
      confirmedFacts: [{ id: "fact-local", statement: "State is local.", sources: ["product-notes.md"] }],
      gaps: [{ id: "gap-metric", statement: "Success metric is pending.", sources: ["prd.md"] }],
      contradictions: [], assumptions: [], pendingQuestions: [{ id: "question-owner", statement: "Who owns the metric?", sources: ["product-notes.md"] }],
    },
    changes: [{ document, action: "update", summary: "Clarify the product.", rationale: "The brief adds confirmed context.", proposedContent: "# Product\n\nUpdated proposal only.\n" }],
  };
}

try {
  spawnSync("git", ["init", temp], { encoding: "utf8" });
  run(["init"]);
  writeFileSync(join(temp, "product-notes.md"), "Temporary product evidence\n", "utf8");
  run(["product", "--input", "product-notes.md"]);
  const canonical = join(temp, ".nerv/product/product.md");
  const before = readFileSync(canonical, "utf8");
  const creation = join(temp, "creation.json");
  writeFileSync(creation, JSON.stringify(proposal("creation")), "utf8");
  assert(run(["product", "propose", "PRODUCT-001", "--proposal", creation]).includes("Recorded PRODUCT-001-PROPOSAL-001"), "creation proposal was not recorded");
  const shown = run(["product", "proposal", "PRODUCT-001-PROPOSAL-001"]);
  assert(shown.includes('"mode": "creation"') && shown.includes("product.md"), "proposal cannot be recovered by ID");
  assert(readFileSync(canonical, "utf8") === before, "proposal modified canonical Product Context");
  const markdown = join(temp, ".nerv/agent/product/PRODUCT-001/proposal-001.md");
  assert(existsSync(markdown) && readFileSync(markdown, "utf8").includes("Temporary Input Trace"), "proposal Markdown or input trace is missing");
  const invalid = join(temp, "invalid.json");
  writeFileSync(invalid, JSON.stringify(proposal("evolution")), "utf8");
  run(["product", "propose", "PRODUCT-001", "--proposal", invalid], 1);
  const db = new Database(join(temp, ".nerv/nerv.db"), { readonly: true });
  const row = db.prepare("SELECT status, input_manifest FROM product_context_proposals WHERE id = ?").get("PRODUCT-001-PROPOSAL-001");
  assert(row?.status === "proposed" && row.input_manifest.includes("sha256"), "proposal state or non-canonical input trace was not persisted");
  assert(db.prepare("SELECT COUNT(*) AS count FROM product_context_proposals").get().count === 1, "invalid proposal changed durable state");
  db.close();
  console.log("ok - Product Context proposal is durable, portable, traced, and non-mutating");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
