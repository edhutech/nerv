#!/usr/bin/env node

import { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { execFileSync } from "node:child_process";

import { ensureWorkspace, getInitializedWorkspaceStatus, getWorkspaceStatus } from "./workspace.js";
import { scaffoldProductContext, persistProductMetadata, persistDecisions, appendProductEvolution, appendBuildProductEvolution, startProductSession, discoverProductInputs, createProductInputManifest, generateProductEntrypoint, createProductContextProposal, getProductContextProposal, reviewProductContextProposal, productContextProposalStatus, applyProductContextProposal, getCurrentProductSessionState, reviewCurrentProductSession, closeCurrentProductSession } from "./product.js";
import { analyzeRepo, generateDevelopmentDoc } from "./repo-context.js";
import { discoverContext } from "./context.js";
import { openRepository } from "./repository.js";
import { createTaskFromIntent, detectLargeIntent, validateTaskBuild } from "./task.js";
import { createBuildFromIntent, planBuildTasks, syncBuildMarkdown, syncTaskMarkdown } from "./build.js";
import { startRun } from "./run.js";
import { cleanWorkspace } from "./clean.js";
import { applyProposal, createIntake, createPlanningEntrypoint, createProposal, getIntake, getProposal, intakeStatus, readIntentInput, reviewProposal, verifyIntake } from "./intake.js";
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
const intakeCommand = program.command("intake").description("Capture immutable, portable Intent Intake records.");

intakeCommand.command("create")
  .argument("[intent]", "Original Intent already interpreted by the shell.")
  .option("--input <file>", "Read the original Intent literally as UTF-8 from a file.")
  .description("Capture an immutable original Intent without creating work units.")
  .action((intent: string | undefined, options: { input?: string }) => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath || !status.workspaceRoot) { program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 }); return; }
    try {
      const intake = createIntake(status.databasePath, status.workspaceRoot, readIntentInput(intent, options.input));
      console.log(`Captured ${intake.id}.`); console.log(`Markdown: ${intake.markdown_path}`); console.log(`SHA-256: ${intake.content_hash}`);
    } catch (error) { program.error(error instanceof Error ? error.message : String(error), { code: "NERV_INTAKE_CREATE_FAILED", exitCode: 1 }); }
  });

for (const [name, description, action] of [
  ["show", "Show an Intake by ID.", (record: ReturnType<typeof getIntake>) => record ? console.log(`${record.id}: ${record.status}\nMarkdown: ${record.markdown_path}\nSHA-256: ${record.content_hash}`) : null],
  ["verify", "Verify an Intake hash and its Markdown artifact.", (record: ReturnType<typeof getIntake>) => record ? console.log(verifyIntake(record).message) : null],
] as const) {
  intakeCommand.command(name).argument("<intakeId>").description(description).action((intakeId: string) => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath) { program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 }); return; }
    const record = getIntake(status.databasePath, intakeId);
    if (!record) { program.error(`Intake ${intakeId.toUpperCase()} not found.`, { code: "NERV_INTAKE_NOT_FOUND", exitCode: 1 }); return; }
    action(record);
    if (name === "verify" && !verifyIntake(record).valid) process.exitCode = 1;
  });
}

