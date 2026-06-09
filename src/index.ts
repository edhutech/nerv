#!/usr/bin/env node

import { Command } from "commander";

import { ensureWorkspace, getInitializedWorkspaceStatus, getWorkspaceStatus } from "./workspace.js";
import { scaffoldProductContext, persistProductMetadata, persistDecisions } from "./product.js";
import { analyzeRepo, generateDevelopmentDoc } from "./repo-context.js";
import { discoverContext } from "./context.js";
import { openRepository } from "./repository.js";
import { createTaskFromIntent } from "./task.js";
import { createBuildFromIntent, planBuildTasks } from "./build.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const program = new Command();

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

program
  .command("product")
  .description("Create or update local product context.")
  .action(() => {
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

    const result = scaffoldProductContext(status.workspaceRoot!);

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
  .action((intent: string, options: { force?: boolean }) => {
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

    try {
      const result = createTaskFromIntent(status.databasePath!, status.workspaceRoot!, intent, {
        force: options.force,
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
  .action(() => notImplemented("start"));

program
  .command("current")
  .description("Show the current active Run.")
  .action(() => notImplemented("current"));

program
  .command("checkpoint")
  .option("--run <runId>", "Run ID to checkpoint.")
  .description("Save checkpoint memory for a Run.")
  .action(() => notImplemented("checkpoint"));

program
  .command("review")
  .option("--run <runId>", "Run ID to review.")
  .description("Review a Run against acceptance criteria and evidence.")
  .action(() => notImplemented("review"));

program
  .command("close")
  .option("--run <runId>", "Run ID to close.")
  .description("Close reviewed work and link commit metadata when available.")
  .action(() => notImplemented("close"));

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
        console.log(`${build.id}: ${build.title}`);
        console.log(`  Status: ${build.status}`);
        console.log(`  Tasks: ${taskCount}`);
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
  .action(() => notImplemented("runs"));

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
    }
  });

program
  .command("clean")
  .description("Clean safe generated Nerv artifacts.")
  .action(() => notImplemented("clean"));

program.parse();
