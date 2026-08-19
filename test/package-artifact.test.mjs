import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runCommand } from "./helpers.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const npm = "npm";
const expectedFiles = [
  ".agents/skills/nerv/SKILL.md",
  "CLAUDE.md",
  "LICENSE",
  "README.md",
  "dist/context.js",
  "dist/database.js",
  "dist/git.js",
  "dist/index.js",
  "dist/managed-artifacts.js",
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
  assert.match(workflow, /os: ubuntu-latest\s+node: 22\.14\.0\s+package_artifact: false/);
  assert.equal(packageJson.engines?.node, ">=22.14.0 <23 || >=24.11.0 <25");
  assert.match(packageJson.engines.node, /^>=22\.14\.0 <23 \|\| >=24\.11\.0 <25$/);
  assert.doesNotMatch(packageJson.engines.node, />=22\.0\.0/);
  assert.doesNotMatch(packageJson.engines.node, />=24\.0\.0/);
  assert.doesNotMatch(packageJson.engines.node, />=25/);
  assert.match(workflow, /os: ubuntu-latest\s+node: 24\.11\.0\s+package_artifact: true/);
  assert.equal((workflow.match(/package_artifact: true/g) ?? []).length, 1);
  assert.doesNotMatch(workflow, /os: ubuntu-latest\s+node: 24\.19\.0/);
  assert.match(workflow, /os: macos-latest\s+node: 24\.19\.0\s+package_artifact: false/);
  assert.match(workflow, /os: windows-latest\s+node: 24\.19\.0\s+package_artifact: false/);
  for (const [name, source] of [["build", "scripts/build.mjs"], ["test:package", "scripts/package-test.mjs"]]) {
    assert.match(packageJson.scripts[name], new RegExp(source.replace(".", "\\.")));
    assert(existsSync(join(root, source)), `${name} source script is missing: ${source}`);
    assert.equal(execFileSync("git", ["ls-files", "--error-unmatch", source], { cwd: root, encoding: "utf8" }).trim(), source, `${name} source script is not tracked`);
  }
  assert(existsSync(join(root, "scripts/cli.mjs")), "cli source script is missing");
  assert.equal(packageJson.scripts.cli, "pnpm build && node scripts/cli.mjs");
  assert.match(readFileSync(join(root, ".nerv-context/repo.md"), "utf8"), /pnpm cli -- <arguments>/);
  assert.equal(packageJson.dependencies?.["better-sqlite3"], undefined);
  assert.equal(packageJson.dependencies?.["cross-spawn"], undefined);
  assert.equal(packageJson.devDependencies?.["cross-spawn"], "7.0.6");
  assert.equal(packageJson.devDependencies?.["@types/better-sqlite3"], undefined);
  assert.equal(packageJson.pnpm?.onlyBuiltDependencies?.includes("better-sqlite3"), undefined);
});

test("test command launch failures include process diagnostics", () => {
  const missingCwd = join(tmpdir(), `nerv-missing-cwd-${process.pid}`);
  assert.throws(() => runCommand(process.execPath, ["--version"], { cwd: missingCwd }), (error) =>
    error.message.includes(process.execPath) && error.message.includes(`cwd: ${missingCwd}`) && error.message.includes("error:") && error.message.includes("status:") && error.message.includes("stdout:") && error.message.includes("stderr:"));
});

