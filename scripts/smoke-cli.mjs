import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

import { openRepository } from "../dist/repository.js";

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
    includes: ["task [options] <intent>", "build <intent>"],
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
runRepositoryChecks();
runProductContextChecks();
runRepoContextChecks();
runContextMetadataChecks();
runWorkItemPersistenceChecks();
runTaskCreationChecks();
runBuildCreationChecks();
runQueryChecks();
runStartChecks();
runCurrentAndRunsChecks();
runCheckpointChecks();
runReviewChecks();
runCloseChecks();
runEndToEndLifecycleChecks();
runGitUnavailableChecks();

function runRepositoryChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-repo-smoke-"));
  const repoA = join(tempRoot, "repo-a");
  const repoB = join(tempRoot, "repo-b");

  mkdirSync(repoA, { recursive: true });
  mkdirSync(repoB, { recursive: true });

  try {
    spawnSync("git", ["init", repoA], { encoding: "utf8" });
    spawnSync("git", ["init", repoB], { encoding: "utf8" });
    spawnOrFail("init repo-a for id checks", ["init"], repoA);
    spawnOrFail("init repo-b for id checks", ["init"], repoB);

    const dbA = join(repoA, ".nerv/nerv.db");
    const dbB = join(repoB, ".nerv/nerv.db");

    const repositoryA = openRepository(dbA);
    const repositoryB = openRepository(dbB);

    try {
      const idsA = [
        repositoryA.getNextId("BUILD"),
        repositoryA.getNextId("BUILD"),
        repositoryA.getNextId("TASK"),
        repositoryA.getNextId("RUN"),
      ];

      const idsB = [
        repositoryB.getNextId("BUILD"),
        repositoryB.getNextId("TASK"),
      ];

      const expectedA = ["BUILD-001", "BUILD-002", "TASK-001", "RUN-001"];
      const expectedB = ["BUILD-001", "TASK-001"];

      for (let i = 0; i < expectedA.length; i++) {
        if (idsA[i] !== expectedA[i]) {
          fail("sequential id generation", `expected ${expectedA[i]}, got ${idsA[i]}`, "");
        }
      }

      for (let i = 0; i < expectedB.length; i++) {
        if (idsB[i] !== expectedB[i]) {
          fail("repo-local id generation", `expected ${expectedB[i]}, got ${idsB[i]}`, "");
        }
      }

      console.log("ok - sequential id generation");
      console.log("ok - repo-local id generation");
    } finally {
      repositoryA.close();
      repositoryB.close();
    }

    verifyMalformedCounterRecovery(dbA);
    verifyStaleCounterCollisionAvoidance(dbA);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function verifyMalformedCounterRecovery(databasePath) {
  const database = new Database(databasePath);

  try {
    database
      .prepare("INSERT INTO builds (id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run("BUILD-002", "Existing build", "open", "now", "now");
  } finally {
    database.close();
  }

  const repository = openRepository(databasePath);

  try {
    repository.setMetadata("next_build_number", "not-a-number");
    const id = repository.getNextId("BUILD");

    if (id !== "BUILD-003") {
      fail("malformed id counter recovery", `expected BUILD-003, got ${id}`, "");
    }

    console.log("ok - malformed id counter recovery");
  } finally {
    repository.close();
  }
}

function verifyStaleCounterCollisionAvoidance(databasePath) {
  const database = new Database(databasePath);

  try {
    database
      .prepare("INSERT INTO tasks (id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run("TASK-010", "Existing task", "open", "now", "now");
  } finally {
    database.close();
  }

  const repository = openRepository(databasePath);

  try {
    repository.setMetadata("next_task_number", "1");
    const id = repository.getNextId("TASK");

    if (id !== "TASK-011") {
      fail("stale id counter collision avoidance", `expected TASK-011, got ${id}`, "");
    }

    console.log("ok - stale id counter collision avoidance");
  } finally {
    repository.close();
  }
}

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

    runCheck({
      name: "status migrates old work item schema",
      args: ["status"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Nerv status: initialized", `Repo root: ${repoRoot}`],
      setup: () => {
        createOldSchemaWorkspace(repoRoot);
      },
      verify: () => {
        verifySchema("status migrates old work item schema", join(repoRoot, ".nerv/nerv.db"));
        verifyColumns("status migrates old work item schema", join(repoRoot, ".nerv/nerv.db"), "builds", [
          "intent",
          "goal",
          "user_value",
          "scope",
          "out_of_scope",
          "acceptance_criteria",
          "validation",
          "risks",
          "generated_markdown_path",
        ]);
        verifyColumns("status migrates old work item schema", join(repoRoot, ".nerv/nerv.db"), "tasks", [
          "intent",
          "scope",
          "out_of_scope",
          "acceptance_criteria",
          "validation",
          "risks",
          "generated_markdown_path",
        ]);
      },
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runProductContextChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-product-smoke-"));
  const repoRoot = join(tempRoot, "repo");
  const nonGitDir = join(tempRoot, "non-git");

  mkdirSync(repoRoot, { recursive: true });
  mkdirSync(nonGitDir, { recursive: true });

  try {
    runCheck({
      name: "product scaffolds product files in initialized repo",
      args: ["product"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Created 9 product file(s):"],
      setup: () => {
        spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
        spawnOrFail("init workspace before product check", ["init"], repoRoot);
      },
      verify: () => {
        const productDir = join(repoRoot, ".nerv/product");
        const expectedFiles = [
          "product.md",
          "problem.md",
          "users.md",
          "prd.md",
          "roadmap.md",
          "scope.md",
          "decisions.md",
          "architecture.md",
          "evolution.md",
        ];

        for (const file of expectedFiles) {
          verifyPath("product scaffolds product files in initialized repo", join(productDir, file), "file");
        }
      },
    });

    runCheck({
      name: "product preserves existing files",
      args: ["product"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Preserved 9 existing file(s):"],
      setup: () => {
        writeFileSync(join(repoRoot, ".nerv/product/product.md"), "Custom product context\n", "utf8");
      },
      verify: () => {
        const productDir = join(repoRoot, ".nerv/product");
        const expectedFiles = [
          "product.md",
          "problem.md",
          "users.md",
          "prd.md",
          "roadmap.md",
          "scope.md",
          "decisions.md",
          "architecture.md",
          "evolution.md",
        ];

        for (const file of expectedFiles) {
          verifyPath("product preserves existing files", join(productDir, file), "file");
        }

        const productContent = readFileSync(join(productDir, "product.md"), "utf8");

        if (productContent !== "Custom product context\n") {
          fail("product preserves existing files", "existing product.md content was overwritten", productContent);
        }
      },
    });

    runCheck({
      name: "product fails when workspace not initialized",
      args: ["product"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["Nerv is not initialized in this repo. Run `nerv init` first."],
      setup: () => {
        rmSync(join(repoRoot, ".nerv"), { recursive: true, force: true });
      },
    });

    runCheck({
      name: "product fails when not in git repo",
      args: ["product"],
      cwd: nonGitDir,
      exitCode: 1,
      includes: ["nerv product must be run inside a Git repository."],
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runRepoContextChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-repo-context-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    runCheck({
      name: "repo generates development context",
      args: ["repo"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Generated", ".nerv/repo/development.md"],
      setup: () => {
        spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
        spawnOrFail("init workspace before repo check", ["init"], repoRoot);
        writeFileSync(join(repoRoot, "package.json"), JSON.stringify({
          name: "test",
          scripts: {
            build: "tsc",
            test: "jest",
            lint: "eslint ."
          }
        }), "utf8");
      },
      verify: () => {
        const devDocPath = join(repoRoot, ".nerv/repo/development.md");
        verifyPath("repo generates development context", devDocPath, "file");
        
        const content = readFileSync(devDocPath, "utf8");
        if (!content.includes("package.json")) {
          fail("repo generates development context", "missing package.json in development.md", content);
        }
        if (!content.includes("build")) {
          fail("repo generates development context", "missing build script in development.md", content);
        }
        if (!content.includes("test")) {
          fail("repo generates development context", "missing test script in development.md", content);
        }
      },
    });

    runCheck({
      name: "repo works without package.json",
      args: ["repo"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Generated", ".nerv/repo/development.md"],
      setup: () => {
        rmSync(join(repoRoot, "package.json"), { force: true });
      },
      verify: () => {
        const devDocPath = join(repoRoot, ".nerv/repo/development.md");
        verifyPath("repo works without package.json", devDocPath, "file");
        
        const content = readFileSync(devDocPath, "utf8");
        if (!content.includes("No scripts detected")) {
          fail("repo works without package.json", "should report no scripts detected", content);
        }
      },
    });

    runCheck({
      name: "repo fails when workspace not initialized",
      args: ["repo"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["Nerv is not initialized in this repo. Run `nerv init` first."],
      setup: () => {
        rmSync(join(repoRoot, ".nerv"), { recursive: true, force: true });
      },
    });

    runCheck({
      name: "repo works when git metadata is unavailable",
      args: ["repo"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Generated", "Git available: no"],
      setup: () => {
        spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
        spawnOrFail("init workspace before missing git metadata check", ["init"], repoRoot);
        rmSync(join(repoRoot, ".git"), { recursive: true, force: true });
      },
      verify: () => {
        const devDocPath = join(repoRoot, ".nerv/repo/development.md");
        verifyPath("repo works when git metadata is unavailable", devDocPath, "file");

        const content = readFileSync(devDocPath, "utf8");
        if (!content.includes("Not a Git repository or Git is not available.")) {
          fail("repo works when git metadata is unavailable", "should report unavailable Git metadata", content);
        }
      },
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runContextMetadataChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-context-metadata-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    runCheck({
      name: "product persists metadata in SQLite",
      args: ["product"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Created 9 product file(s):"],
      setup: () => {
        spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
        spawnOrFail("init workspace before metadata check", ["init"], repoRoot);
      },
      verify: () => {
        const database = new Database(join(repoRoot, ".nerv/nerv.db"), { readonly: true });
        try {
          const metadata = database.prepare("SELECT key, value FROM metadata WHERE key LIKE 'product_context_%'").all();
          const metadataMap = new Map(metadata.map((row) => [row.key, row.value]));

          if (!metadataMap.has("product_context_updated_at")) {
            fail("product persists metadata in SQLite", "missing product_context_updated_at", "");
          }
          if (!metadataMap.has("product_context_file_count")) {
            fail("product persists metadata in SQLite", "missing product_context_file_count", "");
          }
          if (metadataMap.get("product_context_file_count") !== "9") {
            fail("product persists metadata in SQLite", `expected 9 files, got ${metadataMap.get("product_context_file_count")}`, "");
          }
        } finally {
          database.close();
        }
      },
    });

    runCheck({
      name: "product persists decisions from decisions.md",
      args: ["product"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Persisted 2 decision(s)"],
      setup: () => {
        const decisionsPath = join(repoRoot, ".nerv/product/decisions.md");
        const content = readFileSync(decisionsPath, "utf8");
        writeFileSync(decisionsPath, content + "\n### Use SQLite for storage\n\n### Use TypeScript for safety\n", "utf8");
      },
      verify: () => {
        const database = new Database(join(repoRoot, ".nerv/nerv.db"), { readonly: true });
        try {
          const decisions = database.prepare("SELECT scope_type, scope_id, summary FROM decisions WHERE scope_type = 'product'").all();

          if (decisions.length !== 2) {
            fail("product persists decisions from decisions.md", `expected 2 decisions, got ${decisions.length}`, "");
          }

          const summaries = decisions.map((d) => d.summary).sort();
          if (!summaries.includes("Use SQLite for storage") || !summaries.includes("Use TypeScript for safety")) {
            fail("product persists decisions from decisions.md", `unexpected summaries: ${summaries.join(", ")}`, "");
          }
        } finally {
          database.close();
        }
      },
    });

    runCheck({
      name: "product clears removed decisions",
      args: ["product"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Preserved 9 existing file(s):"],
      setup: () => {
        writeFileSync(join(repoRoot, ".nerv/product/decisions.md"), "# Decisions\n", "utf8");
      },
      verify: () => {
        const database = new Database(join(repoRoot, ".nerv/nerv.db"), { readonly: true });
        try {
          const decisions = database.prepare("SELECT summary FROM decisions WHERE scope_type = 'product'").all();

          if (decisions.length !== 0) {
            fail("product clears removed decisions", `expected 0 decisions, got ${decisions.length}`, "");
          }
        } finally {
          database.close();
        }
      },
    });

    runCheck({
      name: "repo persists metadata in SQLite",
      args: ["repo"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Generated"],
      verify: () => {
        const database = new Database(join(repoRoot, ".nerv/nerv.db"), { readonly: true });
        try {
          const row = database.prepare("SELECT value FROM metadata WHERE key = 'repo_context_updated_at'").get();
          if (!row || !row.value) {
            fail("repo persists metadata in SQLite", "missing repo_context_updated_at", "");
          }
        } finally {
          database.close();
        }
      },
    });

    runCheck({
      name: "status shows context availability",
      args: ["status"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Context availability:", "Product context: available", "Repo context: available"],
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
      "close_records",
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

function verifyColumns(name, databasePath, tableName, expectedColumns) {
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });

  try {
    const columnNames = new Set(database.prepare(`PRAGMA table_info(${tableName})`).all().map((row) => row.name));

    for (const columnName of expectedColumns) {
      if (!columnNames.has(columnName)) {
        fail(name, `missing required column ${tableName}.${columnName}`, "");
      }
    }
  } finally {
    database.close();
  }
}

function createOldSchemaWorkspace(repoRoot) {
  rmSync(join(repoRoot, ".nerv"), { recursive: true, force: true });

  mkdirSync(join(repoRoot, ".nerv/product"), { recursive: true });
  mkdirSync(join(repoRoot, ".nerv/repo"), { recursive: true });
  mkdirSync(join(repoRoot, ".nerv/agent/runs"), { recursive: true });
  mkdirSync(join(repoRoot, ".nerv/agent/builds"), { recursive: true });

  const database = new Database(join(repoRoot, ".nerv/nerv.db"));

  try {
    database.exec(`CREATE TABLE metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    database.exec(`CREATE TABLE builds (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      closed_at TEXT
    )`);
    database.exec(`CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      build_id TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      closed_at TEXT,
      FOREIGN KEY (build_id) REFERENCES builds(id)
    )`);
    database.exec(`CREATE TABLE runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      closed_at TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    )`);
    database.exec(`CREATE TABLE checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    )`);
    database.exec(`CREATE TABLE reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    )`);
    database.exec(`CREATE TABLE decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`);
    database.exec(`CREATE TABLE status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`);
    database
      .prepare("INSERT INTO metadata (key, value, updated_at) VALUES (?, ?, ?)")
      .run("schema_version", "1", "now");
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

function runWorkItemPersistenceChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-workitem-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init repo for work item checks", ["init"], repoRoot);

    const dbPath = join(repoRoot, ".nerv/nerv.db");
    const repository = openRepository(dbPath);

    try {
      const buildId = repository.getNextId("BUILD");
      const build = repository.createBuild({
        id: buildId,
        title: "Test Build",
        intent: "Test intent for build",
        goal: "Test goal",
        user_value: "Test user value",
        scope: "Test scope",
        out_of_scope: "Test out of scope",
        acceptance_criteria: "Test acceptance criteria",
        validation: "Test validation",
        risks: "Test risks",
        generated_markdown_path: ".nerv/agent/builds/BUILD-001.md",
      });

      if (build.id !== "BUILD-001") {
        fail("work item build creation", `expected BUILD-001, got ${build.id}`, "");
      }
      if (build.title !== "Test Build") {
        fail("work item build creation", `expected title 'Test Build', got '${build.title}'`, "");
      }
      if (build.intent !== "Test intent for build") {
        fail("work item build creation", `expected intent to be stored`, "");
      }
      if (build.generated_markdown_path !== ".nerv/agent/builds/BUILD-001.md") {
        fail("work item build creation", `expected generated_markdown_path to be stored`, "");
      }

      console.log("ok - work item build creation");

      const retrievedBuild = repository.getBuild("BUILD-001");
      if (!retrievedBuild) {
        fail("work item build retrieval", "build not found", "");
      }
      if (retrievedBuild.title !== "Test Build") {
        fail("work item build retrieval", "title mismatch", "");
      }

      console.log("ok - work item build retrieval");

      const builds = repository.listBuilds();
      if (builds.length !== 1) {
        fail("work item build listing", `expected 1 build, got ${builds.length}`, "");
      }

      console.log("ok - work item build listing");

      repository.updateBuild("BUILD-001", { title: "Updated Build", status: "approved" });
      const updatedBuild = repository.getBuild("BUILD-001");
      if (updatedBuild.title !== "Updated Build") {
        fail("work item build update", "title not updated", "");
      }
      if (updatedBuild.status !== "approved") {
        fail("work item build update", "status not updated", "");
      }

      console.log("ok - work item build update");

      const taskId = repository.getNextId("TASK");
      const task = repository.createTask({
        id: taskId,
        build_id: "BUILD-001",
        title: "Test Task",
        intent: "Test task intent",
        scope: "Test task scope",
        out_of_scope: "Test task out of scope",
        acceptance_criteria: "Test task acceptance criteria",
        validation: "Test task validation",
        risks: "Test task risks",
        generated_markdown_path: ".nerv/agent/tasks/TASK-001.md",
      });

      if (task.id !== "TASK-001") {
        fail("work item task creation", `expected TASK-001, got ${task.id}`, "");
      }
      if (task.build_id !== "BUILD-001") {
        fail("work item task creation", "build_id not set", "");
      }
      if (task.intent !== "Test task intent") {
        fail("work item task creation", "intent not stored", "");
      }

      console.log("ok - work item task creation");

      const retrievedTask = repository.getTask("TASK-001");
      if (!retrievedTask) {
        fail("work item task retrieval", "task not found", "");
      }

      console.log("ok - work item task retrieval");

      const tasks = repository.listTasks();
      if (tasks.length !== 1) {
        fail("work item task listing", `expected 1 task, got ${tasks.length}`, "");
      }

      console.log("ok - work item task listing");

      const tasksByBuild = repository.listTasksByBuild("BUILD-001");
      if (tasksByBuild.length !== 1) {
        fail("work item task listing by build", `expected 1 task, got ${tasksByBuild.length}`, "");
      }
      if (tasksByBuild[0].id !== "TASK-001") {
        fail("work item task listing by build", "wrong task returned", "");
      }

      console.log("ok - work item task listing by build");

      repository.updateTask("TASK-001", { title: "Updated Task", status: "in_progress" });
      const updatedTask = repository.getTask("TASK-001");
      if (updatedTask.title !== "Updated Task") {
        fail("work item task update", "title not updated", "");
      }
      if (updatedTask.status !== "in_progress") {
        fail("work item task update", "status not updated", "");
      }

      console.log("ok - work item task update");

      const taskWithoutBuild = repository.createTask({
        id: "TASK-002",
        title: "Standalone Task",
      });
      if (taskWithoutBuild.build_id !== null) {
        fail("work item task without build", "build_id should be null", "");
      }

      console.log("ok - work item task without build");

      const exactSelectedTask = repository.selectTaskForRun("TASK-001");
      if (exactSelectedTask.id !== "TASK-001") {
        fail("run task selection by exact id", `expected TASK-001, got ${exactSelectedTask.id}`, "");
      }

      console.log("ok - run task selection by exact id");

      const textSelectedTask = repository.selectTaskForRun("Standalone");
      if (textSelectedTask.id !== "TASK-002") {
        fail("run task selection by text", `expected TASK-002, got ${textSelectedTask.id}`, "");
      }

      console.log("ok - run task selection by text");

      try {
        repository.selectTaskForRun("Task");
        fail("run task selection rejects ambiguous query", "expected ambiguous query to throw", "");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("ambiguous")) {
          fail("run task selection rejects ambiguous query", `unexpected error: ${message}`, "");
        }
      }

      console.log("ok - run task selection rejects ambiguous query");

      try {
        repository.selectTaskForRun("Missing task");
        fail("run task selection rejects missing query", "expected missing query to throw", "");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("No task found")) {
          fail("run task selection rejects missing query", `unexpected error: ${message}`, "");
        }
      }

      console.log("ok - run task selection rejects missing query");

      const runId = repository.getNextId("RUN");
      const run = repository.createRun({ id: runId, task_id: "TASK-001" });
      if (run.id !== "RUN-001") {
        fail("work item run creation", `expected RUN-001, got ${run.id}`, "");
      }
      if (run.task_id !== "TASK-001") {
        fail("work item run creation", "task_id not set", "");
      }
      if (run.status !== "active") {
        fail("work item run creation", `expected active status, got ${run.status}`, "");
      }

      console.log("ok - work item run creation");

      const retrievedRun = repository.getRun("RUN-001");
      if (!retrievedRun) {
        fail("work item run retrieval", "run not found", "");
      }

      console.log("ok - work item run retrieval");

      const runs = repository.listRuns();
      if (runs.length !== 1) {
        fail("work item run listing", `expected 1 run, got ${runs.length}`, "");
      }

      console.log("ok - work item run listing");

      const checkpoint = repository.createCheckpoint({
        run_id: "RUN-001",
        summary: "Implemented first checkpoint",
      });
      if (checkpoint.id !== 1) {
        fail("work item checkpoint creation", `expected checkpoint id 1, got ${checkpoint.id}`, "");
      }
      if (checkpoint.run_id !== "RUN-001") {
        fail("work item checkpoint creation", "run_id not set", "");
      }
      if (checkpoint.summary !== "Implemented first checkpoint") {
        fail("work item checkpoint creation", "summary not stored", "");
      }

      console.log("ok - work item checkpoint creation");

      const checkpoints = repository.listCheckpoints("RUN-001");
      if (checkpoints.length !== 1) {
        fail("work item checkpoint listing", `expected 1 checkpoint, got ${checkpoints.length}`, "");
      }
      if (checkpoints[0].summary !== "Implemented first checkpoint") {
        fail("work item checkpoint listing", "wrong checkpoint returned", "");
      }

      console.log("ok - work item checkpoint listing");

      const review = repository.createReview({
        run_id: "RUN-001",
        outcome: "passed",
        summary: "Implementation complete",
      });
      if (review.id !== 1) {
        fail("work item review creation", `expected review id 1, got ${review.id}`, "");
      }
      if (review.run_id !== "RUN-001") {
        fail("work item review creation", "run_id not set", "");
      }
      if (review.outcome !== "passed") {
        fail("work item review creation", "outcome not stored", "");
      }
      if (review.summary !== "Implementation complete") {
        fail("work item review creation", "summary not stored", "");
      }

      console.log("ok - work item review creation");

      const reviews = repository.listReviews("RUN-001");
      if (reviews.length !== 1) {
        fail("work item review listing", `expected 1 review, got ${reviews.length}`, "");
      }
      if (reviews[0].summary !== "Implementation complete") {
        fail("work item review listing", "wrong review returned", "");
      }

      console.log("ok - work item review listing");

      repository.setCurrentRunId("RUN-001");
      const currentRunId = repository.getCurrentRunId();
      if (currentRunId !== "RUN-001") {
        fail("current run metadata", `expected RUN-001, got ${currentRunId}`, "");
      }

      console.log("ok - current run metadata");
    } finally {
      repository.close();
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runTaskCreationChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-task-smoke-"));
  const repoRoot = join(tempRoot, "repo");
  const nonGitDir = join(tempRoot, "non-git");

  mkdirSync(repoRoot, { recursive: true });
  mkdirSync(nonGitDir, { recursive: true });

  try {
    runCheck({
      name: "new task creates task in initialized repo",
      args: ["new", "task", "Add Google login without breaking email auth"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Created TASK-001", "Add Google login without breaking email auth", "Next steps:"],
      setup: () => {
        spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
        spawnOrFail("init workspace before task check", ["init"], repoRoot);
      },
      verify: () => {
        const taskFile = join(repoRoot, ".nerv/agent/tasks/TASK-001.md");
        verifyPath("new task creates task in initialized repo", taskFile, "file");

        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const task = repository.getTask("TASK-001");
          if (!task) {
            fail("new task creates task in initialized repo", "task not found in database", "");
          }
          if (task.title !== "Add Google login without breaking email auth") {
            fail("new task creates task in initialized repo", `title mismatch: ${task.title}`, "");
          }
          if (task.intent !== "Add Google login without breaking email auth") {
            fail("new task creates task in initialized repo", `intent mismatch: ${task.intent}`, "");
          }
          if (task.status !== "proposed") {
            fail("new task creates task in initialized repo", `status mismatch: ${task.status}`, "");
          }
        } finally {
          repository.close();
        }
      },
    });

    runCheck({
      name: "new task fails when not in git repo",
      args: ["new", "task", "Test task"],
      cwd: nonGitDir,
      exitCode: 1,
      includes: ["must be run inside a Git repository"],
    });

    runCheck({
      name: "new task detects large intent",
      args: ["new", "task", "Build a complete authentication system with OAuth and SAML"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["appears to be large", "nerv new build"],
    });

    runCheck({
      name: "new task --yes creates build for large intent",
      args: ["new", "task", "--yes", "Build a complete authentication system with OAuth and SAML"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Created BUILD-001", "Next steps:", "nerv build plan BUILD-001"],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const build = repository.getBuild("BUILD-001");
          if (!build) {
            fail("new task --yes creates build for large intent", "build not found in database", "");
          }
          if (build.intent !== "Build a complete authentication system with OAuth and SAML") {
            fail("new task --yes creates build for large intent", `intent mismatch: ${build.intent}`, "");
          }
          const tasks = repository.listTasks();
          if (tasks.length !== 1) {
            fail("new task --yes creates build for large intent", `expected no extra task, got ${tasks.length}`, "");
          }
        } finally {
          repository.close();
        }
      },
    });

    runCheck({
      name: "new task --force bypasses large intent detection",
      args: ["new", "task", "--force", "Build a complete authentication system with OAuth and SAML"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Created TASK-002", "Large intent was detected"],
    });

    runCheck({
      name: "new task generates sequential IDs",
      args: ["new", "task", "Another simple task"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Created TASK-003"],
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runBuildCreationChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-build-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace before build check", ["init"], repoRoot);

    runCheck({
      name: "new build creates build in initialized repo",
      args: ["new", "build", "Implement user authentication system"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Created BUILD-001", "Implement user authentication system", "Next steps:"],
      verify: () => {
        const buildFile = join(repoRoot, ".nerv/agent/builds/BUILD-001.md");
        verifyPath("new build creates build in initialized repo", buildFile, "file");

        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const build = repository.getBuild("BUILD-001");
          if (!build) {
            fail("new build creates build in initialized repo", "build not found in database", "");
          }
          if (build.title !== "Implement user authentication system") {
            fail("new build creates build in initialized repo", `title mismatch: ${build.title}`, "");
          }
          if (build.intent !== "Implement user authentication system") {
            fail("new build creates build in initialized repo", `intent mismatch: ${build.intent}`, "");
          }
          if (build.status !== "proposed") {
            fail("new build creates build in initialized repo", `status mismatch: ${build.status}`, "");
          }
        } finally {
          repository.close();
        }
      },
    });

    runCheck({
      name: "build plan creates tasks for build",
      args: ["build", "plan", "BUILD-001"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Planned 3 task(s) for BUILD-001", "TASK-001", "TASK-002", "TASK-003"],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const tasks = repository.listTasksByBuild("BUILD-001");
          if (tasks.length !== 3) {
            fail("build plan creates tasks for build", `expected 3 tasks, got ${tasks.length}`, "");
          }
          for (const task of tasks) {
            if (task.build_id !== "BUILD-001") {
              fail("build plan creates tasks for build", `task ${task.id} not linked to BUILD-001`, "");
            }
            const taskFile = join(repoRoot, ".nerv/agent/tasks", `${task.id}.md`);
            verifyPath("build plan creates tasks for build", taskFile, "file");
          }
        } finally {
          repository.close();
        }
      },
    });

    runCheck({
      name: "build plan is idempotent",
      args: ["build", "plan", "BUILD-001"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["already has 3 planned task(s)"],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const tasks = repository.listTasksByBuild("BUILD-001");
          if (tasks.length !== 3) {
            fail("build plan is idempotent", `expected 3 tasks, got ${tasks.length}`, "");
          }
        } finally {
          repository.close();
        }
      },
    });

    runCheck({
      name: "build plan fails for non-existent build",
      args: ["build", "plan", "BUILD-999"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["not found"],
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runQueryChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-query-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace before query check", ["init"], repoRoot);

    runCheck({
      name: "tasks shows empty list message",
      args: ["tasks"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["No tasks found."],
    });

    runCheck({
      name: "builds shows empty list message",
      args: ["builds"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["No builds found."],
    });

    // Create some test data
    spawnOrFail("create build for query check", ["new", "build", "Implement user authentication"], repoRoot);
    spawnOrFail("create task for query check", ["new", "task", "Add login form"], repoRoot);
    spawnOrFail("plan build for query check", ["build", "plan", "BUILD-001"], repoRoot);

    runCheck({
      name: "tasks lists all tasks",
      args: ["tasks"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Found 4 task(s)", "[BUILD-001]"],
    });

    runCheck({
      name: "tasks treats whitespace query as list",
      args: ["tasks", "   "],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Found 4 task(s):"],
    });

    runCheck({
      name: "tasks searches by ID",
      args: ["tasks", "TASK-001"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Found 1 task(s) matching \"TASK-001\"", "TASK-001"],
    });

    runCheck({
      name: "tasks searches by text",
      args: ["tasks", "login"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Found 1 task(s) matching \"login\"", "Add login form"],
    });

    runCheck({
      name: "tasks shows no results message",
      args: ["tasks", "nonexistent"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["No tasks found matching \"nonexistent\""],
    });

    runCheck({
      name: "builds lists all builds",
      args: ["builds"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Found 1 build(s)", "BUILD-001", "Tasks: 3"],
    });

    runCheck({
      name: "builds treats whitespace query as list",
      args: ["builds", "   "],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Found 1 build(s):", "BUILD-001"],
    });

    runCheck({
      name: "builds searches by ID",
      args: ["builds", "BUILD-001"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Found 1 build(s) matching \"BUILD-001\"", "BUILD-001"],
    });

    runCheck({
      name: "builds searches by text",
      args: ["builds", "authentication"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Found 1 build(s) matching \"authentication\"", "Implement user authentication"],
    });

    runCheck({
      name: "builds shows no results message",
      args: ["builds", "nonexistent"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["No builds found matching \"nonexistent\""],
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runStartChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-start-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace before start check", ["init"], repoRoot);
    spawnOrFail("create task 1 for start check", ["new", "task", "Add sample feature"], repoRoot);
    spawnOrFail("create task 2 for start check", ["new", "task", "Add another feature"], repoRoot);

    runCheck({
      name: "start creates run and generates run.md",
      args: ["start", "TASK-001"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Started RUN-001 for TASK-001", "Parent Build: None", ".nerv/agent/runs/RUN-001/run.md"],
      verify: () => {
        const runDir = join(repoRoot, ".nerv/agent/runs/RUN-001");
        const runFile = join(runDir, "run.md");
        const taskFile = join(runDir, "task.md");

        verifyPath("start creates run.md", runFile, "file");
        verifyPath("start creates task.md", taskFile, "file");

        const runContent = readFileSync(runFile, "utf8");
        if (!runContent.includes("## Active Task")) {
          fail("start creates run.md", "missing Active Task section", "");
        }
        if (!runContent.includes("`./task.md`")) {
          fail("start creates run.md", "missing local task.md primary context link", "");
        }
        if (!runContent.includes("`../../tasks/TASK-001.md`")) {
          fail("start creates run.md", "missing source task supporting context link", "");
        }
        if (!runContent.includes("`../../../product/product.md`")) {
          fail("start creates run.md", "missing product supporting context link", "");
        }
        if (!runContent.includes("## Scope rule")) {
          fail("start creates run.md", "missing Scope rule section", "");
        }
        if (!runContent.includes("## Acceptance criteria")) {
          fail("start creates run.md", "missing Acceptance criteria section", "");
        }
        if (!runContent.includes("## Validation")) {
          fail("start creates run.md", "missing Validation section", "");
        }
        if (!runContent.includes("## Checkpoint instructions")) {
          fail("start creates run.md", "missing Checkpoint instructions section", "");
        }
        if (!runContent.includes("nerv checkpoint --summary")) {
          fail("start creates run.md", "missing checkpoint command guidance", "");
        }
        if (!runContent.includes("## Review instructions")) {
          fail("start creates run.md", "missing Review instructions section", "");
        }
        if (!runContent.includes("nerv review --outcome passed")) {
          fail("start creates run.md", "missing review command guidance", "");
        }
        if (!runContent.includes("## Close instructions")) {
          fail("start creates run.md", "missing Close instructions section", "");
        }
        if (!runContent.includes("## Git awareness")) {
          fail("start creates run.md", "missing Git awareness section", "");
        }

        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const run = repository.getRun("RUN-001");
          if (!run) {
            fail("start creates run in database", "run not found", "");
          }
          if (run.task_id !== "TASK-001") {
            fail("start creates run in database", `expected task_id TASK-001, got ${run.task_id}`, "");
          }
          if (run.status !== "active") {
            fail("start creates run in database", `expected active status, got ${run.status}`, "");
          }

          const currentRunId = repository.getCurrentRunId();
          if (currentRunId !== "RUN-001") {
            fail("start sets current run", `expected RUN-001, got ${currentRunId}`, "");
          }
        } finally {
          repository.close();
        }
      },
    });

    runCheck({
      name: "start fails for non-existent task",
      args: ["start", "TASK-999"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["No task found"],
    });

    runCheck({
      name: "start fails for ambiguous query",
      args: ["start", "feature"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["ambiguous"],
    });

    runCheck({
      name: "start sets current run in database",
      args: ["start", "TASK-001"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Started RUN-002"],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const currentRunId = repository.getCurrentRunId();
          if (currentRunId !== "RUN-002") {
            fail("start sets current run in database", `expected RUN-002, got ${currentRunId}`, "");
          }
        } finally {
          repository.close();
        }
      },
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runCurrentAndRunsChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-current-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace before current check", ["init"], repoRoot);

    runCheck({
      name: "current shows no current run message",
      args: ["current"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["No current run."],
    });

    runCheck({
      name: "runs shows empty list message",
      args: ["runs"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["No runs found."],
    });

    spawnOrFail("create task for current check", ["new", "task", "Add sample feature"], repoRoot);
    spawnOrFail("start run for current check", ["start", "TASK-001"], repoRoot);

    runCheck({
      name: "current shows active run",
      args: ["current"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["RUN-001:", "TASK-001", "Add sample feature", "Status: active", ".nerv/agent/runs/RUN-001/run.md"],
    });

    runCheck({
      name: "runs lists created runs",
      args: ["runs"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Found 1 run(s):", "RUN-001:", "TASK-001", "Add sample feature", "Status: active"],
    });

    spawnOrFail("start second run for current check", ["start", "TASK-001"], repoRoot);

    runCheck({
      name: "runs lists multiple runs",
      args: ["runs"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Found 2 run(s):", "RUN-001:", "RUN-002:"],
    });

    runCheck({
      name: "current shows most recent run",
      args: ["current"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["RUN-002:", "TASK-001"],
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runCheckpointChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-checkpoint-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace before checkpoint check", ["init"], repoRoot);

    runCheck({
      name: "checkpoint fails without current run",
      args: ["checkpoint", "--summary", "Nothing active"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["No current run"],
    });

    spawnOrFail("create task for checkpoint check", ["new", "task", "Add checkpointable feature"], repoRoot);
    spawnOrFail("start run for checkpoint check", ["start", "TASK-001"], repoRoot);

    runCheck({
      name: "checkpoint saves for explicit run",
      args: [
        "checkpoint",
        "--run",
        "RUN-001",
        "--summary",
        "Implemented checkpoint flow",
        "--files",
        "src/index.ts;scripts/smoke-cli.mjs",
        "--decisions",
        "Store summary in SQLite",
        "--pending",
        "Review remains next",
      ],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Saved checkpoint 1 for RUN-001", "Implemented checkpoint flow", ".nerv/agent/runs/RUN-001/checkpoints/checkpoint-001.md"],
      verify: () => {
        const checkpointFile = join(repoRoot, ".nerv/agent/runs/RUN-001/checkpoints/checkpoint-001.md");
        verifyPath("checkpoint saves for explicit run", checkpointFile, "file");

        const checkpointContent = readFileSync(checkpointFile, "utf8");
        if (!checkpointContent.includes("Implemented checkpoint flow")) {
          fail("checkpoint saves for explicit run", "missing summary in checkpoint file", checkpointContent);
        }
        if (!checkpointContent.includes("- src/index.ts")) {
          fail("checkpoint saves for explicit run", "missing files list in checkpoint file", checkpointContent);
        }

        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const checkpoints = repository.listCheckpoints("RUN-001");
          if (checkpoints.length !== 1) {
            fail("checkpoint saves for explicit run", `expected 1 checkpoint, got ${checkpoints.length}`, "");
          }
          if (checkpoints[0].summary !== "Implemented checkpoint flow") {
            fail("checkpoint saves for explicit run", `summary mismatch: ${checkpoints[0].summary}`, "");
          }
        } finally {
          repository.close();
        }
      },
    });

    runCheck({
      name: "checkpoint uses current run",
      args: ["checkpoint", "--summary", "Saved current run checkpoint"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Saved checkpoint 2 for RUN-001", "Saved current run checkpoint"],
      verify: () => {
        const checkpointFile = join(repoRoot, ".nerv/agent/runs/RUN-001/checkpoints/checkpoint-002.md");
        verifyPath("checkpoint uses current run", checkpointFile, "file");
      },
    });

    runCheck({
      name: "checkpoint fails for missing run",
      args: ["checkpoint", "--run", "RUN-999", "--summary", "Missing run"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["Run RUN-999 not found"],
    });

    runCheck({
      name: "checkpoint fails for empty summary",
      args: ["checkpoint", "--run", "RUN-001", "--summary", "   "],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["Checkpoint summary is required"],
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runReviewChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-review-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace before review check", ["init"], repoRoot);

    runCheck({
      name: "review fails without current run",
      args: ["review", "--outcome", "passed", "--summary", "Nothing active"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["No current run"],
    });

    spawnOrFail("create task for review check", ["new", "task", "Add reviewable feature"], repoRoot);
    spawnOrFail("start run for review check", ["start", "TASK-001"], repoRoot);

    runCheck({
      name: "review saves for explicit run",
      args: [
        "review",
        "--run",
        "RUN-001",
        "--outcome",
        "passed",
        "--summary",
        "Implementation complete and validated",
        "--validation",
        "passed",
        "--evidence",
        "All tests pass, build succeeds",
      ],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Saved review 1 for RUN-001", "passed", ".nerv/agent/runs/RUN-001/reviews/review-001.md"],
      verify: () => {
        const reviewFile = join(repoRoot, ".nerv/agent/runs/RUN-001/reviews/review-001.md");
        verifyPath("review saves for explicit run", reviewFile, "file");

        const reviewContent = readFileSync(reviewFile, "utf8");
        if (!reviewContent.includes("Implementation complete and validated")) {
          fail("review saves for explicit run", "missing summary in review file", reviewContent);
        }
        if (!reviewContent.includes("passed")) {
          fail("review saves for explicit run", "missing outcome in review file", reviewContent);
        }
        if (!reviewContent.includes("## Git Status")) {
          fail("review saves for explicit run", "missing Git Status section", reviewContent);
        }
        if (!reviewContent.includes("## Git Diff Summary")) {
          fail("review saves for explicit run", "missing Git Diff Summary section", reviewContent);
        }

        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const reviews = repository.listReviews("RUN-001");
          if (reviews.length !== 1) {
            fail("review saves for explicit run", `expected 1 review, got ${reviews.length}`, "");
          }
          if (reviews[0].outcome !== "passed") {
            fail("review saves for explicit run", `outcome mismatch: ${reviews[0].outcome}`, "");
          }
          if (reviews[0].summary !== "Implementation complete and validated") {
            fail("review saves for explicit run", `summary mismatch: ${reviews[0].summary}`, "");
          }
        } finally {
          repository.close();
        }
      },
    });

    runCheck({
      name: "review uses current run",
      args: ["review", "--outcome", "failed", "--summary", "Missing evidence"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Saved review 2 for RUN-001", "failed", "Warning: Validation was not run"],
      verify: () => {
        const reviewFile = join(repoRoot, ".nerv/agent/runs/RUN-001/reviews/review-002.md");
        verifyPath("review uses current run", reviewFile, "file");
      },
    });

    runCheck({
      name: "review fails for missing run",
      args: ["review", "--run", "RUN-999", "--outcome", "passed", "--summary", "Missing run"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["Run RUN-999 not found"],
    });

    runCheck({
      name: "review fails for empty summary",
      args: ["review", "--run", "RUN-001", "--outcome", "passed", "--summary", "   "],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["Review summary is required"],
    });

    runCheck({
      name: "review fails for invalid outcome",
      args: ["review", "--run", "RUN-001", "--outcome", "maybe", "--summary", "Invalid outcome"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["Review outcome must be 'passed' or 'failed'"],
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runCloseChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-close-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace before close check", ["init"], repoRoot);

    runCheck({
      name: "close fails without current run",
      args: ["close"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["No current run"],
    });

    spawnOrFail("create task for close check", ["new", "task", "Add closeable feature"], repoRoot);
    spawnOrFail("start run for close check", ["start", "TASK-001"], repoRoot);

    runCheck({
      name: "close fails without passed review",
      args: ["close", "--run", "RUN-001"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["cannot be closed without a passed review"],
    });

    spawnOrFail(
      "add passed review for close check",
      [
        "review",
        "--run",
        "RUN-001",
        "--outcome",
        "passed",
        "--summary",
        "Ready to close",
        "--validation",
        "passed",
        "--evidence",
        "All checks pass",
      ],
      repoRoot,
    );

    spawnSync("git", ["add", "."], { cwd: repoRoot, encoding: "utf8" });
    spawnSync(
      "git",
      ["commit", "-m", "TASK-001 Add closeable feature", "--allow-empty"],
      { cwd: repoRoot, encoding: "utf8" },
    );

    runCheck({
      name: "close succeeds with passed review and git",
      args: ["close", "--run", "RUN-001"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Closed RUN-001", "Status: closed", "Commit:"],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const run = repository.getRun("RUN-001");
          if (!run) {
            fail("close succeeds with passed review and git", "run not found", "");
          }
          if (run.status !== "closed") {
            fail("close succeeds with passed review and git", `run status: ${run.status}`, "");
          }
          if (!run.closed_at) {
            fail("close succeeds with passed review and git", "run closed_at not set", "");
          }

          const task = repository.getTask("TASK-001");
          if (!task) {
            fail("close succeeds with passed review and git", "task not found", "");
          }
          if (task.status !== "closed") {
            fail("close succeeds with passed review and git", `task status: ${task.status}`, "");
          }
          if (!task.closed_at) {
            fail("close succeeds with passed review and git", "task closed_at not set", "");
          }

          const closeRecord = repository.getCloseRecord("RUN-001");
          if (!closeRecord) {
            fail("close succeeds with passed review and git", "close record not found", "");
          }
          if (!closeRecord.commit_hash) {
            fail("close succeeds with passed review and git", "commit hash not captured", "");
          }
        } finally {
          repository.close();
        }
      },
    });

    runCheck({
      name: "close fails for already closed run",
      args: ["close", "--run", "RUN-001"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["already closed"],
    });

    spawnOrFail("create second task for close check", ["new", "task", "Add another feature"], repoRoot);
    spawnOrFail("start second run for close check", ["start", "TASK-002"], repoRoot);

    runCheck({
      name: "close uses current run",
      args: ["close"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["cannot be closed without a passed review"],
    });

    const buildTempRoot = mkdtempSync(join(tmpdir(), "nerv-close-build-smoke-"));
    const buildRepoRoot = join(buildTempRoot, "repo");
    mkdirSync(buildRepoRoot, { recursive: true });

    try {
      spawnSync("git", ["init", buildRepoRoot], { encoding: "utf8" });
      spawnOrFail("init workspace for build close check", ["init"], buildRepoRoot);
      spawnOrFail("scaffold product for build close check", ["product"], buildRepoRoot);

      spawnOrFail("create build for close check", ["new", "build", "Add build close test"], buildRepoRoot);
      spawnOrFail("plan build for close check", ["build", "plan", "BUILD-001"], buildRepoRoot);

      spawnOrFail("start first task for build close check", ["start", "TASK-001"], buildRepoRoot);
      spawnOrFail(
        "review first task for build close check",
        ["review", "--run", "RUN-001", "--outcome", "passed", "--summary", "First task done", "--validation", "passed"],
        buildRepoRoot,
      );
      spawnSync("git", ["add", "."], { cwd: buildRepoRoot, encoding: "utf8" });
      spawnSync("git", ["commit", "-m", "TASK-001 done", "--allow-empty"], { cwd: buildRepoRoot, encoding: "utf8" });

      runCheck({
        name: "close updates build progress",
        args: ["close", "--run", "RUN-001"],
        cwd: buildRepoRoot,
        exitCode: 0,
        includes: ["Closed RUN-001", "Build BUILD-001 progress:"],
        verify: () => {
          const dbPath = join(buildRepoRoot, ".nerv/nerv.db");
          const repository = openRepository(dbPath);
          try {
            const build = repository.getBuild("BUILD-001");
            if (!build) {
              fail("close updates build progress", "build not found", "");
            }
            if (build.status === "closed") {
              fail("close updates build progress", "build should not be closed yet", "");
            }
          } finally {
            repository.close();
          }

          const evolutionPath = join(buildRepoRoot, ".nerv/product/evolution.md");
          const evolutionContent = readFileSync(evolutionPath, "utf8");
          if (!evolutionContent.includes("TASK-001")) {
            fail("close updates build progress", "evolution missing TASK-001", evolutionContent);
          }
        },
      });

      spawnOrFail("start second task for build close check", ["start", "TASK-002"], buildRepoRoot);
      spawnOrFail(
        "review second task for build close check",
        ["review", "--run", "RUN-002", "--outcome", "passed", "--summary", "Second task done", "--validation", "passed"],
        buildRepoRoot,
      );
      spawnSync("git", ["add", "."], { cwd: buildRepoRoot, encoding: "utf8" });
      spawnSync("git", ["commit", "-m", "TASK-002 done", "--allow-empty"], { cwd: buildRepoRoot, encoding: "utf8" });

      runCheck({
        name: "close second task updates build progress",
        args: ["close", "--run", "RUN-002"],
        cwd: buildRepoRoot,
        exitCode: 0,
        includes: ["Closed RUN-002", "Build BUILD-001 progress: 2/3"],
      });

      spawnOrFail("start third task for build close check", ["start", "TASK-003"], buildRepoRoot);
      spawnOrFail(
        "review third task for build close check",
        ["review", "--run", "RUN-003", "--outcome", "passed", "--summary", "Third task done", "--validation", "passed"],
        buildRepoRoot,
      );
      spawnSync("git", ["add", "."], { cwd: buildRepoRoot, encoding: "utf8" });
      spawnSync("git", ["commit", "-m", "TASK-003 done", "--allow-empty"], { cwd: buildRepoRoot, encoding: "utf8" });

      runCheck({
        name: "close marks build closed when all tasks done",
        args: ["close", "--run", "RUN-003"],
        cwd: buildRepoRoot,
        exitCode: 0,
        includes: ["Closed RUN-003", "Build BUILD-001 also marked closed"],
        verify: () => {
          const dbPath = join(buildRepoRoot, ".nerv/nerv.db");
          const repository = openRepository(dbPath);
          try {
            const build = repository.getBuild("BUILD-001");
            if (!build) {
              fail("close marks build closed when all tasks done", "build not found", "");
            }
            if (build.status !== "closed") {
              fail("close marks build closed when all tasks done", `build status: ${build.status}`, "");
            }
            if (!build.closed_at) {
              fail("close marks build closed when all tasks done", "build closed_at not set", "");
            }
          } finally {
            repository.close();
          }
        },
      });
    } finally {
      rmSync(buildTempRoot, { recursive: true, force: true });
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runEndToEndLifecycleChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-e2e-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace before e2e check", ["init"], repoRoot);

    spawnOrFail("create task for e2e check", ["new", "task", "Add end-to-end flow"], repoRoot);
    spawnOrFail("start run for e2e check", ["start", "TASK-001"], repoRoot);

    runCheck({
      name: "checkpoint then review flow",
      args: [
        "checkpoint",
        "--summary",
        "Implemented feature",
        "--files",
        "src/index.ts,src/run.ts",
        "--decisions",
        "Used existing schema",
        "--pending",
        "Review and close",
        "--next",
        "Request review",
      ],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Saved checkpoint 1 for RUN-001"],
      verify: () => {
        const checkpointFile = join(repoRoot, ".nerv/agent/runs/RUN-001/checkpoints/checkpoint-001.md");
        verifyPath("checkpoint then review flow", checkpointFile, "file");

        const checkpointContent = readFileSync(checkpointFile, "utf8");
        if (!checkpointContent.includes("Implemented feature")) {
          fail("checkpoint then review flow", "missing summary in checkpoint file", checkpointContent);
        }
      },
    });

    runCheck({
      name: "review after checkpoint",
      args: [
        "review",
        "--outcome",
        "passed",
        "--summary",
        "All criteria met",
        "--validation",
        "passed",
        "--evidence",
        "Build, typecheck, smoke all pass",
      ],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Saved review 1 for RUN-001"],
      verify: () => {
        const reviewFile = join(repoRoot, ".nerv/agent/runs/RUN-001/reviews/review-001.md");
        verifyPath("review after checkpoint", reviewFile, "file");

        const reviewContent = readFileSync(reviewFile, "utf8");
        if (!reviewContent.includes("All criteria met")) {
          fail("review after checkpoint", "missing summary in review file", reviewContent);
        }
        if (!reviewContent.includes("passed")) {
          fail("review after checkpoint", "missing outcome in review file", reviewContent);
        }
        if (!reviewContent.includes("## Git Status")) {
          fail("review after checkpoint", "missing Git Status section", reviewContent);
        }

        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const checkpoints = repository.listCheckpoints("RUN-001");
          if (checkpoints.length !== 1) {
            fail("review after checkpoint", `expected 1 checkpoint, got ${checkpoints.length}`, "");
          }

          const reviews = repository.listReviews("RUN-001");
          if (reviews.length !== 1) {
            fail("review after checkpoint", `expected 1 review, got ${reviews.length}`, "");
          }
        } finally {
          repository.close();
        }
      },
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runGitUnavailableChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-no-git-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace before no-git check", ["init"], repoRoot);

    rmSync(join(repoRoot, ".git"), { recursive: true, force: true });

    runCheck({
      name: "checkpoint works without git",
      args: ["checkpoint", "--run", "RUN-001", "--summary", "No git available"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["Run RUN-001 not found"],
    });

    spawnOrFail("create task for no-git check", ["new", "task", "Test without git"], repoRoot);
    spawnOrFail("start run for no-git check", ["start", "TASK-001"], repoRoot);

    runCheck({
      name: "checkpoint saves without git",
      args: ["checkpoint", "--summary", "Saved without git"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Saved checkpoint 1 for RUN-001"],
      verify: () => {
        const checkpointFile = join(repoRoot, ".nerv/agent/runs/RUN-001/checkpoints/checkpoint-001.md");
        verifyPath("checkpoint saves without git", checkpointFile, "file");
      },
    });

    runCheck({
      name: "review saves without git",
      args: [
        "review",
        "--outcome",
        "passed",
        "--summary",
        "Reviewed without git",
        "--validation",
        "passed",
      ],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Saved review 1 for RUN-001"],
      verify: () => {
        const reviewFile = join(repoRoot, ".nerv/agent/runs/RUN-001/reviews/review-001.md");
        verifyPath("review saves without git", reviewFile, "file");

        const reviewContent = readFileSync(reviewFile, "utf8");
        if (!reviewContent.includes("Git metadata unavailable.")) {
          fail("review saves without git", "missing unavailable Git status", reviewContent);
        }
        if (!reviewContent.includes("Git diff unavailable.")) {
          fail("review saves without git", "missing unavailable Git diff", reviewContent);
        }
      },
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
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