intakeCommand.command("context").argument("<intakeId>").description("Generate an agent-neutral planning entrypoint.").action((id: string) => { const status = getInitializedWorkspaceStatus(process.cwd()); const intake = status.databasePath ? getIntake(status.databasePath, id) : null; if (!intake || !status.workspaceRoot) { program.error(`Intake ${id.toUpperCase()} not found.`, { code: "NERV_INTAKE_NOT_FOUND", exitCode: 1 }); return; } console.log(`Give any external agent this file: ${createPlanningEntrypoint(status.workspaceRoot, intake)}`); });
intakeCommand.command("propose").argument("<intakeId>").requiredOption("--input <file>", "Proposal JSON file.").description("Validate and persist a versioned planning proposal without materializing work.").action((id: string, options: { input: string }) => { const status = getInitializedWorkspaceStatus(process.cwd()); if (!status.databasePath || !status.workspaceRoot) { program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 }); return; } try { const proposal = createProposal(status.databasePath, status.workspaceRoot, id, readFileSync(options.input, 'utf8')); console.log(`Recorded ${proposal.id} (version ${proposal.version}).`); console.log(`Markdown: ${proposal.markdown_path}`); } catch (error) { program.error(error instanceof Error ? error.message : String(error), { code: "NERV_PROPOSAL_INVALID", exitCode: 1 }); } });
intakeCommand.command("proposal").argument("<proposalId>").description("Show a versioned planning proposal.").action((id: string) => { const status = getInitializedWorkspaceStatus(process.cwd()); const proposal = status.databasePath ? getProposal(status.databasePath, id) : null; if (!proposal) { program.error(`Proposal ${id.toUpperCase()} not found.`, { code: "NERV_PROPOSAL_NOT_FOUND", exitCode: 1 }); return; } console.log(`${proposal.id}: ${proposal.status}\nMarkdown: ${proposal.markdown_path}\n${proposal.proposal_json}`); });
intakeCommand.command("review").argument("<proposalId>").requiredOption("--action <action>", "changes-requested, rejected, or approved.").description("Record an explicit review decision for one proposal version.").action((id: string, options: { action: "changes-requested" | "rejected" | "approved" }) => { const status = getInitializedWorkspaceStatus(process.cwd()); if (!status.databasePath || !["changes-requested", "rejected", "approved"].includes(options.action)) { program.error("A valid review action is required.", { code: "NERV_PROPOSAL_REVIEW_INVALID", exitCode: 1 }); return; } try { console.log(`Proposal ${reviewProposal(status.databasePath, id, options.action).id} ${options.action}.`); } catch (error) { program.error(error instanceof Error ? error.message : String(error), { code: "NERV_PROPOSAL_REVIEW_FAILED", exitCode: 1 }); } });
intakeCommand.command("status").argument("<intakeId>").description("Show Intake state, proposal versions, and durable review history for resumption.").action((id: string) => { const status = getInitializedWorkspaceStatus(process.cwd()); if (!status.initialized || !status.databasePath) { program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 }); return; } try { const result = intakeStatus(status.databasePath, id); console.log(`${result.intake.id}: ${result.intake.status}`); console.log(`  Approved proposal: ${result.intake.approved_proposal_id ?? "none"}`); for (const proposal of result.proposals) console.log(`  ${proposal.id}: ${proposal.status}${proposal.parent_proposal_id ? ` (follows ${proposal.parent_proposal_id})` : ""}`); for (const review of result.reviews) console.log(`  Review ${review.id}: ${review.proposal_id} ${review.decision}${review.superseding_proposal_id ? ` -> ${review.superseding_proposal_id}` : ""}`); } catch (error) { program.error(error instanceof Error ? error.message : String(error), { code: "NERV_INTAKE_NOT_FOUND", exitCode: 1 }); } });
intakeCommand.command("apply").argument("<proposalId>").option("--dry-run", "Preview exact Tasks and Builds without changes.").description("Materialize one explicitly approved proposal; never starts Runs.").action((id: string, options: { dryRun?: boolean }) => { const status = getInitializedWorkspaceStatus(process.cwd()); if (!status.databasePath || !status.workspaceRoot) return; try { const summary = applyProposal(status.databasePath, status.workspaceRoot, id, Boolean(options.dryRun)); console.log(`${options.dryRun ? "Dry run" : "Materialized"} ${id.toUpperCase()}:`); for (const line of summary) console.log(`  ${line}`); } catch (error) { program.error(error instanceof Error ? error.message : String(error), { code: "NERV_INTAKE_APPLY_FAILED", exitCode: 1 }); } });

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
  .command("propose")
  .argument("<sessionId>", "Product Session ID.")
  .requiredOption("--proposal <file>", "Product Context Proposal JSON file.")
  .description("Validate and persist a Product Context Proposal without changing canonical documents.")
  .action((sessionId: string, options: { proposal: string }) => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath || !status.workspaceRoot) { program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 }); return; }
    try { const proposal = createProductContextProposal(status.databasePath, status.workspaceRoot, sessionId, readFileSync(options.proposal, "utf8")); console.log(`Recorded ${proposal.id} (version ${proposal.version}).`); console.log(`Markdown: ${proposal.markdown_path}`); } catch (error) { program.error(error instanceof Error ? error.message : String(error), { code: "NERV_PRODUCT_PROPOSAL_INVALID", exitCode: 1 }); }
  });

productCommand
  .command("proposal")
  .argument("<proposalId>", "Product Context Proposal ID.")
  .description("Show a recoverable Product Context Proposal by ID.")
  .action((proposalId: string) => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    const proposal = status.databasePath ? getProductContextProposal(status.databasePath, proposalId) : null;
    if (!proposal) { program.error(`Product Context Proposal ${proposalId.toUpperCase()} not found.`, { code: "NERV_PRODUCT_PROPOSAL_NOT_FOUND", exitCode: 1 }); return; }
    console.log(`${proposal.id}: ${proposal.status}\nSession: ${proposal.session_id}\nMarkdown: ${proposal.markdown_path}\n${proposal.proposal_json}`);
  });

