import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(root, "dist/index.js");
const temp = mkdtempSync(join(tmpdir(), "nerv-intake-task1-"));

function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: temp, encoding: "utf8" });
  if (result.status !== expected) throw new Error(`${args.join(" ")} expected ${expected}, got ${result.status}: ${result.stdout}${result.stderr}`);
  return `${result.stdout}${result.stderr}`;
}
function assert(condition, message) { if (!condition) throw new Error(message); }

try {
  spawnSync("git", ["init", temp], { encoding: "utf8" });
  run(["init"]);
  const direct = "Linea uno\nUnicode: cafe\u0301 y \u03bb\n";
  assert(run(["intake", "create", direct]).includes("Captured INTAKE-001"), "direct intake was not created");
  const input = join(temp, "intent.txt"); writeFileSync(input, "archivo\ncon varias lineas\n", "utf8");
  run(["intake", "create", "--input", input]);
  run(["intake", "create", "also", "--input", input], 1);
  const dbPath = join(temp, ".nerv/nerv.db");
  let db = new Database(dbPath, { readonly: true });
  const intake = db.prepare("SELECT * FROM intakes WHERE id = ?").get("INTAKE-001");
  assert(intake.original_intent === direct && /^[a-f0-9]{64}$/.test(intake.content_hash), "SQLite did not preserve exact direct intent/hash");
  assert(db.prepare("SELECT COUNT(*) AS count FROM tasks").get().count === 0 && db.prepare("SELECT COUNT(*) AS count FROM runs").get().count === 0, "intake created work units");
  db.close();
  const intakePath = join(temp, ".nerv/agent/intakes/INTAKE-001.md");
  assert(readFileSync(intakePath, "utf8").includes(direct), "Markdown did not preserve exact intent");
  run(["intake", "verify", "INTAKE-001"]);
  const proposal1 = join(temp, "proposal-1.json");
  writeFileSync(proposal1, JSON.stringify({ rationale: "r", context: "c", units: [{ type: "standalone", tasks: [{ title: "t", intent: "i", outcome: "o", scope: "s" }] }] }), "utf8");
  run(["intake", "propose", "INTAKE-001", "--input", proposal1]);
  run(["intake", "review", "INTAKE-001-PROPOSAL-001", "--action", "changes-requested"]);
  run(["intake", "review", "INTAKE-001-PROPOSAL-001", "--action", "approved"], 1);
  const proposal2 = join(temp, "proposal-2.json"); writeFileSync(proposal2, readFileSync(proposal1, "utf8").replace('"r"', '"revised"'), "utf8");
  run(["intake", "propose", "INTAKE-001", "--input", proposal2]);
  run(["intake", "review", "INTAKE-001-PROPOSAL-002", "--action", "approved"]);
  const status = run(["intake", "status", "INTAKE-001"]);
  assert(status.includes("Approved proposal: INTAKE-001-PROPOSAL-002") && status.includes("Review"), "durable review history is not resumable");
  db = new Database(dbPath, { readonly: true });
  assert(db.prepare("SELECT COUNT(*) AS count FROM intake_proposal_reviews").get().count === 2, "review audit rows missing");
  assert(db.prepare("SELECT status FROM intake_proposals WHERE id = ?").get("INTAKE-001-PROPOSAL-001").status === "changes_requested", "prior proposal was altered");
  assert(db.prepare("SELECT approved_proposal_id FROM intakes WHERE id = ?").get("INTAKE-001").approved_proposal_id === "INTAKE-001-PROPOSAL-002", "approved version missing");
  db.close();
  assert(existsSync(join(temp, ".nerv/agent/intakes/INTAKE-001/proposal-001.md")), "proposal Markdown missing");
  console.log("ok - Task 1 Intake lifecycle, versioning, audit, SQLite and Markdown");
} finally { rmSync(temp, { recursive: true, force: true }); }
