#!/usr/bin/env node

import { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { execFileSync } from "node:child_process";

import { ensureWorkspace, getInitializedWorkspaceStatus, getWorkspaceStatus } from "./workspace.js";
import { scaffoldProductContext, persistProductMetadata, persistDecisions, appendProductEvolution, startProductSession, discoverProductInputs, generateProductEntrypoint } from "./product.js";
import { analyzeRepo, generateDevelopmentDoc } from "./repo-context.js";
import { discoverContext } from "./context.js";
import { openRepository } from "./repository.js";
import { createTaskFromIntent, detectLargeIntent, validateTaskBuild } from "./task.js";
import { createBuildFromIntent, planBuildTasks } from "./build.js";
import { startRun } from "./run.js";
import { cleanWorkspace } from "./clean.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const program = new Command();

const PRODUCT_CONTEXT_FILES = [
  "product.md",
  "problem.md",
  "users.md",
  "prd.md",
  "roadmap.md",
  "scope.md",
  "decisions.md",
  "architecture.md",
  "evolution.md",
] as const;

function notImplemented(commandName: string): void {
  program.error(
    `nerv ${commandName} is not implemented yet. This command skeleton was added for BUILD-001/TASK-002.`,
    { code: "NERV_COMMAND_NOT_IMPLEMENTED", exitCode: 1 },
  );
}

program
  .name("nerv")
  .description("Local-first agent work harness for developers who work with coding agents.")
  .version("0.0.0");

const productCommand = program.command("product");

program
  .command("init")
  .description("Initialize Nerv in the current repo.")
  .action(() => {
    const status = getWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv init must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    const repoRoot = status.repoRoot;
    const wasInitialized = status.initialized;
    let initializedWorkspace;

    try {
      initializedWorkspace = ensureWorkspace(repoRoot);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      program.error(`nerv init failed: ${message}`, {
        code: "NERV_INIT_FAILED",
        exitCode: 1,
      });

      return;
    }

    console.log(
      wasInitialized
        ? `Nerv is already initialized in ${initializedWorkspace.repoRoot}.`
        : `Initialized Nerv in ${initializedWorkspace.repoRoot}.`,
    );
  });

productCommand
  .command("status")
  .description("Show the current Product Session and Product Context checks.")
  .action(() => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath || !status.workspaceRoot) {
      program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 });
      return;
    }
    const repository = openRepository(status.databasePath);
    try {
      const id = repository.getCurrentProductSessionId();
      const session = id ? repository.getProductSession(id) : null;
      const files = PRODUCT_CONTEXT_FILES.filter((file) => existsSync(join(status.workspaceRoot!, "product", file)));
      const placeholders = files.filter((file) => /describe the|list the minimum|record important/i.test(readFileSync(join(status.workspaceRoot!, "product", file), "utf8")));
      console.log(`Product Session: ${session ? `${session.id} (${session.status}, ${session.mode})` : "None"}`);
      console.log(`Documents: ${files.length}/9`);
      console.log(`Placeholders: ${placeholders.length === 0 ? "none" : placeholders.join(", ")}`);
      console.log("Review the Product Context diff before using Git.");
    } finally { repository.close(); }
  });

productCommand
  .command("review")
  .description("Review the current Product Session for required documents and placeholders.")
  .action(() => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath || !status.workspaceRoot) { program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 }); return; }
    const repository = openRepository(status.databasePath);
    try {
      const id = repository.getCurrentProductSessionId(); const session = id ? repository.getProductSession(id) : null;
      if (!session || session.status !== "active") { program.error("No active Product Session to review.", { code: "NERV_PRODUCT_SESSION_NOT_ACTIVE", exitCode: 1 }); return; }
      const missing = PRODUCT_CONTEXT_FILES.filter((file) => !existsSync(join(status.workspaceRoot!, "product", file)));
      const placeholders = PRODUCT_CONTEXT_FILES.filter((file) => existsSync(join(status.workspaceRoot!, "product", file)) && /describe the|list the minimum|record important/i.test(readFileSync(join(status.workspaceRoot!, "product", file), "utf8")));
      if (missing.length || placeholders.length) { program.error(`Product Context review failed. Missing: ${missing.join(", ") || "none"}. Placeholders: ${placeholders.join(", ") || "none"}.`, { code: "NERV_PRODUCT_REVIEW_FAILED", exitCode: 1 }); return; }
      repository.updateProductSession(session.id, { status: "reviewed" });
      console.log(`Product Session ${session.id} review passed. Review the diff before using Git.`);
    } finally { repository.close(); }
  });