productCommand
  .command("review-proposal")
  .argument("<proposalId>", "Product Context Proposal ID.")
  .requiredOption("--action <action>", "changes-requested, rejected, or approved.")
  .description("Record an explicit human decision for a Product Context Proposal.")
  .action((proposalId: string, options: { action: "changes-requested" | "rejected" | "approved" }) => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath || !["changes-requested", "rejected", "approved"].includes(options.action)) { program.error("A valid review action is required.", { code: "NERV_PRODUCT_PROPOSAL_REVIEW_INVALID", exitCode: 1 }); return; }
    try { console.log(`Product Context Proposal ${reviewProductContextProposal(status.databasePath, proposalId, options.action).id} ${options.action}.`); } catch (error) { program.error(error instanceof Error ? error.message : String(error), { code: "NERV_PRODUCT_PROPOSAL_REVIEW_FAILED", exitCode: 1 }); }
  });

productCommand
  .command("proposal-status")
  .argument("<sessionId>", "Product Session ID.")
  .description("Show proposal decisions and recoverable Product Context apply state.")
  .action((sessionId: string) => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath) { program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 }); return; }
    try {
      const result = productContextProposalStatus(status.databasePath, sessionId);
      for (const proposal of result.proposals) console.log(`${proposal.id}: ${proposal.status}`);
      for (const review of result.reviews) console.log(`Review ${review.id}: ${review.proposal_id} ${review.decision}`);
      for (const materialization of result.materializations) console.log(`Apply ${materialization.id}: ${materialization.status}`);
    } catch (error) { program.error(error instanceof Error ? error.message : String(error), { code: "NERV_PRODUCT_PROPOSAL_STATUS_FAILED", exitCode: 1 }); }
  });

productCommand
  .command("apply")
  .argument("<proposalId>", "Approved Product Context Proposal ID.")
  .option("--confirm-decision-replacement", "Confirm human approval for replacing accepted decisions.")
  .description("Apply one explicitly approved Product Context Proposal; never starts Runs.")
  .action((proposalId: string, options: { confirmDecisionReplacement?: boolean }) => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath || !status.workspaceRoot) { program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 }); return; }
    try { for (const line of applyProductContextProposal(status.databasePath, status.workspaceRoot, proposalId, Boolean(options.confirmDecisionReplacement))) console.log(line); } catch (error) { program.error(error instanceof Error ? error.message : String(error), { code: "NERV_PRODUCT_PROPOSAL_APPLY_FAILED", exitCode: 1 }); }
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
    try {
      const state = getCurrentProductSessionState(status.databasePath, status.workspaceRoot);
      if (!state) { console.log("Product Session: None"); return; }
      console.log(`Current Product Session: ${state.session.id} (${state.session.status}, ${state.session.mode})`);
      console.log(`Resume: nerv product propose ${state.session.id} --proposal <file>`);
      console.log("Proposals:");
      if (state.proposals.length === 0) console.log("  none");
      for (const proposal of state.proposals) console.log(`  ${proposal.id}: ${proposal.status} (resume: nerv product proposal ${proposal.id})`);
      console.log("Apply state:");
      if (state.materializations.length === 0) console.log("  none");
      for (const materialization of state.materializations) console.log(`  ${materialization.proposal_id}: ${materialization.status} (resume: nerv product apply ${materialization.proposal_id})`);
      console.log("Document checks:");
      for (const check of state.checks) console.log(`  ${check.status}: ${check.name} - ${check.detail}`);
    } catch (error) { program.error(error instanceof Error ? error.message : String(error), { code: "NERV_PRODUCT_STATUS_FAILED", exitCode: 1 }); }
  });

productCommand
  .command("review")
  .description("Review the current Product Session for required documents and placeholders.")
  .action(() => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath || !status.workspaceRoot) { program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 }); return; }
    try {
      const session = reviewCurrentProductSession(status.databasePath, status.workspaceRoot);
      console.log(`Product Session ${session.session.id} review passed. Product Context is coherent and applied.`);
    } catch (error) { program.error(error instanceof Error ? error.message : String(error), { code: "NERV_PRODUCT_REVIEW_FAILED", exitCode: 1 }); }
  });

