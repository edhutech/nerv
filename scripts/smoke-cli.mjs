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
runRepositoryChecks();
runProductContextChecks();
runRepoContextChecks();
runContextMetadataChecks();
runWorkItemPersistenceChecks();

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
    } finally {
      repository.close();
    }
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
