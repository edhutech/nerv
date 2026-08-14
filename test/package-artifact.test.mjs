import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const expectedFiles = [
  ".agents/skills/nerv/SKILL.md",
  "LICENSE",
  "README.md",
  "dist/context.js",
  "dist/database.js",
  "dist/git.js",
  "dist/index.js",
  "dist/repository.js",
  "dist/work.js",
  "dist/workspace.js",
  "package.json",
];

test("CI package scripts resolve from tracked source", () => {
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const workflow = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(workflow, /pnpm validate/);
  assert.match(workflow, /pnpm test:package/);
  for (const [name, source] of [["build", "scripts/build.mjs"], ["test:package", "scripts/package-test.mjs"]]) {
    assert.match(packageJson.scripts[name], new RegExp(source.replace(".", "\\.")));
    assert(existsSync(join(root, source)), `${name} source script is missing: ${source}`);
    assert.equal(execFileSync("git", ["ls-files", "--error-unmatch", source], { cwd: root, encoding: "utf8" }).trim(), source, `${name} source script is not tracked`);
  }
});

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, npm_config_update_notifier: "false" } });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`);
  return `${result.stdout}${result.stderr}`;
}

test("packed artifact has the exact public surface and runs in isolation", { skip: process.env.NERV_PACKAGE_TEST !== "1", timeout: 120_000 }, () => {
  const temp = mkdtempSync(join(tmpdir(), "nerv-package-"));
  try {
    const packOutput = run(npm, ["pack", "--json", "--pack-destination", temp], root);
    const packed = JSON.parse(packOutput.match(/\[\s*\{[\s\S]*\}\s*\]/)?.[0] ?? "")[0];
    const archive = join(temp, packed.filename);
    assert.deepEqual(packed.files.map((entry) => entry.path).sort(), expectedFiles);
    for (const forbidden of [".nerv/", ".nerv-context/", "test/", ".github/", "src/", "AGENTS.md"]) {
      assert(!packed.files.some((entry) => entry.path === forbidden || entry.path.startsWith(forbidden)), `archive includes ${forbidden}`);
    }

    const consumer = join(temp, "consumer");
    const repo = join(consumer, "repo");
    writeFileSync(join(temp, "package.json"), "{\"private\":true}\n");
    run(npm, ["install", "--no-package-lock", archive], temp);
    mkdirSync(consumer);
    execFileSync("git", ["init", repo], { encoding: "utf8" });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: repo });
    writeFileSync(join(repo, "README.md"), "base\n");
    execFileSync("git", ["add", "README.md"], { cwd: repo });
    execFileSync("git", ["commit", "-m", "initial"], { cwd: repo });

    const binary = join(temp, "node_modules", ".bin", process.platform === "win32" ? "nerv.cmd" : "nerv");
    assert.equal(run(binary, ["--version"], repo).trim(), packed.version);
    run(binary, ["init"], repo);
    for (const path of [".agents/skills/nerv/SKILL.md", ".nerv-context/product.md", ".nerv-context/repo.md"]) assert(existsSync(join(repo, path)), `init did not create ${path}`);
    assert.equal(execFileSync("git", ["check-ignore", ".nerv/nerv.db"], { cwd: repo, encoding: "utf8" }).trim(), ".nerv/nerv.db");
    execFileSync("git", ["add", ".agents/skills/nerv/SKILL.md", ".nerv-context/product.md", ".nerv-context/repo.md"], { cwd: repo });
    execFileSync("git", ["commit", "-m", "establish nerv"], { cwd: repo });
    const plan = { title: "Packaged lifecycle", intent: "test", goal: "test installed runtime", scope: "test", expected_touchpoints: "README.md", out_of_scope: "none", acceptance_criteria: "works", validation: "installed CLI", tasks: [{ title: "Run", objective: "exercise runtime", implementation_approach: "invoke installed CLI", expected_touchpoints: "README.md", acceptance_criteria: "task completes", validation: "installed CLI" }] };
    run(binary, ["work", "materialize", "--plan", JSON.stringify(plan)], repo);
    run(binary, ["work", "task", "start", "WORK-001", "1"], repo);
    writeFileSync(join(repo, "change.txt"), "packaged\n");
    run(binary, ["work", "task", "done", "WORK-001", "1", "--evidence", "installed runtime passed", "--files", "change.txt"], repo);
    assert(run(binary, ["review", "WORK-001", "--outcome", "PASS", "--summary", "complete", "--validation-evidence", "installed runtime"], repo).includes("PASS"));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