productCommand
  .command("close")
  .description("Close a reviewed Product Session.")
  .action(() => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath) { program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 }); return; }
    const repository = openRepository(status.databasePath);
    try {
      const id = repository.getCurrentProductSessionId(); const session = id ? repository.getProductSession(id) : null;
      if (!session || session.status !== "reviewed") { program.error("Product Session must pass `nerv product review` before close.", { code: "NERV_PRODUCT_SESSION_NOT_REVIEWED", exitCode: 1 }); return; }
      repository.updateProductSession(session.id, { status: "closed", closed_at: new Date().toISOString() }); repository.setCurrentProductSessionId("");
      console.log(`Closed Product Session ${session.id}.`);
    } finally { repository.close(); }
  });

productCommand
  .description("Prepare an agent-neutral Product Context session.")
  .option("--input <paths...>", "Temporary product material: compatible files or folders inside the repository.")
  .action((options: { input?: string[] }) => {
    const status = getWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv product must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    const productDirectory = join(status.workspaceRoot!, "product");
    const hadExistingContext = PRODUCT_CONTEXT_FILES.some((file) => existsSync(join(productDirectory, file)));
    try {
      const inputs = discoverProductInputs(status.repoRoot!, options.input ?? []);
      const result = scaffoldProductContext(status.workspaceRoot!);
      const productSession = startProductSession(status.databasePath!, hadExistingContext);
      const repository = openRepository(status.databasePath!);
      try {
        repository.updateProductSession(productSession.session.id, { input_manifest: JSON.stringify(inputs) });
      } finally {
        repository.close();
      }
      const entrypoint = generateProductEntrypoint(status.workspaceRoot!, productSession.session, inputs);

    if (result.created.length > 0 || result.preserved.length > 0) {
      persistProductMetadata(status.databasePath!, result.created, result.preserved);

      const decisionsPath = join(status.workspaceRoot!, "product", "decisions.md");
      const decisionCount = persistDecisions(status.databasePath!, decisionsPath);

      if (decisionCount > 0) {
        console.log(`Persisted ${decisionCount} decision(s) from decisions.md.`);
      }
    }

    if (result.created.length === 0 && result.preserved.length === 0) {
      console.log("No product files to scaffold.");
      return;
    }

    if (result.created.length > 0) {
      console.log(`Created ${result.created.length} product file(s):`);
      for (const file of result.created) {
        console.log(`  - ${file}`);
      }
    }

    if (result.preserved.length > 0) {
      console.log(`Preserved ${result.preserved.length} existing file(s):`);
      for (const file of result.preserved) {
        console.log(`  - ${file}`);
      }
    }

      console.log(`${productSession.resumed ? "Resumed" : "Started"} Product Session ${productSession.session.id} (${productSession.session.mode}).`);
      console.log(`Give your agent this file: ${entrypoint}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      program.error(message, { code: "NERV_PRODUCT_SESSION_FAILED", exitCode: 1 });
    }
  });

program
  .command("repo")
  .description("Generate lightweight repo development context.")
  .action(() => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv repo must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    const analysis = analyzeRepo(status.repoRoot);
    const content = generateDevelopmentDoc(analysis);
    const outputPath = join(status.workspaceRoot!, "repo", "development.md");

    writeFileSync(outputPath, content, "utf8");

    const repository = openRepository(status.databasePath!);
    try {
      repository.setMetadata("repo_context_updated_at", new Date().toISOString());
    } finally {
      repository.close();
    }

    console.log(`Generated ${outputPath}`);
    console.log(`Detected ${analysis.packageFiles.length} package/config file(s).`);
    console.log(`Detected ${Object.keys(analysis.scripts).length} script(s).`);
    console.log(`Detected ${analysis.topLevelFolders.length} top-level folder(s).`);
    console.log(`Git available: ${analysis.gitAvailable ? "yes" : "no"}`);
  });

const newCommand = program
  .command("new")
  .description("Create Agentic Tasks or Agentic Builds from intent.");

newCommand
  .command("task")
  .argument("<intent>", "Task intent to turn into scoped agentic work.")
  .description("Create an Agentic Task from intent.")
  .option("--force", "Force task creation even if large intent is detected.")
  .option("--yes", "Create a Build instead when large intent is detected.")
  .option("--build <buildId>", "Associate the Task with an existing Build.")
  .action(async (intent: string, options: { force?: boolean; yes?: boolean; build?: string }) => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv new task must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    if (options.build && options.yes) {
      program.error(
        "`--build` cannot be used with `--yes`: `--yes` may create a new Build, while `--build` creates a Task in an existing Build.",
        {
          code: "NERV_TASK_BUILD_YES_CONFLICT",
          exitCode: 1,
        },
      );

      return;
    }

    try {
      const buildId = validateTaskBuild(status.databasePath!, options.build);
      if (!options.force && detectLargeIntent(intent)) {
        if (options.yes || await shouldCreateBuildFromLargeIntent()) {
          const result = createBuildFromIntent(status.databasePath!, status.workspaceRoot!, intent);

          console.log(`Created ${result.build.id}: ${result.build.title}`);
          console.log(`Intent: ${intent}`);
          console.log(`Status: ${result.build.status}`);
          console.log(`Markdown: ${result.markdownPath}`);
          console.log("");
          console.log("Next steps:");
          console.log(`  nerv build plan ${result.build.id}`);
          return;
        }

        program.error(
          `This intent appears to be large enough to warrant an Agentic Build.\n` +
            `Use \`nerv new build "${intent}"\` to create a Build first, then plan tasks.\n` +
            `If you want to create a task anyway, use --force.`,
          {
            code: "NERV_TASK_INTENT_TOO_LARGE",
            exitCode: 1,
          },
        );

        return;
      }

      const result = createTaskFromIntent(status.databasePath!, status.workspaceRoot!, intent, {
        force: options.force,
        buildId,
      });

      console.log(`Created ${result.task.id}: ${result.task.title}`);
      console.log(`Intent: ${intent}`);
      console.log(`Status: ${result.task.status}`);
      console.log(`Markdown: ${result.markdownPath}`);

      if (result.largeIntentDetected) {
        console.log("");
        console.log("Note: Large intent was detected. Consider using `nerv new build` for complex work.");
      }

      console.log("");
      console.log("Next steps:");
      console.log(`  nerv start ${result.task.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      program.error(message, {
        code: "NERV_TASK_CREATION_FAILED",
        exitCode: 1,
      });
    }
  });

async function shouldCreateBuildFromLargeIntent(): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }

  const readline = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const answer = await readline.question(
      "This looks too large for one Agentic Task. Create an Agentic Build instead? [y/N] ",
    );

    return answer.trim().toLowerCase().startsWith("y");
  } finally {
    readline.close();
  }
}

newCommand
  .command("build")
  .argument("<intent>", "Build intent to turn into a group of Agentic Tasks.")
  .description("Create an Agentic Build from intent.")
  .action((intent: string) => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv new build must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    try {
      const result = createBuildFromIntent(status.databasePath!, status.workspaceRoot!, intent);

      console.log(`Created ${result.build.id}: ${result.build.title}`);
      console.log(`Intent: ${intent}`);
      console.log(`Status: ${result.build.status}`);
      console.log(`Markdown: ${result.markdownPath}`);
      console.log("");
      console.log("Next steps:");
      console.log(`  nerv build plan ${result.build.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      program.error(message, {
        code: "NERV_BUILD_CREATION_FAILED",
        exitCode: 1,
      });
    }
  });

const buildCommand = program
  .command("build")
  .description("Work with Agentic Builds.");

buildCommand
  .command("plan")
  .argument("<buildId>", "Build ID to plan, for example BUILD-001.")
  .description("Plan Agentic Tasks for an approved Build.")
  .action((buildId: string) => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv build plan must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    try {
      const result = planBuildTasks(status.databasePath!, status.workspaceRoot!, buildId);

      if (result.skipped) {
        console.log(`Build ${buildId} already has ${result.tasks.length} planned task(s).`);
        console.log("");
        console.log("Planned tasks:");
        for (const task of result.tasks) {
          console.log(`  - ${task.id}: ${task.title}`);
        }
        return;
      }

      console.log(`Planned ${result.tasks.length} task(s) for ${buildId}: ${result.build.title}`);
      console.log("");
      console.log("Planned tasks:");
      for (const task of result.tasks) {
        console.log(`  - ${task.id}: ${task.title}`);
        console.log(`    Markdown: ${task.generated_markdown_path}`);
      }
      console.log("");
      console.log("Next steps:");
      console.log(`  nerv start ${result.tasks[0]?.id || "<task-id>"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      program.error(message, {
        code: "NERV_BUILD_PLAN_FAILED",
        exitCode: 1,
      });
    }
  });

program
  .command("start")
  .argument("<query>", "Task query or ID to start.")
  .description("Start a Run for a selected Agentic Task.")
  .action((query: string) => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv start must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    try {
      const result = startRun(status.databasePath!, status.workspaceRoot!, query);

      console.log(`Started ${result.run.id} for ${result.task.id}: ${result.task.title}`);
      console.log(`Parent Build: ${result.build ? result.build.id : "None"}`);
      console.log("");
      console.log("Generated files:");
      console.log(`  - ${result.runMarkdownPath}`);
      console.log(`  - ${result.taskMarkdownPath}`);
      console.log("");
      console.log("Next steps:");
      console.log(`  Give your coding agent this file: ${result.runMarkdownPath}`);
      console.log(`  Track active run: nerv current`);
      console.log(`  Save progress: nerv checkpoint --run ${result.run.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      program.error(message, {
        code: "NERV_START_FAILED",
        exitCode: 1,
      });
    }
  });

program
  .command("current")
  .description("Show the current active Run.")
  .action(() => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv current must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    const repository = openRepository(status.databasePath!);

    try {
      const currentRunId = repository.getCurrentRunId();

      if (!currentRunId) {
        console.log("No current run.");
        return;
      }

      const run = repository.getRun(currentRunId);

      if (!run) {
        console.log(`Current run ${currentRunId} not found.`);
        return;
      }

      const task = repository.getTask(run.task_id);

      if (!task) {
        console.log(`Current run ${run.id} references missing task ${run.task_id}.`);
        return;
      }

      const runMarkdownPath = join(status.workspaceRoot!, "agent", "runs", run.id, "run.md");

      console.log(`${run.id}: ${task.id} - ${task.title}`);
      console.log(`  Status: ${run.status}`);
      console.log(`  Run file: ${runMarkdownPath}`);
    } finally {
      repository.close();
    }
  });

program
  .command("checkpoint")
  .option("--run <runId>", "Run ID to checkpoint.")
  .requiredOption("--summary <summary>", "Checkpoint summary.")
  .option("--files <files>", "Files touched, separated by commas or semicolons.")
  .option("--decisions <decisions>", "Decisions made since the last checkpoint.")
  .option("--problems <problems>", "Problems or blockers encountered.")
  .option("--pending <pending>", "Pending work.")
  .option("--next <nextSteps>", "Suggested next steps.")
  .description("Save checkpoint memory for a Run.")
  .action((options: {
    run?: string;
    summary: string;
    files?: string;
    decisions?: string;
    problems?: string;
    pending?: string;
    next?: string;
  }) => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv checkpoint must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    const summary = options.summary.trim();

    if (!summary) {
      program.error("Checkpoint summary is required.", {
        code: "NERV_CHECKPOINT_SUMMARY_REQUIRED",
        exitCode: 1,
      });

      return;
    }

    const repository = openRepository(status.databasePath!);

    try {
      const runId = options.run?.trim().toUpperCase() || repository.getCurrentRunId();

      if (!runId) {
        program.error("No current run. Use `nerv checkpoint --run RUN-### --summary \"...\"`.", {
          code: "NERV_CURRENT_RUN_NOT_FOUND",
          exitCode: 1,
        });

        return;
      }

      const run = repository.getRun(runId);

      if (!run) {
        program.error(`Run ${runId} not found.`, {
          code: "NERV_RUN_NOT_FOUND",
          exitCode: 1,
        });

        return;
      }

      const checkpoint = repository.createCheckpoint({
        run_id: run.id,
        summary,
      });
      const checkpointPath = writeCheckpointMarkdown(status.workspaceRoot!, checkpoint.id, run.id, {
        summary,
        files: options.files,
        decisions: options.decisions,
        problems: options.problems,
        pending: options.pending,
        next: options.next,
      });

      console.log(`Saved checkpoint ${checkpoint.id} for ${run.id}.`);
      console.log(`  Summary: ${summary}`);
      console.log(`  Checkpoint file: ${checkpointPath}`);
    } finally {
      repository.close();
    }
  });

