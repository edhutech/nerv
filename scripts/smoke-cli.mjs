import { existsSync, mkdtempSync, mkdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(root, "dist/index.js");

const checks = [
  {
    name: "top-level help lists MVP command groups",
    args: ["--help"],
    exitCode: 0,
    includes: ["Usage: nerv", "init", "product", "new", "build", "start <query>", "status", "clean"],
  },
  {
    name: "init help works",
    args: ["init", "--help"],
    exitCode: 0,
    includes: ["Usage: nerv init", "Initialize Nerv in the current repo."],
  },
  {
    name: "status help works",
    args: ["status", "--help"],
    exitCode: 0,
    includes: ["Usage: nerv status", "Show Nerv workspace status."],
  },
  {
    name: "new command exposes task and build",
    args: ["new", "--help"],
    exitCode: 0,
    includes: ["task <intent>", "build <intent>"],
  },
  {
    name: "build command exposes plan",
    args: ["build", "--help"],
    exitCode: 0,
    includes: ["plan <buildId>"],
  },
];

for (const check of checks) {
  const result = spawnSync(process.execPath, [cli, ...check.args], {
    cwd: root,
    encoding: "utf8",
  });

  const output = `${result.stdout}${result.stderr}`;

  if (result.status !== check.exitCode) {
    fail(check.name, `expected exit ${check.exitCode}, got ${result.status}`, output);
  }

  for (const expected of check.includes) {
    if (!output.includes(expected)) {
      fail(check.name, `missing output: ${expected}`, output);
    }
  }

  console.log(`ok - ${check.name}`);
}

runTemporaryRepoChecks();

function runTemporaryRepoChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-smoke-"));
  const repoRoot = join(tempRoot, "repo");
  const malformedRepoRoot = join(tempRoot, "malformed-repo");
  const nestedDirectory = join(repoRoot, "packages", "app");

  mkdirSync(nestedDirectory, { recursive: true });
  mkdirSync(malformedRepoRoot, { recursive: true });

  try {
    runCheck({
      name: "git repo initialization succeeds from nested directory",
      args: ["init"],
      cwd: nestedDirectory,
      exitCode: 0,
      includes: [`Initialized Nerv in ${repoRoot}.`],
      setup: () => {
        const gitInit = spawnSync("git", ["init", repoRoot], {
          cwd: tempRoot,
          encoding: "utf8",
        });

        if (gitInit.status !== 0) {
          fail(
            "git repo initialization succeeds from nested directory",
            `git init failed with exit ${gitInit.status}`,
            `${gitInit.stdout}${gitInit.stderr}`,
          );
        }
      },
      verify: () => {
        verifyPath("git repo initialization succeeds from nested directory", join(repoRoot, ".nerv"), "directory");
        verifyPath("git repo initialization succeeds from nested directory", join(repoRoot, ".nerv/product"), "directory");
        verifyPath("git repo initialization succeeds from nested directory", join(repoRoot, ".nerv/repo"), "directory");
        verifyPath("git repo initialization succeeds from nested directory", join(repoRoot, ".nerv/agent/runs"), "directory");
        verifyPath("git repo initialization succeeds from nested directory", join(repoRoot, ".nerv/agent/builds"), "directory");
        verifyPath("git repo initialization succeeds from nested directory", join(repoRoot, ".nerv/nerv.db"), "file");
        verifySchema("git repo initialization succeeds from nested directory", join(repoRoot, ".nerv/nerv.db"));
      },
    });

    runCheck({
      name: "status reports not initialized before init",
      args: ["status"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Nerv status: not initialized", `Repo root: ${repoRoot}`],
      setup: () => {
        rmSync(join(repoRoot, ".nerv"), { recursive: true, force: true });
      },
    });

    runCheck({
      name: "init is idempotent",
      args: ["init"],
      cwd: repoRoot,
      exitCode: 0,
      includes: [`Nerv is already initialized in ${repoRoot}.`],
      setup: () => {
        spawnOrFail("init workspace before idempotency check", ["init"], repoRoot);
      },
      verify: () => {
        verifySchema("init is idempotent", join(repoRoot, ".nerv/nerv.db"));
      },
    });

    runCheck({
      name: "status reports initialized after init",
      args: ["status"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Nerv status: initialized", `Repo root: ${repoRoot}`],
      setup: () => {
        spawnOrFail("init workspace before status check", ["init"], repoRoot);
      },
    });

    runCheck({
      name: "status rejects malformed existing schema",
      args: ["status"],
      cwd: malformedRepoRoot,
      exitCode: 0,
      includes: ["Nerv status: not initialized", `Repo root: ${malformedRepoRoot}`],
      setup: () => {
        createMalformedWorkspace(malformedRepoRoot);
      },
    });

    runCheck({
      name: "init rejects malformed existing schema clearly",
      args: ["init"],
      cwd: malformedRepoRoot,
      exitCode: 1,
      includes: ["nerv init failed: existing .nerv/nerv.db does not match the expected Nerv schema"],
      setup: () => {
        createMalformedWorkspace(malformedRepoRoot);
      },
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runCheck(check) {
  check.setup?.();

  const result = spawnSync(process.execPath, [cli, ...check.args], {
    cwd: check.cwd ?? root,
    encoding: "utf8",
  });

  const output = `${result.stdout}${result.stderr}`;

  if (result.status !== check.exitCode) {
    fail(check.name, `expected exit ${check.exitCode}, got ${result.status}`, output);
  }

  for (const expected of check.includes) {
    if (!output.includes(expected)) {
      fail(check.name, `missing output: ${expected}`, output);
    }
  }

  check.verify?.();
  console.log(`ok - ${check.name}`);
}

function spawnOrFail(name, args, cwd) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    fail(name, `expected exit 0, got ${result.status}`, `${result.stdout}${result.stderr}`);
  }
}

function verifyPath(name, path, expectedType) {
  if (!existsSync(path)) {
    fail(name, `missing initialized path: ${path}`, "");
  }

  const stat = statSync(path);
  const matchesType = expectedType === "directory" ? stat.isDirectory() : stat.isFile();

  if (!matchesType) {
    fail(name, `expected ${expectedType} at path: ${path}`, "");
  }
}

function verifySchema(name, databasePath) {
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });

  try {
    const tableNames = new Set(
      database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => row.name),
    );

    for (const tableName of [
      "builds",
      "tasks",
      "runs",
      "checkpoints",
      "reviews",
      "decisions",
      "status_history",
      "metadata",
    ]) {
      if (!tableNames.has(tableName)) {
        fail(name, `missing required table: ${tableName}`, "");
      }
    }
  } finally {
    database.close();
  }
}

function createMalformedWorkspace(repoRoot) {
  rmSync(join(repoRoot, ".git"), { recursive: true, force: true });
  rmSync(join(repoRoot, ".nerv"), { recursive: true, force: true });

  const gitInit = spawnSync("git", ["init", repoRoot], {
    encoding: "utf8",
  });

  if (gitInit.status !== 0) {
    fail("create malformed workspace", `git init failed with exit ${gitInit.status}`, `${gitInit.stdout}${gitInit.stderr}`);
  }

  mkdirSync(join(repoRoot, ".nerv/product"), { recursive: true });
  mkdirSync(join(repoRoot, ".nerv/repo"), { recursive: true });
  mkdirSync(join(repoRoot, ".nerv/agent/runs"), { recursive: true });
  mkdirSync(join(repoRoot, ".nerv/agent/builds"), { recursive: true });

  const database = new Database(join(repoRoot, ".nerv/nerv.db"));

  try {
    for (const tableName of [
      "builds",
      "tasks",
      "runs",
      "checkpoints",
      "reviews",
      "decisions",
      "status_history",
      "metadata",
    ]) {
      database.exec(`CREATE TABLE ${tableName} (x TEXT)`);
    }
  } finally {
    database.close();
  }
}

function fail(name, reason, output) {
  console.error(`not ok - ${name}`);
  console.error(reason);
  if (output.trim()) {
    console.error(output.trim());
  }
  process.exit(1);
}