test("Windows command scripts preserve literal arguments", { skip: process.platform !== "win32" }, () => {
  const temp = mkdtempSync(join(tmpdir(), "nerv-command-args-"));
  try {
    const capture = join(temp, "capture.mjs");
    const wrapper = join(temp, "capture.cmd");
    writeFileSync(capture, 'import { writeFileSync } from "node:fs"; writeFileSync(process.env.NERV_CAPTURE, JSON.stringify(process.argv.slice(2)));\n');
    writeFileSync(wrapper, '@node "%~dp0capture.mjs" %*\r\n');
    const args = ['{"quoted":"a b"}', "space name", "&|<>()^%!literal"];
    runCommand(wrapper, args, { env: { NERV_CAPTURE: join(temp, "args.json") } });
    assert.deepEqual(JSON.parse(readFileSync(join(temp, "args.json"), "utf8")), args);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

function run(command, args, cwd) {
  const result = runCommand(command, args, { cwd, env: { npm_config_update_notifier: "false" } });
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

test("local cli script ignores PATH nerv and runs the repository build", () => {
  const temp = mkdtempSync(join(tmpdir(), "nerv-local-cli-"));
  try {
    const fake = join(temp, process.platform === "win32" ? "nerv.cmd" : "nerv");
    writeFileSync(fake, process.platform === "win32" ? "@echo FAKE_GLOBAL_NERV\r\n" : "#!/bin/sh\nprintf FAKE_GLOBAL_NERV\n");
    if (process.platform !== "win32") chmodSync(fake, 0o755);
    const result = runCommand("pnpm", ["cli", "--", "--help"], { cwd: root, env: { PATH: `${temp}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`, npm_config_update_notifier: "false" } });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    assert.match(output, /Usage: nerv/);
    assert.doesNotMatch(output, /FAKE_GLOBAL_NERV/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("packed artifact has the exact public surface and runs in isolation", { skip: process.env.NERV_PACKAGE_TEST !== "1", timeout: 120_000 }, () => {
  const temp = mkdtempSync(join(tmpdir(), "nerv-package-"));
  try {
    const sourcePackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.equal(sourcePackage.bin.nerv, "dist/index.js");
    const packOutput = run(npm, ["pack", "--json", "--pack-destination", temp], root);
    const packed = JSON.parse(packOutput.match(/\[\s*\{[\s\S]*\}\s*\]/)?.[0] ?? "")[0];
    const archive = join(temp, packed.filename);
    assert.equal(packed.name, sourcePackage.name);
    assert.equal(packed.version, sourcePackage.version);
    assert.deepEqual(packed.files.map((entry) => entry.path).sort(), expectedFiles);
   for (const forbidden of [".nerv/", ".nerv-context/", "test/", "test/fixtures/", ".github/", "src/", "AGENTS.md"]) {
      assert(!packed.files.some((entry) => entry.path === forbidden || entry.path.startsWith(forbidden)), `archive includes ${forbidden}`);
    }

    const consumer = join(temp, "consumer");
    const repo = join(consumer, "repo");
    writeFileSync(join(temp, "package.json"), "{\"private\":true}\n");
    run(npm, ["install", "--ignore-scripts", "--no-package-lock", archive], temp);
    mkdirSync(consumer);
    execFileSync("git", ["init", repo], { encoding: "utf8" });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: repo });
    writeFileSync(join(repo, "README.md"), "base\n");
    execFileSync("git", ["add", "README.md"], { cwd: repo });
    execFileSync("git", ["commit", "-m", "initial"], { cwd: repo });

    const binary = join(temp, "node_modules", ".bin", "nerv");
    assert.equal(run(binary, ["--version"], repo).trim(), packed.version);
    assert.match(run(binary, ["--help"], repo), /Usage: nerv/);
    assert.match(run(binary, ["uninstall", "--help"], repo), /does not uninstall the global npm package/);
    run(binary, ["init"], repo);
    for (const path of ["AGENTS.md", ".agents/skills/nerv/SKILL.md", "CLAUDE.md", ".nerv-context/product.md", ".nerv-context/repo.md"]) assert(existsSync(join(repo, path)), `init did not create ${path}`);
    for (const path of [".agents/skills/nerv/SKILL.md", "CLAUDE.md"]) assert.equal(readFileSync(join(repo, path), "utf8"), readFileSync(join(root, path), "utf8"), `init did not install ${path}`);
    assert.match(readFileSync(join(repo, "AGENTS.md"), "utf8"), /Nerv managed discovery bridge/);
    assert.equal(execFileSync("git", ["check-ignore", ".nerv/nerv.db"], { cwd: repo, encoding: "utf8" }).trim(), ".nerv/nerv.db");
    execFileSync("git", ["add", "AGENTS.md", ".agents/skills/nerv/SKILL.md", "CLAUDE.md", ".nerv-context/product.md", ".nerv-context/repo.md"], { cwd: repo });
    execFileSync("git", ["commit", "-m", "establish nerv"], { cwd: repo });
    const plan = { title: "Packaged lifecycle", intent: "test", goal: "test installed runtime", scope: "test", expected_touchpoints: "README.md", out_of_scope: "none", acceptance_criteria: "works", validation: "installed CLI", tasks: [{ title: "Run", objective: "exercise runtime", implementation_approach: "invoke installed CLI", expected_touchpoints: "README.md", acceptance_criteria: "task completes", validation: "installed CLI" }] };
    const materialized = run(binary, ["work", "materialize", "--plan", JSON.stringify(plan)], repo);
    const workId = materialized.match(/Stable ID: ([0-9a-f-]{36})/)?.[1];
    assert(workId, "packaged lifecycle did not expose a Work identity");
    writeFileSync(join(repo, "change.txt"), "packaged\n");
    run(binary, ["work", "task", "done", "WORK-001", "1", "--evidence", "installed runtime passed", "--files", "change.txt"], repo);
    assert(run(binary, ["review", "WORK-001", "--outcome", "PASS", "--summary", "complete", "--validation-evidence", "installed runtime"], repo).includes("PASS"));
    run(binary, ["close", "WORK-001", "--message", "fix: packaged lifecycle"], repo);
    const committedFiles = execFileSync("git", ["show", "--format=", "--name-only", "HEAD"], { cwd: repo, encoding: "utf8" }).trim().split("\n").filter(Boolean);
    assert.deepEqual(committedFiles, ["change.txt"], "packed lifecycle committed more than the reviewed diff");
    const message = execFileSync("git", ["log", "-1", "--format=%B", "HEAD"], { cwd: repo, encoding: "utf8" });
    assert.equal(message.split(/\r?\n/).filter((line) => line === `Nerv-Work: ${workId}`).length, 1, "Nerv-Work trailer was not canonical");
    assert.equal(message.split(/\r?\n/).filter((line) => line === "Nerv-Work-Ref: WORK-001").length, 1, "Nerv-Work-Ref trailer was not canonical");
    assert.match(run(binary, ["work", "show", "WORK-001"], repo), /State: closed/);
    writeFileSync(join(repo, "developer.txt"), "developer content\n");
    run(binary, ["uninstall"], repo);
    assert(readFileSync(join(repo, "README.md"), "utf8") === "base\n" && readFileSync(join(repo, "developer.txt"), "utf8") === "developer content\n", "packaged uninstall removed developer content");
    assert(!existsSync(join(repo, ".nerv")) && !existsSync(join(repo, ".agents/skills/nerv/SKILL.md")), "packaged uninstall retained Nerv setup");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