program
  .command("review")
  .option("--run <runId>", "Run ID to review.")
  .requiredOption("--outcome <outcome>", "Review outcome: passed or failed.")
  .requiredOption("--summary <summary>", "Review summary.")
  .option("--validation <validation>", "Validation status: passed, failed, or not_run.")
  .option("--evidence <evidence>", "Evidence summary.")
  .description("Review a Run against acceptance criteria and evidence.")
  .action((options: {
    run?: string;
    outcome: string;
    summary: string;
    validation?: string;
    evidence?: string;
  }) => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv review must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    const outcome = options.outcome.trim().toLowerCase();
    if (outcome !== "passed" && outcome !== "failed") {
      program.error("Review outcome must be 'passed' or 'failed'.", {
        code: "NERV_REVIEW_OUTCOME_INVALID",
        exitCode: 1,
      });

      return;
    }

    const summary = options.summary.trim();
    if (!summary) {
      program.error("Review summary is required.", {
        code: "NERV_REVIEW_SUMMARY_REQUIRED",
        exitCode: 1,
      });

      return;
    }

    const repository = openRepository(status.databasePath!);

    try {
      const runId = options.run?.trim().toUpperCase() || repository.getCurrentRunId();

      if (!runId) {
        program.error("No current run. Use `nerv review --run RUN-### --outcome ... --summary \"...\"`.", {
          code: "NERV_CURRENT_RUN_NOT_FOUND",
          exitCode: 1,
        });

        return;
      }

      const run = repository.getRun(runId);

      if (!run) {
        program.error(`Run ${runId} not found.`, {
          code: "NERV_RUN_NOT_FOUND",
          exitCode: 1,
        });

        return;
      }

      const task = repository.getTask(run.task_id);
      const build = task?.build_id ? repository.getBuild(task.build_id) : null;

      const validation = options.validation?.trim().toLowerCase() || "not_run";
      if (validation !== "passed" && validation !== "failed" && validation !== "not_run") {
        program.error("Validation status must be 'passed', 'failed', or 'not_run'.", {
          code: "NERV_REVIEW_VALIDATION_INVALID",
          exitCode: 1,
        });

        return;
      }

      const review = repository.createReview({
        run_id: run.id,
        outcome,
        summary,
      });

      const reviewPath = writeReviewMarkdown(status.workspaceRoot!, review.id, run.id, {
        outcome,
        summary,
        validation,
        evidence: options.evidence,
        task,
        build,
        git: captureGitContext(status.repoRoot!),
      });

      console.log(`Saved review ${review.id} for ${run.id}.`);
      console.log(`  Outcome: ${outcome}`);
      console.log(`  Validation: ${validation}`);
      console.log(`  Review file: ${reviewPath}`);

      if (validation === "not_run") {
        console.log("");
        console.log("Warning: Validation was not run. Review evidence is incomplete.");
      }

      if (!options.evidence?.trim()) {
        console.log("");
        console.log("Warning: No evidence provided. Review evidence is incomplete.");
      }
    } finally {
      repository.close();
    }
  });