productCommand
  .command("close")
  .description("Close a reviewed Product Session.")
  .action(() => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath) { program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 }); return; }
    try {
      const session = closeCurrentProductSession(status.databasePath, status.workspaceRoot!);
      console.log(`Closed Product Session ${session.id}.`);
    } catch (error) { program.error(error instanceof Error ? error.message : String(error), { code: "NERV_PRODUCT_SESSION_CLOSE_FAILED", exitCode: 1 }); }
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
        if (inputs.length > 0) {
          repository.updateProductSession(productSession.session.id, { input_manifest: createProductInputManifest(status.repoRoot!, inputs) });
        }
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

const taskCommand = program.command("task").description("Work with generated Task Markdown.");
taskCommand.command("sync")
  .argument("<taskId>", "Task ID to reconcile with its Markdown.")
  .description("Synchronize generated Task Markdown from durable Task state.")
  .action((taskId: string) => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath || !status.workspaceRoot) {
      program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 });
      return;
    }
    const repository = openRepository(status.databasePath);
    try {
      const task = repository.getTask(taskId.toUpperCase());
      if (!task) {
        program.error(`Task ${taskId.toUpperCase()} not found.`, { code: "NERV_TASK_NOT_FOUND", exitCode: 1 });
        return;
      }
      console.log(`Synchronized ${task.id} Markdown: ${syncTaskMarkdown(status.workspaceRoot, task)}`);
    } finally { repository.close(); }
  });

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

buildCommand
  .command("review")
  .argument("<buildId>", "Build ID to review.")
  .requiredOption("--outcome <outcome>", "Review outcome: passed, failed, or blocked.")
  .requiredOption("--summary <summary>", "Review summary.")
  .option("--validation <validation>", "Validation status: passed, failed, or not_run.")
  .option("--evidence <evidence>", "Evidence summary.")
  .description("Review a completed Build as a whole before closing it.")
  .action((buildId: string, options: { outcome: string; summary: string; validation?: string; evidence?: string }) => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath || !status.workspaceRoot) {
      program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 });
      return;
    }
    const outcome = options.outcome.trim().toLowerCase();
    const summary = options.summary.trim();
    const validation = options.validation?.trim().toLowerCase() || "not_run";
    if (!["passed", "failed", "blocked"].includes(outcome)) {
      program.error("Build review outcome must be 'passed', 'failed', or 'blocked'.", { code: "NERV_BUILD_REVIEW_OUTCOME_INVALID", exitCode: 1 });
      return;
    }
    if (!summary) {
      program.error("Build review summary is required.", { code: "NERV_BUILD_REVIEW_SUMMARY_REQUIRED", exitCode: 1 });
      return;
    }
    if (!["passed", "failed", "not_run"].includes(validation)) {
      program.error("Validation status must be 'passed', 'failed', or 'not_run'.", { code: "NERV_BUILD_REVIEW_VALIDATION_INVALID", exitCode: 1 });
      return;
    }
    const evidence = options.evidence?.trim() || null;
    if (outcome === "passed" && validation !== "passed") {
      program.error("A passed Build review requires passed validation.", { code: "NERV_BUILD_REVIEW_PASSED_VALIDATION_REQUIRED", exitCode: 1 });
      return;
    }
    if (outcome === "passed" && !evidence) {
      program.error("A passed Build review requires evidence.", { code: "NERV_BUILD_REVIEW_PASSED_EVIDENCE_REQUIRED", exitCode: 1 });
      return;
    }
    const repository = openRepository(status.databasePath);
    try {
      const build = repository.getBuild(buildId.toUpperCase());
      if (!build) {
        program.error(`Build ${buildId.toUpperCase()} not found.`, { code: "NERV_BUILD_NOT_FOUND", exitCode: 1 });
        return;
      }
      if (build.status === "closed") {
        program.error(`Build ${build.id} is already closed.`, { code: "NERV_BUILD_ALREADY_CLOSED", exitCode: 1 });
        return;
      }
      const totalTasks = repository.getBuildTaskCount(build.id);
      const openTasks = repository.getBuildOpenTaskCount(build.id);
      if (totalTasks === 0 || openTasks > 0) {
        program.error(`Build ${build.id} cannot be reviewed until all of its Tasks are closed.`, { code: "NERV_BUILD_TASKS_OPEN", exitCode: 1 });
        return;
      }
      const tasks = repository.listTasksByBuild(build.id);
      const incompleteReviews = tasks.filter((task) => !repository.hasPassedTaskReview(task.id));
      if (incompleteReviews.length > 0) {
        program.error(`Build ${build.id} cannot be reviewed until every Task has a current passed review. Missing: ${incompleteReviews.map((task) => task.id).join(", ")}.`, { code: "NERV_BUILD_TASK_REVIEWS_INCOMPLETE", exitCode: 1 });
        return;
      }
      const review = repository.createBuildReview({ build_id: build.id, outcome, summary, validation, evidence });
      repository.updateBuild(build.id, { status: outcome === "passed" ? "reviewed" : "pending_review" });
      const updatedBuild = repository.getBuild(build.id)!;
      const reviewPath = writeBuildReviewMarkdown(status.workspaceRoot, review.id, updatedBuild, tasks, { outcome, summary, validation, evidence: evidence ?? undefined, git: captureGitContext(status.repoRoot ?? process.cwd()) });
      syncBuildMarkdown(status.workspaceRoot, updatedBuild, tasks, review);
      console.log(`Saved Build review ${review.id} for ${build.id}.`);
      console.log(`  Outcome: ${outcome}`);
      console.log(`  Validation: ${validation}`);
      console.log(`  Review file: ${reviewPath}`);
    } finally { repository.close(); }
  });

