import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
const root = resolve(fileURLToPath(new URL("..", import.meta.url))); const cli = join(root, "dist/index.js"); const temp = mkdtempSync(join(tmpdir(), "nerv-intake-task3-"));
function run(args, expected = 0) { const result = spawnSync(process.execPath, [cli, ...args], { cwd: temp, encoding: "utf8" }); if (result.status !== expected) throw new Error(`${args.join(" ")}: ${result.stdout}${result.stderr}`); return `${result.stdout}${result.stderr}`; }
function task(id, order) { return { id, title: id, intent: "intent", outcome: "outcome", scope: "scope", dependencies: [], order, risk: "low", runSize: "small" }; }
try {
  spawnSync("git", ["init", temp]); run(["init"]); run(["new", "build", "existing"]);
  const forms = [
    { schemaVersion: 1, rationale: "r", context: "c", units: [{ id: "unit-one", type: "standalone", justification: "one", tasks: [task("task-one", 1)] }], relationships: [] },
    { schemaVersion: 1, rationale: "r", context: "c", units: [{ id: "unit-two", type: "new-build", title: "new", justification: "new", tasks: [task("task-two", 1)] }], relationships: [] },
    { schemaVersion: 1, rationale: "r", context: "c", units: [{ id: "unit-three-a", type: "new-build", title: "new a", justification: "a", tasks: [task("task-three-a", 1)] }, { id: "unit-three-b", type: "new-build", title: "new b", justification: "b", tasks: [task("task-three-b", 2)] }], relationships: [{ from: "unit-three-a", to: "unit-three-b", type: "depends", rationale: "ordered" }] },
    { schemaVersion: 1, rationale: "r", context: "c", units: [{ id: "unit-four", type: "existing-build", buildId: "BUILD-001", justification: "existing", tasks: [task("task-four", 1)] }], relationships: [] },
  ];
  for (let index = 0; index < forms.length; index++) { const intake = `INTAKE-00${index + 1}`; const proposal = `${intake}-PROPOSAL-001`; run(["intake", "create", `intent ${index}`]); const path = join(temp, `${index}.json`); writeFileSync(path, JSON.stringify(forms[index])); run(["intake", "propose", intake, "--input", path]); run(["intake", "review", proposal, "--action", "approved"]); const dry = run(["intake", "apply", proposal, "--dry-run"]); if (!dry.includes('"runs": "none"')) throw new Error("dry run did not identify no runs"); run(["intake", "apply", proposal]); run(["intake", "apply", proposal]); }
  const db = new Database(join(temp, ".nerv/nerv.db"), { readonly: true });
  if (db.prepare("SELECT COUNT(*) AS count FROM intake_materializations WHERE status = 'complete'").get().count !== 4 || db.prepare("SELECT COUNT(*) AS count FROM runs").get().count !== 0) throw new Error("materialization was not complete/idempotent or started runs");
  if (db.prepare("SELECT COUNT(*) AS count FROM intake_materialization_items").get().count !== 5) throw new Error("audit items missing"); db.close();
  console.log("ok - Task 3 applies all forms transactionally and idempotently without Runs");
} finally { rmSync(temp, { recursive: true, force: true }); }