function writeCheckpointMarkdown(
  workspaceRoot: string,
  checkpointId: number,
  runId: string,
  details: {
    summary: string;
    files?: string;
    decisions?: string;
    problems?: string;
    pending?: string;
    next?: string;
  },
): string {
  const checkpointDir = join(workspaceRoot, "agent", "runs", runId, "checkpoints");
  mkdirSync(checkpointDir, { recursive: true });

  const checkpointPath = join(checkpointDir, `checkpoint-${String(checkpointId).padStart(3, "0")}.md`);
  const content = `# Checkpoint ${checkpointId}

## Run

${runId}

## Summary

${details.summary}

## Files touched

${formatOptionalList(details.files)}

## Decisions

${formatOptionalText(details.decisions)}

## Problems

${formatOptionalText(details.problems)}

## Pending work

${formatOptionalText(details.pending)}

## Next steps

${formatOptionalText(details.next)}
`;

  writeFileSync(checkpointPath, content, "utf8");

  return checkpointPath;
}

function formatOptionalList(value: string | undefined): string {
  const items = value?.split(/[;,]/).map((item) => item.trim()).filter(Boolean) || [];

  if (items.length === 0) {
    return "- None provided.";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function formatOptionalText(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "None provided.";
}

function writeReviewMarkdown(
  workspaceRoot: string,
  reviewId: number,
  runId: string,
  details: {
    outcome: string;
    summary: string;
    validation: string;
    evidence?: string;
    task: { id: string; title: string; acceptance_criteria: string | null; validation: string | null } | null;
    build: { id: string; title: string } | null;
    git: { status: string; diff: string };
  },
): string {
  const reviewDir = join(workspaceRoot, "agent", "runs", runId, "reviews");
  mkdirSync(reviewDir, { recursive: true });

  const reviewPath = join(reviewDir, `review-${String(reviewId).padStart(3, "0")}.md`);
  const content = `# Review ${reviewId}

## Run

${runId}

## Task

${details.task ? `${details.task.id}: ${details.task.title}` : "Unknown task"}

## Build

${details.build ? `${details.build.id}: ${details.build.title}` : "None"}

## Outcome

${details.outcome}

## Summary

${details.summary}

## Validation

${details.validation}

## Evidence

${formatOptionalText(details.evidence)}

## Acceptance Criteria

${details.task?.acceptance_criteria || "Not specified."}

## Expected Validation

${details.task?.validation || "Not specified."}

## Git Status

${details.git.status}

## Git Diff Summary

${details.git.diff}
`;

  writeFileSync(reviewPath, content, "utf8");

  return reviewPath;
}

function captureGitContext(repoRoot: string): { status: string; diff: string } {
  try {
    const status = execFileSync("git", ["status", "--short"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    const diff = execFileSync("git", ["diff", "--stat"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();

    return {
      status: status || "Clean working tree.",
      diff: diff || "No unstaged diff.",
    };
  } catch {
    return {
      status: "Git metadata unavailable.",
      diff: "Git diff unavailable.",
    };
  }
}

program
  .command("close")
  .option("--run <runId>", "Run ID to close.")
  .description("Close reviewed work and link commit metadata when available.")
  .action((options: { run?: string }) => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv close must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    const repository = openRepository(status.databasePath!);

    try {
      const currentRunId = repository.getCurrentRunId();
      const runId = options.run?.trim().toUpperCase() || currentRunId;

      if (!runId) {
        program.error("No current run. Use `nerv close --run RUN-###`.", {
          code: "NERV_CURRENT_RUN_NOT_FOUND",
          exitCode: 1,
        });

        return;
      }

      const run = repository.getRun(runId);

      if (!run) {
        program.error(`Run ${runId} not found.`, {
          code: "NERV_RUN_NOT_FOUND",
          exitCode: 1,
        });

        return;
      }

      if (run.status === "closed") {
        program.error(`Run ${runId} is already closed.`, {
          code: "NERV_RUN_ALREADY_CLOSED",
          exitCode: 1,
        });

        return;
      }

      if (!repository.hasPassedReview(runId)) {
        program.error(
          `Run ${runId} cannot be closed without a passed review.\n` +
            `Run \`nerv review --run ${runId} --outcome passed --summary "..." \` first.`,
          {
            code: "NERV_RUN_NOT_REVIEWED",
            exitCode: 1,
          },
        );

        return;
      }

      const gitContext = captureGitContext(status.repoRoot!);
      let commitHash: string | null = null;
      let gitWarning: string | null = null;

      if (gitContext.status === "Git metadata unavailable.") {
        gitWarning = "Git metadata unavailable. Close recorded without commit hash.";
      } else {
        try {
          commitHash = execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: status.repoRoot!,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          }).trim();
        } catch {
          gitWarning = "Git available but no commit found. Close recorded without commit hash.";
        }
      }

      const closeRecord = repository.createCloseRecord({
        run_id: runId,
        commit_hash: commitHash,
      });

      const now = new Date().toISOString();
      repository.updateRun(runId, { status: "closed", closed_at: now });

      const task = repository.getTask(run.task_id);
      if (task && task.status !== "closed") {
        repository.updateTask(task.id, { status: "closed", closed_at: now });
      }

      if (currentRunId === runId) {
        repository.setMetadata("current_run_id", "");
      }

      let buildUpdateMessage: string | null = null;
      if (task?.build_id) {
        const build = repository.getBuild(task.build_id);
        if (build && build.status !== "closed") {
          const totalTasks = repository.getBuildTaskCount(task.build_id);
          const closedTasks = repository.getBuildClosedTaskCount(task.build_id);
          const openTasks = repository.getBuildOpenTaskCount(task.build_id);

          if (openTasks === 0 && closedTasks === totalTasks && totalTasks > 0) {
            repository.updateBuild(task.build_id, { status: "closed", closed_at: now });
            buildUpdateMessage = `Build ${task.build_id} also marked closed (all ${totalTasks} task(s) complete).`;
          } else {
            buildUpdateMessage = `Build ${task.build_id} progress: ${closedTasks}/${totalTasks} task(s) closed.`;
          }
        }
      }

      const evolutionPath = appendProductEvolution(status.workspaceRoot!, {
        taskId: task?.id ?? run.task_id,
        taskTitle: task?.title ?? "Unknown task",
        buildId: task?.build_id ?? null,
        runId: runId,
        commitHash: commitHash,
        closedAt: closeRecord.closed_at,
      });

      console.log(`Closed ${runId}.`);
      console.log(`  Status: closed`);
      console.log(`  Closed at: ${closeRecord.closed_at}`);

      if (commitHash) {
        console.log(`  Commit: ${commitHash}`);
      }

      if (gitWarning) {
        console.log("");
        console.log(`Warning: ${gitWarning}`);
      }

      if (task) {
        console.log("");
        console.log(`Task ${task.id} also marked closed.`);
      }

      if (buildUpdateMessage) {
        console.log("");
        console.log(buildUpdateMessage);
      }

      if (evolutionPath) {
        console.log("");
        console.log(`Product evolution updated: ${evolutionPath}`);
      }
    } finally {
      repository.close();
    }
  });

program
  .command("tasks")
  .argument("[query]", "Optional task query.")
  .description("List or search Agentic Tasks.")
  .action((query?: string) => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv tasks must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    const repository = openRepository(status.databasePath!);

    try {
      const normalizedQuery = query?.trim() || "";
      const tasks = normalizedQuery ? repository.searchTasks(normalizedQuery) : repository.listTasks();

      if (tasks.length === 0) {
        if (normalizedQuery) {
          console.log(`No tasks found matching "${normalizedQuery}".`);
        } else {
          console.log("No tasks found.");
        }
        return;
      }

      if (normalizedQuery) {
        console.log(`Found ${tasks.length} task(s) matching "${normalizedQuery}":`);
      } else {
        console.log(`Found ${tasks.length} task(s):`);
      }

      console.log("");

      for (const task of tasks) {
        const buildInfo = task.build_id ? ` [${task.build_id}]` : "";
        console.log(`${task.id}: ${task.title}${buildInfo}`);
        console.log(`  Status: ${task.status}`);
        if (task.closed_at) {
          console.log(`  Closed: ${task.closed_at}`);
        }
        if (task.intent) {
          console.log(`  Intent: ${task.intent}`);
        }
        console.log("");
      }
    } finally {
      repository.close();
    }
  });

program
  .command("builds")
  .argument("[query]", "Optional build query.")
  .description("List or search Agentic Builds.")
  .action((query?: string) => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv builds must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    const repository = openRepository(status.databasePath!);

    try {
      const normalizedQuery = query?.trim() || "";
      const builds = normalizedQuery ? repository.searchBuilds(normalizedQuery) : repository.listBuilds();

      if (builds.length === 0) {
        if (normalizedQuery) {
          console.log(`No builds found matching "${normalizedQuery}".`);
        } else {
          console.log("No builds found.");
        }
        return;
      }

      if (normalizedQuery) {
        console.log(`Found ${builds.length} build(s) matching "${normalizedQuery}":`);
      } else {
        console.log(`Found ${builds.length} build(s):`);
      }

      console.log("");

      for (const build of builds) {
        const taskCount = repository.getBuildTaskCount(build.id);
        const closedTaskCount = repository.getBuildClosedTaskCount(build.id);
        console.log(`${build.id}: ${build.title}`);
        console.log(`  Status: ${build.status}`);
        console.log(`  Tasks: ${closedTaskCount}/${taskCount} closed`);
        if (build.closed_at) {
          console.log(`  Closed: ${build.closed_at}`);
        }
        if (build.intent) {
          console.log(`  Intent: ${build.intent}`);
        }
        console.log("");
      }
    } finally {
      repository.close();
    }
  });

program
  .command("runs")
  .description("List Runs.")
  .action(() => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv runs must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    const repository = openRepository(status.databasePath!);

    try {
      const runs = repository.listRuns();

      if (runs.length === 0) {
        console.log("No runs found.");
        return;
      }

      console.log(`Found ${runs.length} run(s):`);
      console.log("");

      for (const run of runs) {
        const task = repository.getTask(run.task_id);
        const taskTitle = task ? task.title : "(missing task)";
        const taskLabel = task ? task.id : run.task_id;

        console.log(`${run.id}: ${taskLabel} - ${taskTitle}`);
        console.log(`  Status: ${run.status}`);
        if (run.closed_at) {
          console.log(`  Closed: ${run.closed_at}`);
        }
        console.log("");
      }
    } finally {
      repository.close();
    }
  });