buildCommand
  .command("close")
  .argument("<buildId>", "Build ID to close.")
  .description("Close a Build after all Tasks and its Build review have passed.")
  .action((buildId: string) => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath || !status.workspaceRoot) {
      program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 });
      return;
    }
    const repository = openRepository(status.databasePath);
    try {
      const build = repository.getBuild(buildId.toUpperCase());
      if (!build) {
        program.error(`Build ${buildId.toUpperCase()} not found.`, { code: "NERV_BUILD_NOT_FOUND", exitCode: 1 });
        return;
      }
      if (build.status === "closed") {
        program.error(`Build ${build.id} is already closed.`, { code: "NERV_BUILD_ALREADY_CLOSED", exitCode: 1 });
        return;
      }
      const totalTasks = repository.getBuildTaskCount(build.id);
      if (totalTasks === 0 || repository.getBuildOpenTaskCount(build.id) > 0) {
        program.error(`Build ${build.id} cannot be closed until all of its Tasks are closed.`, { code: "NERV_BUILD_TASKS_OPEN", exitCode: 1 });
        return;
      }
      const incompleteReviews = repository.listTasksByBuild(build.id).filter((task) => !repository.hasPassedTaskReview(task.id));
      if (incompleteReviews.length > 0) {
        program.error(`Build ${build.id} cannot be closed until every Task has a current passed review. Missing: ${incompleteReviews.map((task) => task.id).join(", ")}.`, { code: "NERV_BUILD_TASK_REVIEWS_INCOMPLETE", exitCode: 1 });
        return;
      }
      if (!repository.hasPassedBuildReview(build.id)) {
        program.error(`Build ${build.id} cannot be closed without a passed Build review.\nRun \`nerv build review ${build.id} --outcome passed --summary "..."\` first.`, { code: "NERV_BUILD_NOT_REVIEWED", exitCode: 1 });
        return;
      }
      const now = new Date().toISOString();
      repository.updateBuild(build.id, { status: "closed", closed_at: now });
      const closedBuild = repository.getBuild(build.id)!;
      syncBuildMarkdown(status.workspaceRoot, closedBuild, repository.listTasksByBuild(build.id));
      const evolutionPath = appendBuildProductEvolution(status.workspaceRoot, { buildId: closedBuild.id, buildTitle: closedBuild.title, closedAt: now });
      console.log(`Closed ${closedBuild.id}.`);
      console.log("  Status: closed");
      if (evolutionPath) console.log(`  Product evolution updated: ${evolutionPath}`);
    } finally { repository.close(); }
  });

