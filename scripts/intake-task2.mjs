import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(root, "dist/index.js"); const temp = mkdtempSync(join(tmpdir(), "nerv-intake-task2-"));
function run(args, expected = 0) { const result = spawnSync(process.execPath, [cli, ...args], { cwd: temp, encoding: "utf8" }); if (result.status !== expected) throw new Error(`${args.join(" ")}: ${result.stdout}${result.stderr}`); return `${result.stdout}${result.stderr}`; }
function proposal(unit) { return { schemaVersion: 1, rationale: "rationale", context: "context", units: [unit], relationships: [] }; }
function task(id, order) { return { id, title: id, intent: "intent", outcome: "expected", scope: "boundary", dependencies: [], order, risk: "low", runSize: "small" }; }
try {
  spawnSync("git", ["init", temp]); run(["init"]); run(["new", "build", "Existing build"]);
  const forms = [
    proposal({ id: "unit-standalone", type: "standalone", justification: "one small task", tasks: [task("task-standalone", 1)] }),
    proposal({ id: "unit-new", type: "new-build", title: "New Build", justification: "grouped work", tasks: [task("task-new-a", 1), task("task-new-b", 2)] }),
    { schemaVersion: 1, rationale: "related", context: "context", units: [{ id: "unit-first", type: "new-build", title: "First", justification: "first", tasks: [task("task-first", 1)] }, { id: "unit-second", type: "new-build", title: "Second", justification: "second", tasks: [task("task-second", 2)] }], relationships: [{ from: "unit-first", to: "unit-second", type: "depends-on", rationale: "sequence" }] },
    proposal({ id: "unit-existing", type: "existing-build", buildId: "BUILD-001", justification: "existing scope", tasks: [task("task-existing", 1)] }),
  ];
  for (let index = 0; index < forms.length; index++) { run(["intake", "create", `form ${index}`]); const path = join(temp, `proposal-${index}.json`); writeFileSync(path, JSON.stringify(forms[index]), "utf8"); run(["intake", "propose", `INTAKE-00${index + 1}`, "--input", path]); }
  run(["intake", "context", "INTAKE-001"]);
  const entrypoint = readFileSync(join(temp, ".nerv/agent/intakes/INTAKE-001/planning.md"), "utf8");
  if (!entrypoint.includes("schemaVersion") || !entrypoint.includes("does not call models")) throw new Error("portable package is incomplete");
  const bad = join(temp, "bad.json"); writeFileSync(bad, JSON.stringify({ schemaVersion: 1, rationale: "r", context: "c", units: [], relationships: [] })); run(["intake", "propose", "INTAKE-001", "--input", bad], 1);
  console.log("ok - Task 2 validates all four canonical planning forms");
} finally { rmSync(temp, { recursive: true, force: true }); }