program
  .command("status")
  .description("Show Nerv workspace status.")
  .action(() => {
    const status = getWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      console.log("Nerv status: not initialized");
      console.log("Reason: current directory is not inside a Git repository.");
      return;
    }

    console.log(`Nerv status: ${status.initialized ? "initialized" : "not initialized"}`);
    console.log(`Repo root: ${status.repoRoot}`);
    console.log(`Workspace path: ${status.workspaceRoot}`);

    if (status.initialized) {
      const context = discoverContext(status.workspaceRoot!, status.databasePath!);
      const repository = openRepository(status.databasePath!);

      try {
        const currentRunId = repository.getCurrentRunId();
        const currentRun = currentRunId ? repository.getRun(currentRunId) : null;
        const currentTask = currentRun ? repository.getTask(currentRun.task_id) : null;

        const allTasks = repository.listTasks();
        const closedTasks = allTasks.filter((t) => t.status === "closed").length;
        const openTasks = allTasks.length - closedTasks;

        const allBuilds = repository.listBuilds();
        const closedBuilds = allBuilds.filter((b) => b.status === "closed").length;
        const openBuilds = allBuilds.length - closedBuilds;

        const allRuns = repository.listRuns();
        const closedRuns = allRuns.filter((r) => r.status === "closed").length;
        const openRuns = allRuns.length - closedRuns;

        console.log("");
        console.log("Context availability:");
        console.log(`  Product context: ${context.productContext.available ? "available" : "not available"}`);
        if (context.productContext.updatedAt) {
          console.log(`    Updated: ${context.productContext.updatedAt}`);
        }
        console.log(`  Repo context: ${context.repoContext.available ? "available" : "not available"}`);
        if (context.repoContext.updatedAt) {
          console.log(`    Updated: ${context.repoContext.updatedAt}`);
        }

        console.log("");
        console.log("Current run:");
        if (currentRun && currentTask) {
          console.log(`  ${currentRun.id}: ${currentTask.id} - ${currentTask.title}`);
          console.log(`  Status: ${currentRun.status}`);
        } else {
          console.log("  No active run.");
        }

        console.log("");
        console.log("Lifecycle counts:");
        console.log(`  Builds: ${openBuilds} open, ${closedBuilds} closed`);
        console.log(`  Tasks: ${openTasks} open, ${closedTasks} closed`);
        console.log(`  Runs: ${openRuns} open, ${closedRuns} closed`);
      } finally {
        repository.close();
      }
    }
  });

program
  .command("clean")
  .description("Clean safe generated Nerv artifacts.")
  .action(() => {
    const status = getInitializedWorkspaceStatus(process.cwd());

    if (status.repoRoot === null) {
      program.error("nerv clean must be run inside a Git repository.", {
        code: "NERV_REPO_NOT_FOUND",
        exitCode: 1,
      });

      return;
    }

    if (!status.initialized) {
      program.error(
        "Nerv is not initialized in this repo. Run `nerv init` first.",
        {
          code: "NERV_WORKSPACE_NOT_INITIALIZED",
          exitCode: 1,
        },
      );

      return;
    }

    const result = cleanWorkspace(status.workspaceRoot!);

    if (result.cleanedPaths.length === 0) {
      console.log("Nothing to clean.");
      return;
    }

    console.log(`Cleaned ${result.cleanedPaths.length} generated artifact(s):`);
    for (const path of result.cleanedPaths) {
      console.log(`  - ${path}`);
    }
  });

await program.parseAsync();