buildCommand
  .command("sync")
  .argument("<buildId>", "Build ID to reconcile with its Markdown.")
  .description("Synchronize generated Build Markdown from durable Build state.")
  .action((buildId: string) => {
    const status = getInitializedWorkspaceStatus(process.cwd());
    if (!status.initialized || !status.databasePath || !status.workspaceRoot) {
      program.error("Nerv is not initialized in this repo. Run `nerv init` first.", { code: "NERV_WORKSPACE_NOT_INITIALIZED", exitCode: 1 });
      return;
    }
    const repository = openRepository(status.databasePath);
    try {
      const build = repository.getBuild(buildId.toUpperCase());
      if (!build) {
        program.error(`Build ${buildId.toUpperCase()} not found.`, { code: "NERV_BUILD_NOT_FOUND", exitCode: 1 });
        return;
      }
      const path = syncBuildMarkdown(status.workspaceRoot, build, repository.listTasksByBuild(build.id));
      console.log(`Synchronized ${build.id} Markdown: ${path}`);
    } finally { repository.close(); }
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
  .requiredOption("--outcome <outcome>", "Review outcome: passed, failed, or blocked.")
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
    if (outcome !== "passed" && outcome !== "failed" && outcome !== "blocked") {
      program.error("Review outcome must be 'passed', 'failed', or 'blocked'.", {
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

      if (run.status === "closed") {
        program.error(`Run ${run.id} is already closed and cannot be reviewed.`, {
          code: "NERV_RUN_ALREADY_CLOSED",
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

      const evidence = options.evidence?.trim() || null;
      if (outcome === "passed" && validation !== "passed") {
        program.error("A passed review requires passed validation.", {
          code: "NERV_REVIEW_PASSED_VALIDATION_REQUIRED",
          exitCode: 1,
        });

        return;
      }

      if (outcome === "passed" && !evidence) {
        program.error("A passed review requires evidence.", {
          code: "NERV_REVIEW_PASSED_EVIDENCE_REQUIRED",
          exitCode: 1,
        });

        return;
      }

      const review = repository.createReview({
        run_id: run.id,
        outcome,
        summary,
        validation,
        evidence,
      });

      const reviewPath = writeReviewMarkdown(status.workspaceRoot!, review.id, run.id, {
        outcome,
        summary,
        validation,
        evidence: evidence ?? undefined,
        task,
        build,
        git: captureGitContext(status.repoRoot!),
      });

      console.log(`Saved review ${review.id} for ${run.id}.`);
      console.log(`  Outcome: ${outcome}`);
      console.log(`  Validation: ${validation}`);
      console.log(`  Review file: ${reviewPath}`);

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
    task: { id: string; title: string; scope: string | null; acceptance_criteria: string | null; validation: string | null; risks: string | null } | null;
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

## Scope

${details.task?.scope || "Not specified."}

## Risk Escalation

${details.task?.risks || "No task-specific risks recorded."}

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

function writeBuildReviewMarkdown(
  workspaceRoot: string,
  reviewId: number,
  build: { id: string; title: string; acceptance_criteria: string | null; validation: string | null },
  tasks: Array<{ id: string; title: string; status: string }>,
  details: { outcome: string; summary: string; validation: string; evidence?: string; git: { status: string; diff: string } },
): string {
  const reviewDir = join(workspaceRoot, "agent", "builds", build.id, "reviews");
  mkdirSync(reviewDir, { recursive: true });
  const reviewPath = join(reviewDir, `review-${String(reviewId).padStart(3, "0")}.md`);
  writeFileSync(reviewPath, `# Build Review ${reviewId}

## Build

${build.id}: ${build.title}

## Outcome

${details.outcome}

## Summary

${details.summary}

## Validation

${details.validation}

## Evidence

${formatOptionalText(details.evidence)}

## Acceptance Criteria

${build.acceptance_criteria || "Not specified."}

## Task Completion

${tasks.filter((task) => task.status === "closed").length}/${tasks.length} task(s) closed.

${tasks.map((task) => `- ${task.id}: ${task.title} (${task.status})`).join("\n") || "No Tasks recorded."}

## Integration Review

Confirm the completed Tasks work together, their interfaces and generated artifacts remain compatible, and the Build outcome matches its scope.

## Expected Validation

${build.validation || "Not specified."}

## Git Status

${details.git.status}

## Git Diff Summary

${details.git.diff}
`, "utf8");
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
      const closedTask = task ? repository.getTask(task.id) : null;
      if (closedTask) {
        syncTaskMarkdown(status.workspaceRoot!, closedTask);
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
            repository.updateBuild(task.build_id, { status: "pending_review", closed_at: null });
            const pendingReviewBuild = repository.getBuild(task.build_id)!;
            syncBuildMarkdown(status.workspaceRoot!, pendingReviewBuild, repository.listTasksByBuild(task.build_id));
            buildUpdateMessage = `Build ${task.build_id} has all ${totalTasks} task(s) complete and is ready for Build review.`;
          } else {
            syncBuildMarkdown(status.workspaceRoot!, build, repository.listTasksByBuild(task.build_id));
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
