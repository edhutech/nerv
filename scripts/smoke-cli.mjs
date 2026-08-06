import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

import { openRepository } from "../dist/repository.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(root, "dist/index.js");
const freshEvaluator = resolve(root, "scripts/fresh-local-evaluator.mjs");

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
    name: "new task help exposes build association",
    args: ["new", "task", "--help"],
    exitCode: 0,
    includes: ["--build <buildId>", "Associate the Task with an existing Build."],
  },
  {
    name: "build command exposes planning and review",
    args: ["build", "--help"],
    exitCode: 0,
    includes: ["plan <buildId>", "review [options] <buildId>", "close <buildId>"],
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
runProductSessionChecks();
runRepoContextChecks();
runContextMetadataChecks();
runWorkItemPersistenceChecks();
runTaskCreationChecks();
runTaskBuildAssociationChecks();
runBuildCreationChecks();
runQueryChecks();
runStartChecks();
runCurrentAndRunsChecks();
runCheckpointChecks();
runRecoveryFixtureChecks();
runCleanContextFixtureChecks();
runReviewChecks();
runCloseChecks();
runCleanChecks();
runEndToEndLifecycleChecks();
runGitUnavailableChecks();
runBuild007LifecycleChecks();

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

    spawnOrFail("create task for status check", ["new", "task", "Add status test feature"], repoRoot);
    spawnOrFail("start run for status check", ["start", "TASK-001"], repoRoot);

    runCheck({
      name: "status shows current run and lifecycle counts",
      args: ["status"],
      cwd: repoRoot,
      exitCode: 0,
      includes: [
        "Current run:",
        "RUN-001: TASK-001",
        "Status: active",
        "Lifecycle counts:",
        "Builds: 0 open, 0 closed",
        "Tasks: 1 open, 0 closed",
        "Runs: 1 open, 0 closed",
      ],
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

  for (const unexpected of check.excludes || []) {
    if (output.includes(unexpected)) {
      fail(check.name, `unexpected output: ${unexpected}`, output);
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
      "build_reviews",
      "close_records",
      "decisions",
      "status_history",
      "metadata",
      "product_sessions",
    ]) {
      if (!tableNames.has(tableName)) {
        fail(name, `missing required table: ${tableName}`, "");
      }
    }
  } finally {
    database.close();
  }
}

function runProductSessionChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-product-session-smoke-"));
  const repoRoot = join(tempRoot, "repo");
  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace for product sessions", ["init"], repoRoot);

    runCheck({
      name: "product starts a creation session and resumes it",
      args: ["product"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Started Product Session PRODUCT-001 (creation)."],
      verify: () => {
        const database = new Database(join(repoRoot, ".nerv/nerv.db"), { readonly: true });
        try {
          const session = database.prepare("SELECT id, status, mode FROM product_sessions WHERE id = ?").get("PRODUCT-001");
          const current = database.prepare("SELECT value FROM metadata WHERE key = ?").get("current_product_session_id");
          if (!session || session.status !== "active" || session.mode !== "creation" || current?.value !== "PRODUCT-001") {
            fail("product starts a creation session and resumes it", "Product Session state was not persisted", JSON.stringify({ session, current }));
          }
        } finally {
          database.close();
        }
      },
    });

    runCheck({
      name: "product resumes the active session",
      args: ["product"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Resumed Product Session PRODUCT-001 (creation)."],
    });

    const inputDirectory = join(repoRoot, "product-notes");
    mkdirSync(inputDirectory);
    writeFileSync(join(inputDirectory, "brief.md"), "A temporary brief\n", "utf8");
    runCheck({
      name: "product accepts input and generates a portable entrypoint",
      args: ["product", "--input", "product-notes"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Give your agent this file:", ".nerv/agent/product/run.md"],
      verify: () => {
        const entrypoint = join(repoRoot, ".nerv/agent/product/run.md");
        verifyPath("product accepts input and generates a portable entrypoint", entrypoint, "file");
        const content = readFileSync(entrypoint, "utf8");
        if (!content.includes("product-notes/brief.md") || !content.includes("Do not modify application code") || !content.includes("do not use a rigid questionnaire") || !content.includes("Do not overwrite it silently")) {
          fail("product accepts input and generates a portable entrypoint", "entrypoint is missing input or scope rules", content);
        }
      },
    });

    runCheck({
      name: "product rejects missing input",
      args: ["product", "--input", "missing.md"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["Input path does not exist"],
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
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

function runTaskBuildAssociationChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-task-build-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace for task-build association", ["init"], repoRoot);
    spawnOrFail("scaffold product for task-build association", ["product"], repoRoot);
    spawnOrFail("create count build for task-build association", ["new", "build", "Association count build"], repoRoot);

    runCheck({
      name: "new task creates task linked to build",
      args: ["new", "task", "--build", "BUILD-001", "Add associated task"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Created TASK-001", "Add associated task"],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const task = repository.getTask("TASK-001");
          if (!task || task.build_id !== "BUILD-001") {
            fail("new task creates task linked to build", "task is not linked to BUILD-001", "");
          }
          if (repository.getBuildTaskCount("BUILD-001") !== 1) {
            fail("new task creates task linked to build", "build count did not include TASK-001", "");
          }
        } finally {
          repository.close();
        }

        const taskContent = readFileSync(join(repoRoot, ".nerv/agent/tasks/TASK-001.md"), "utf8");
        if (!taskContent.includes("## Parent Build\n\nBUILD-001")) {
          fail("new task creates task linked to build", "task Markdown is missing the parent Build", taskContent);
        }
      },
    });

    runCheck({
      name: "new task remains standalone without build",
      args: ["new", "task", "Add standalone task"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Created TASK-002", "Add standalone task"],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const task = repository.getTask("TASK-002");
          if (!task || task.build_id !== null) {
            fail("new task remains standalone without build", "task should not have a parent Build", "");
          }
        } finally {
          repository.close();
        }

        const taskContent = readFileSync(join(repoRoot, ".nerv/agent/tasks/TASK-002.md"), "utf8");
        if (!taskContent.includes("## Parent Build\n\nNone (standalone)")) {
          fail("new task remains standalone without build", "task Markdown is missing standalone status", taskContent);
        }
      },
    });

    const associationDbPath = join(repoRoot, ".nerv/nerv.db");
    const database = new Database(associationDbPath, { readonly: true });
    const nextTaskNumberBeforeFailure = database.prepare("SELECT value FROM metadata WHERE key = ?").get("next_task_number").value;
    database.close();

    runCheck({
      name: "new task rejects missing build without partial state",
      args: ["new", "task", "--build", "BUILD-999", "Add invalid build task"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["Build BUILD-999 not found."],
      verify: () => {
        const databaseAfterFailure = new Database(associationDbPath, { readonly: true });
        try {
          const taskCount = databaseAfterFailure.prepare("SELECT COUNT(*) AS count FROM tasks").get().count;
          const nextTaskNumber = databaseAfterFailure.prepare("SELECT value FROM metadata WHERE key = ?").get("next_task_number").value;
          if (taskCount !== 2 || nextTaskNumber !== nextTaskNumberBeforeFailure) {
            fail("new task rejects missing build without partial state", "task state changed after missing Build", "");
          }
        } finally {
          databaseAfterFailure.close();
        }

        if (existsSync(join(repoRoot, ".nerv/agent/tasks/TASK-003.md"))) {
          fail("new task rejects missing build without partial state", "Task Markdown was created after missing Build", "");
        }
      },
    });

    runCheck({
      name: "new task rejects missing build before large intent detection",
      args: ["new", "task", "--build", "BUILD-999", "Build a complete authentication system with OAuth and SAML"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["Build BUILD-999 not found."],
      excludes: ["This intent appears to be large enough", "nerv new build"],
      verify: () => {
        const databaseAfterFailure = new Database(associationDbPath, { readonly: true });
        try {
          const taskCount = databaseAfterFailure.prepare("SELECT COUNT(*) AS count FROM tasks").get().count;
          const nextTaskNumber = databaseAfterFailure.prepare("SELECT value FROM metadata WHERE key = ?").get("next_task_number").value;
          if (taskCount !== 2 || nextTaskNumber !== nextTaskNumberBeforeFailure) {
            fail("new task rejects missing build before large intent detection", "task state changed after missing Build", "");
          }
        } finally {
          databaseAfterFailure.close();
        }

        if (existsSync(join(repoRoot, ".nerv/agent/tasks/TASK-003.md"))) {
          fail("new task rejects missing build before large intent detection", "Task Markdown was created after missing Build", "");
        }
      },
    });

    runCheck({
      name: "new task rejects build with yes",
      args: ["new", "task", "--build", "BUILD-001", "--yes", "Build a complete authentication system with OAuth and SAML"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["`--build` cannot be used with `--yes`"],
      verify: () => {
        const databaseAfterConflict = new Database(associationDbPath, { readonly: true });
        try {
          const buildCount = databaseAfterConflict.prepare("SELECT COUNT(*) AS count FROM builds").get().count;
          const taskCount = databaseAfterConflict.prepare("SELECT COUNT(*) AS count FROM tasks").get().count;
          const nextTaskNumber = databaseAfterConflict.prepare("SELECT value FROM metadata WHERE key = ?").get("next_task_number").value;
          if (buildCount !== 1 || taskCount !== 2 || nextTaskNumber !== nextTaskNumberBeforeFailure) {
            fail("new task rejects build with yes", "state changed after incompatible options", "");
          }
        } finally {
          databaseAfterConflict.close();
        }
      },
    });

    spawnOrFail("create close build for task-build association", ["new", "build", "Association close build"], repoRoot);

    runCheck({
      name: "new task force creates task linked to build",
      args: ["new", "task", "--build", "BUILD-002", "--force", "Build a complete authentication system with OAuth and SAML"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Created TASK-003", "Large intent was detected"],
      verify: () => {
        const repository = openRepository(associationDbPath);
        try {
          const task = repository.getTask("TASK-003");
          if (!task || task.build_id !== "BUILD-002") {
            fail("new task force creates task linked to build", "forced task is not linked to BUILD-002", "");
          }
        } finally {
          repository.close();
        }
      },
    });

    spawnOrFail("start associated task for close check", ["start", "TASK-003"], repoRoot);
    spawnOrFail(
      "review associated task for close check",
      ["review", "--run", "RUN-001", "--outcome", "passed", "--summary", "Associated task complete", "--validation", "passed"],
      repoRoot,
    );
    spawnSync("git", ["add", "."], { cwd: repoRoot, encoding: "utf8" });
    spawnSync("git", ["commit", "-m", "TASK-003 associated task", "--allow-empty"], { cwd: repoRoot, encoding: "utf8" });

    runCheck({
      name: "close linked task leaves its build ready for review",
      args: ["close", "--run", "RUN-001"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Build BUILD-002 has all 1 task(s) complete and is ready for Build review"],
      verify: () => {
        const repository = openRepository(associationDbPath);
        try {
          const build = repository.getBuild("BUILD-002");
          if (!build || build.status !== "pending_review") {
            fail("close linked task leaves its build ready for review", "linked Build was not ready for review", "");
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
      includes: ["Found 1 build(s)", "BUILD-001", "Tasks: 0/3 closed"],
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
      name: "start rejects a second active run",
      args: ["start", "TASK-001"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["RUN-001 is already active"],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const currentRunId = repository.getCurrentRunId();
          if (currentRunId !== "RUN-001") {
            fail("start rejects a second active run", `expected RUN-001, got ${currentRunId}`, "");
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

    runCheck({
      name: "start rejects a second active run for current check",
      args: ["start", "TASK-001"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["RUN-001 is already active"],
    });

    runCheck({
      name: "runs keeps one active run",
      args: ["runs"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Found 1 run(s):", "RUN-001:"],
    });

    runCheck({
      name: "current retains active run",
      args: ["current"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["RUN-001:", "TASK-001"],
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

function runRecoveryFixtureChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-recovery-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace before recovery fixture", ["init"], repoRoot);
    spawnOrFail("create task for recovery fixture", ["new", "task", "Recover checkpoint state"], repoRoot);
    spawnOrFail("start run for recovery fixture", ["start", "TASK-001"], repoRoot);

    runCheck({
      name: "recovery fixture saves checkpoint before handoff",
      args: [
        "checkpoint",
        "--summary",
        "Recover from persisted evidence",
        "--pending",
        "Read the generated Run and checkpoint artifacts",
        "--next",
        "Inspect status, run.md, task.md, and checkpoint-001.md",
      ],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Saved checkpoint 1 for RUN-001", ".nerv/agent/runs/RUN-001/checkpoints/checkpoint-001.md"],
      verify: () => {
        const runDir = join(repoRoot, ".nerv/agent/runs/RUN-001");
        const checkpointFile = join(runDir, "checkpoints/checkpoint-001.md");
        verifyPath("recovery fixture creates run.md", join(runDir, "run.md"), "file");
        verifyPath("recovery fixture creates task.md", join(runDir, "task.md"), "file");
        verifyPath("recovery fixture creates checkpoint", checkpointFile, "file");

        const checkpointContent = readFileSync(checkpointFile, "utf8");
        if (!checkpointContent.includes("Recover from persisted evidence")) {
          fail("recovery fixture creates checkpoint", "missing summary", checkpointContent);
        }
        if (!checkpointContent.includes("Read the generated Run and checkpoint artifacts")) {
          fail("recovery fixture creates checkpoint", "missing pending work", checkpointContent);
        }
      },
    });

    runCheck({
      name: "recovery fixture reports active Run from persisted state",
      args: ["status"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["RUN-001: TASK-001 - Recover checkpoint state", "Status: active"],
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runCleanContextFixtureChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-clean-context-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    writeFileSync(join(repoRoot, "AGENTS.md"), "# Fixture instructions\n\nUse persisted Nerv evidence for recovery.\n", "utf8");
    spawnOrFail("init workspace before clean context fixture", ["init"], repoRoot);
    spawnOrFail("create Product Context for clean context fixture", ["product"], repoRoot);
    spawnOrFail("create Repo Context for clean context fixture", ["repo"], repoRoot);
    spawnOrFail("create task for clean context fixture", ["new", "task", "Recover authority context"], repoRoot);
    spawnOrFail("start run for clean context fixture", ["start", "TASK-001"], repoRoot);
    spawnOrFail(
      "create checkpoint for clean context fixture",
      ["checkpoint", "--summary", "Fresh evaluator reads initial checkpoint", "--pending", "Stale pending context", "--next", "Stale next step"],
      repoRoot,
    );
    spawnOrFail(
      "create latest checkpoint for clean context fixture",
      ["checkpoint", "--summary", "Fresh evaluator reads latest checkpoint", "--pending", "Resume from the latest persisted checkpoint", "--next", "Review the newest checkpoint before continuing"],
      repoRoot,
    );
    mkdirSync(join(repoRoot, ".agents/skills/nerv-development"), { recursive: true });
    symlinkSync(
      resolve(root, ".agents/skills/nerv-development/SKILL.md"),
      join(repoRoot, ".agents/skills/nerv-development/SKILL.md"),
    );

    runCheck({
      name: "clean context fixture exposes authority and active Run artifacts",
      args: ["status"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Product context: available", "Repo context: available", "RUN-001: TASK-001 - Recover authority context"],
      verify: () => {
        verifyPath("clean context fixture creates AGENTS.md", join(repoRoot, "AGENTS.md"), "file");
        verifyPath("clean context fixture creates Product Context", join(repoRoot, ".nerv/product/product.md"), "file");
        verifyPath("clean context fixture creates Repo Context", join(repoRoot, ".nerv/repo/development.md"), "file");
        verifyPath("clean context fixture creates run.md", join(repoRoot, ".nerv/agent/runs/RUN-001/run.md"), "file");
        verifyPath("clean context fixture creates task.md", join(repoRoot, ".nerv/agent/runs/RUN-001/task.md"), "file");
        verifyPath("clean context fixture creates initial checkpoint", join(repoRoot, ".nerv/agent/runs/RUN-001/checkpoints/checkpoint-001.md"), "file");
        verifyPath("clean context fixture creates latest checkpoint", join(repoRoot, ".nerv/agent/runs/RUN-001/checkpoints/checkpoint-002.md"), "file");
        verifyPath("clean context fixture exposes canonical skill", join(repoRoot, ".agents/skills/nerv-development/SKILL.md"), "file");
      },
    });

    const evaluator = spawnSync(process.execPath, [freshEvaluator, repoRoot, cli], {
      cwd: tempRoot,
      encoding: "utf8",
    });
    const evaluatorOutput = `${evaluator.stdout}${evaluator.stderr}`;

    if (evaluator.status !== 0) {
      fail("fresh local evaluator reconstructs persisted authority", `expected exit 0, got ${evaluator.status}`, evaluatorOutput);
    }

    let recovered;
    try {
      recovered = JSON.parse(evaluator.stdout);
    } catch {
      fail("fresh local evaluator reconstructs persisted authority", "expected JSON result from evaluator", evaluatorOutput);
    }

    for (const path of [
      "AGENTS.md",
      ".agents/skills/nerv-development/SKILL.md",
      ".nerv/product/product.md",
      ".nerv/repo/development.md",
      ".nerv/agent/runs/RUN-001/run.md",
      ".nerv/agent/runs/RUN-001/task.md",
    ]) {
      if (!recovered.paths.includes(path)) {
        fail("fresh local evaluator reconstructs persisted authority", `missing recovered path: ${path}`, evaluatorOutput);
      }
    }

    if (recovered.current !== "RUN-001" || recovered.recovery.task !== "TASK-001" || !recovered.status.includes("RUN-001: TASK-001 - Recover authority context")) {
      fail("fresh local evaluator reconstructs persisted authority", "did not recover active Run from CLI", evaluatorOutput);
    }

    if (
      recovered.recovery.checkpoint !== ".nerv/agent/runs/RUN-001/checkpoints/checkpoint-002.md"
      || recovered.recovery.pending !== "Resume from the latest persisted checkpoint"
      || recovered.recovery.next !== "Review the newest checkpoint before continuing"
    ) {
      fail("fresh local evaluator reconstructs persisted authority", "did not reconstruct pending and next-step context from the newest checkpoint", evaluatorOutput);
    }

    const canonicalSkill = readFileSync(join(root, ".agents/skills/nerv-development/SKILL.md"), "utf8");
    if (!canonicalSkill.includes("node dist/index.js status") || !recovered.commands.includes(`node ${cli} status`)) {
      fail("fresh local evaluator reconstructs persisted authority", "canonical skill status example was not exercised from the source checkout", evaluatorOutput);
    }

    console.log("ok - fresh local evaluator reconstructs persisted authority");
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

    spawnOrFail(
      "add passed review for second close check",
      ["review", "--run", "RUN-002", "--outcome", "passed", "--summary", "Second run ready", "--validation", "passed"],
      repoRoot,
    );
    spawnOrFail("close second run before starting another", ["close", "--run", "RUN-002"], repoRoot);
    spawnOrFail("create third task for current preservation check", ["new", "task", "Keep current run active"], repoRoot);
    spawnOrFail("start third run for current preservation check", ["start", "TASK-003"], repoRoot);

    runCheck({
      name: "current shows the newly started run after closing the previous run",
      args: ["current"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["RUN-003:", "TASK-003"],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const currentRunId = repository.getCurrentRunId();
          if (currentRunId !== "RUN-003") {
            fail("current shows the newly started run after closing the previous run", `expected RUN-003 current run, got ${currentRunId}`, "");
          }
        } finally {
          repository.close();
        }
      },
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
        name: "close final task leaves build pending Build review",
        args: ["close", "--run", "RUN-003"],
        cwd: buildRepoRoot,
        exitCode: 0,
        includes: ["Closed RUN-003", "Build BUILD-001 has all 3 task(s) complete and is ready for Build review"],
        verify: () => {
          const dbPath = join(buildRepoRoot, ".nerv/nerv.db");
          const repository = openRepository(dbPath);
          try {
            const build = repository.getBuild("BUILD-001");
            if (!build) {
              fail("close final task leaves build pending Build review", "build not found", "");
            }
            if (build.status !== "pending_review") {
              fail("close final task leaves build pending Build review", `build status: ${build.status}`, "");
            }
          const markdown = readFileSync(join(buildRepoRoot, ".nerv/agent/builds/BUILD-001.md"), "utf8");
          if (!markdown.includes("## Status\n\nPending review") || !markdown.includes("## Task Progress\n\n3/3 task(s) closed")) {
            fail("close final task leaves build pending Build review", "Build Markdown was not synchronized", markdown);
          }
          } finally {
            repository.close();
          }
        },
      });

      runCheck({
        name: "build close requires a passed Build review",
        args: ["build", "close", "BUILD-001"],
        cwd: buildRepoRoot,
        exitCode: 1,
        includes: ["cannot be closed without a passed Build review"],
      });

      runCheck({
        name: "build review records whole Build evidence",
        args: ["build", "review", "BUILD-001", "--outcome", "passed", "--summary", "All tasks integrate correctly", "--validation", "passed", "--evidence", "Full suite passed"],
        cwd: buildRepoRoot,
        exitCode: 0,
        includes: ["Saved Build review 1 for BUILD-001", "Outcome: passed", "Validation: passed"],
        verify: () => {
          const dbPath = join(buildRepoRoot, ".nerv/nerv.db");
          const repository = openRepository(dbPath);
          try {
            const build = repository.getBuild("BUILD-001");
            const reviews = repository.listBuildReviews("BUILD-001");
            if (!build || build.status !== "reviewed" || reviews.length !== 1 || reviews[0].summary !== "All tasks integrate correctly") {
              fail("build review records whole Build evidence", "Build review state was not persisted", JSON.stringify({ build, reviews }));
            }
          } finally { repository.close(); }
          const reviewPath = join(buildRepoRoot, ".nerv/agent/builds/BUILD-001/reviews/review-001.md");
          verifyPath("build review records whole Build evidence", reviewPath, "file");
          const review = readFileSync(reviewPath, "utf8");
          if (!review.includes("All tasks integrate correctly") || !review.includes("Full suite passed")) {
            fail("build review records whole Build evidence", "Build review Markdown is incomplete", review);
          }
        },
      });

      runCheck({
        name: "build close succeeds after Build review",
        args: ["build", "close", "BUILD-001"],
        cwd: buildRepoRoot,
        exitCode: 0,
        includes: ["Closed BUILD-001", "Status: closed", "Product evolution updated:"],
        verify: () => {
          const dbPath = join(buildRepoRoot, ".nerv/nerv.db");
          const repository = openRepository(dbPath);
          try {
            const build = repository.getBuild("BUILD-001");
            if (!build || build.status !== "closed" || !build.closed_at) fail("build close succeeds after Build review", "Build was not closed", JSON.stringify(build));
          } finally { repository.close(); }
          const markdown = readFileSync(join(buildRepoRoot, ".nerv/agent/builds/BUILD-001.md"), "utf8");
          if (!markdown.includes("## Status\n\nClosed") || !markdown.includes("## Close summary\n\nClosed at")) fail("build close succeeds after Build review", "Build Markdown was not synchronized", markdown);
        },
      });

      const repeatReviewTempRoot = mkdtempSync(join(tmpdir(), "nerv-build-review-repeat-smoke-"));
      const repeatReviewRepoRoot = join(repeatReviewTempRoot, "repo");
      mkdirSync(repeatReviewRepoRoot, { recursive: true });

      try {
        spawnSync("git", ["init", repeatReviewRepoRoot], { encoding: "utf8" });
        spawnOrFail("init workspace for repeat build review check", ["init"], repeatReviewRepoRoot);
        spawnOrFail("scaffold product for repeat build review check", ["product"], repeatReviewRepoRoot);

        spawnOrFail("create build for repeat build review check", ["new", "build", "Repeat build review test"], repeatReviewRepoRoot);
        spawnOrFail("plan build for repeat build review check", ["build", "plan", "BUILD-001"], repeatReviewRepoRoot);

        for (const taskId of ["TASK-001", "TASK-002", "TASK-003"]) {
          spawnOrFail(`start ${taskId} for repeat build review check`, ["start", taskId], repeatReviewRepoRoot);
          spawnOrFail(`review ${taskId} for repeat build review check`, ["review", "--outcome", "passed", "--summary", `${taskId} done`, "--validation", "passed"], repeatReviewRepoRoot);
          spawnSync("git", ["add", "."], { cwd: repeatReviewRepoRoot, encoding: "utf8" });
          spawnSync("git", ["commit", "-m", `${taskId} done`, "--allow-empty"], { cwd: repeatReviewRepoRoot, encoding: "utf8" });
          spawnOrFail(`close ${taskId} for repeat build review check`, ["close"], repeatReviewRepoRoot);
        }

        runCheck({
          name: "later failed Build review blocks close after earlier pass",
          args: ["build", "close", "BUILD-001"],
          cwd: repeatReviewRepoRoot,
          exitCode: 1,
          includes: ["cannot be closed without a passed Build review"],
          setup: () => {
            spawnOrFail("first Build review passes", ["build", "review", "BUILD-001", "--outcome", "passed", "--summary", "Initial pass", "--validation", "passed"], repeatReviewRepoRoot);
            spawnOrFail("second Build review fails", ["build", "review", "BUILD-001", "--outcome", "failed", "--summary", "Later failure", "--validation", "failed"], repeatReviewRepoRoot);
          },
          verify: () => {
            const dbPath = join(repeatReviewRepoRoot, ".nerv/nerv.db");
            const repository = openRepository(dbPath);
            try {
              const reviews = repository.listBuildReviews("BUILD-001");
              if (reviews.length !== 2 || reviews[0].outcome !== "passed" || reviews[1].outcome !== "failed") {
                fail("later failed Build review blocks close after earlier pass", "expected two reviews with passed then failed", JSON.stringify(reviews));
              }
              const build = repository.getBuild("BUILD-001");
              if (!build || build.status === "closed") {
                fail("later failed Build review blocks close after earlier pass", "Build should not be closed", JSON.stringify(build));
              }
            } finally { repository.close(); }
          },
        });

        runCheck({
          name: "later passed Build review permits close after earlier failure",
          args: ["build", "close", "BUILD-001"],
          cwd: repeatReviewRepoRoot,
          exitCode: 0,
          includes: ["Closed BUILD-001", "Status: closed"],
          setup: () => {
            spawnOrFail("third Build review passes", ["build", "review", "BUILD-001", "--outcome", "passed", "--summary", "Final pass", "--validation", "passed"], repeatReviewRepoRoot);
          },
          verify: () => {
            const dbPath = join(repeatReviewRepoRoot, ".nerv/nerv.db");
            const repository = openRepository(dbPath);
            try {
              const reviews = repository.listBuildReviews("BUILD-001");
              if (reviews.length !== 3 || reviews[2].outcome !== "passed") {
                fail("later passed Build review permits close after earlier failure", "expected three reviews with final passed", JSON.stringify(reviews));
              }
              const build = repository.getBuild("BUILD-001");
              if (!build || build.status !== "closed" || !build.closed_at) {
                fail("later passed Build review permits close after earlier failure", "Build should be closed", JSON.stringify(build));
              }
            } finally { repository.close(); }
          },
        });
      } finally {
        rmSync(repeatReviewTempRoot, { recursive: true, force: true });
      }
    } finally {
      rmSync(buildTempRoot, { recursive: true, force: true });
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runCleanChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-clean-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace before clean check", ["init"], repoRoot);

    runCheck({
      name: "clean fails when not in git repo",
      args: ["clean"],
      cwd: tempRoot,
      exitCode: 1,
      includes: ["nerv clean must be run inside a Git repository."],
    });

    runCheck({
      name: "clean fails when workspace not initialized",
      args: ["clean"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["Nerv is not initialized in this repo. Run `nerv init` first."],
      setup: () => {
        rmSync(join(repoRoot, ".nerv"), { recursive: true, force: true });
      },
    });

    spawnOrFail("reinit workspace for clean check", ["init"], repoRoot);
    spawnOrFail("scaffold product for clean check", ["product"], repoRoot);

    runCheck({
      name: "clean removes generated product entrypoint",
      args: ["clean"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Cleaned 1 generated artifact(s):", "agent/product"],
    });

    spawnOrFail("create task for clean check", ["new", "task", "Add clean test feature"], repoRoot);
    spawnOrFail("start run for clean check", ["start", "TASK-001"], repoRoot);

    const runDir = join(repoRoot, ".nerv/agent/runs/RUN-001");
    if (!existsSync(runDir)) {
      fail("start run for clean check", "run directory not created", "");
    }

    runCheck({
      name: "clean removes generated run artifacts",
      args: ["clean"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Cleaned 2 generated artifact(s):", "RUN-001", "TASK-001.md"],
      verify: () => {
        if (existsSync(runDir)) {
          fail("clean removes generated run artifacts", "run directory still exists", "");
        }

        const dbPath = join(repoRoot, ".nerv/nerv.db");
        if (!existsSync(dbPath)) {
          fail("clean removes generated run artifacts", "database was deleted", "");
        }

        const productDir = join(repoRoot, ".nerv/product");
        if (!existsSync(productDir)) {
          fail("clean removes generated run artifacts", "product directory was deleted", "");
        }

        const repoDir = join(repoRoot, ".nerv/repo");
        if (!existsSync(repoDir)) {
          fail("clean removes generated run artifacts", "repo directory was deleted", "");
        }
      },
    });

    runCheck({
      name: "clean is idempotent",
      args: ["clean"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Nothing to clean."],
    });

    const futureGeneratedDir = join(repoRoot, ".nerv/agent/future-cache");
    const futureGeneratedFile = join(repoRoot, ".nerv/agent/future-artifact.md");
    mkdirSync(futureGeneratedDir, { recursive: true });
    writeFileSync(join(futureGeneratedDir, "generated.txt"), "generated\n", "utf8");
    writeFileSync(futureGeneratedFile, "generated\n", "utf8");

    runCheck({
      name: "clean removes future generated agent artifacts",
      args: ["clean"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Cleaned 2 generated artifact(s):", "future-cache", "future-artifact.md"],
      verify: () => {
        if (existsSync(futureGeneratedDir)) {
          fail("clean removes future generated agent artifacts", "future generated directory still exists", "");
        }
        if (existsSync(futureGeneratedFile)) {
          fail("clean removes future generated agent artifacts", "future generated file still exists", "");
        }
      },
    });

    spawnOrFail("create build for clean check", ["new", "build", "Clean generated build artifacts"], repoRoot);
    spawnOrFail("plan build for clean check", ["build", "plan", "BUILD-001"], repoRoot);

    const generatedBuildFile = join(repoRoot, ".nerv/agent/builds/BUILD-001.md");
    const generatedTaskFile = join(repoRoot, ".nerv/agent/tasks/TASK-002.md");
    verifyPath("plan build for clean check", generatedBuildFile, "file");
    verifyPath("plan build for clean check", generatedTaskFile, "file");

    runCheck({
      name: "clean removes generated build and task artifacts",
      args: ["clean"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Cleaned 4 generated artifact(s):", "BUILD-001.md", "TASK-002.md"],
      verify: () => {
        if (existsSync(generatedBuildFile)) {
          fail("clean removes generated build and task artifacts", "generated build file still exists", "");
        }
        if (existsSync(generatedTaskFile)) {
          fail("clean removes generated build and task artifacts", "generated task file still exists", "");
        }
      },
    });

    runCheck({
      name: "start rejects another run while clean check remains active",
      args: ["start", "TASK-001"],
      cwd: repoRoot,
      exitCode: 1,
      includes: ["RUN-001 is already active"],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const runs = repository.listRuns();
          if (runs.length !== 1) {
            fail("start rejects another run while clean check remains active", `expected 1 run in database, got ${runs.length}`, "");
          }

          const tasks = repository.listTasks();
          if (tasks.length !== 4) {
            fail("clean preserves database and product context", `expected 4 tasks in database, got ${tasks.length}`, "");
          }
        } finally {
          repository.close();
        }

        const productDir = join(repoRoot, ".nerv/product");
        const productFiles = readdirSync(productDir);
        if (productFiles.length === 0) {
          fail("clean preserves database and product context", "product directory is empty", "");
        }
      },
    });
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

    runCheck({
      name: "close saves without git",
      args: ["close"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Closed RUN-001", "Warning: Git metadata unavailable. Close recorded without commit hash."],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const run = repository.getRun("RUN-001");
          if (!run || run.status !== "closed") {
            fail("close saves without git", "run was not closed", "");
          }

          const closeRecord = repository.getCloseRecord("RUN-001");
          if (!closeRecord) {
            fail("close saves without git", "close record not found", "");
          }
          if (closeRecord.commit_hash !== null) {
            fail("close saves without git", `expected null commit hash, got ${closeRecord.commit_hash}`, "");
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

function runBuild007LifecycleChecks() {
  const tempRoot = mkdtempSync(join(tmpdir(), "nerv-build007-smoke-"));
  const repoRoot = join(tempRoot, "repo");

  mkdirSync(repoRoot, { recursive: true });

  try {
    spawnSync("git", ["init", repoRoot], { encoding: "utf8" });
    spawnOrFail("init workspace for BUILD-007 check", ["init"], repoRoot);
    spawnOrFail("scaffold product for BUILD-007 check", ["product"], repoRoot);

    spawnOrFail("create task for BUILD-007 check", ["new", "task", "Add BUILD-007 feature"], repoRoot);
    spawnOrFail("start run for BUILD-007 check", ["start", "TASK-001"], repoRoot);

    runCheck({
      name: "BUILD-007 full lifecycle",
      args: ["status"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Current run:", "RUN-001: TASK-001", "Status: active", "Lifecycle counts:", "Tasks: 1 open, 0 closed", "Runs: 1 open, 0 closed"],
    });

    spawnOrFail(
      "checkpoint for BUILD-007 check",
      ["checkpoint", "--summary", "Implemented feature", "--files", "src/index.ts"],
      repoRoot,
    );

    spawnOrFail(
      "review for BUILD-007 check",
      ["review", "--outcome", "passed", "--summary", "All tests pass", "--validation", "passed", "--evidence", "Smoke tests pass"],
      repoRoot,
    );

    spawnSync("git", ["add", "."], { cwd: repoRoot, encoding: "utf8" });
    spawnSync("git", ["commit", "-m", "TASK-001: Add BUILD-007 feature", "--allow-empty"], { cwd: repoRoot, encoding: "utf8" });

    runCheck({
      name: "close with evolution and build progress",
      args: ["close"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Closed RUN-001", "Status: closed", "Commit:", "Task TASK-001 also marked closed", "Product evolution updated:"],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        const repository = openRepository(dbPath);
        try {
          const run = repository.getRun("RUN-001");
          if (!run || run.status !== "closed") {
            fail("close with evolution and build progress", "run not closed", "");
          }

          const task = repository.getTask("TASK-001");
          if (!task || task.status !== "closed") {
            fail("close with evolution and build progress", "task not closed", "");
          }

          const closeRecord = repository.getCloseRecord("RUN-001");
          if (!closeRecord || !closeRecord.commit_hash) {
            fail("close with evolution and build progress", "commit hash not captured", "");
          }
        } finally {
          repository.close();
        }

        const evolutionPath = join(repoRoot, ".nerv/product/evolution.md");
        const evolutionContent = readFileSync(evolutionPath, "utf8");
        if (!evolutionContent.includes("TASK-001")) {
          fail("close with evolution and build progress", "evolution not updated", evolutionContent);
        }
      },
    });

    runCheck({
      name: "status after close shows closed state",
      args: ["status"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Current run:", "No active run", "Lifecycle counts:", "Tasks: 0 open, 1 closed", "Runs: 0 open, 1 closed"],
    });

    runCheck({
      name: "tasks list shows closed task",
      args: ["tasks"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["TASK-001:", "Status: closed", "Closed:"],
    });

    runCheck({
      name: "runs list shows closed run",
      args: ["runs"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["RUN-001:", "Status: closed", "Closed:"],
    });

    runCheck({
      name: "clean after close is safe",
      args: ["clean"],
      cwd: repoRoot,
      exitCode: 0,
      includes: ["Cleaned 3 generated artifact(s):", "agent/product", "RUN-001", "TASK-001.md"],
      verify: () => {
        const dbPath = join(repoRoot, ".nerv/nerv.db");
        if (!existsSync(dbPath)) {
          fail("clean after close is safe", "database was deleted", "");
        }

        const repository = openRepository(dbPath);
        try {
          const run = repository.getRun("RUN-001");
          if (!run || run.status !== "closed") {
            fail("clean after close is safe", "run state lost after clean", "");
          }

          const task = repository.getTask("TASK-001");
          if (!task || task.status !== "closed") {
            fail("clean after close is safe", "task state lost after clean", "");
          }
        } finally {
          repository.close();
        }

        const evolutionPath = join(repoRoot, ".nerv/product/evolution.md");
        if (!existsSync(evolutionPath)) {
          fail("clean after close is safe", "evolution file was deleted", "");
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
