#!/usr/bin/env node

import { Command } from "commander";

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
  .action(() => notImplemented("init"));

program
  .command("product")
  .description("Create or update local product context.")
  .action(() => notImplemented("product"));

const newCommand = program
  .command("new")
  .description("Create Agentic Tasks or Agentic Builds from intent.");

newCommand
  .command("task")
  .argument("<intent>", "Task intent to turn into scoped agentic work.")
  .description("Create an Agentic Task from intent.")
  .action(() => notImplemented("new task"));

newCommand
  .command("build")
  .argument("<intent>", "Build intent to turn into a group of Agentic Tasks.")
  .description("Create an Agentic Build from intent.")
  .action(() => notImplemented("new build"));

const buildCommand = program
  .command("build")
  .description("Work with Agentic Builds.");

buildCommand
  .command("plan")
  .argument("<buildId>", "Build ID to plan, for example BUILD-001.")
  .description("Plan Agentic Tasks for an approved Build.")
  .action(() => notImplemented("build plan"));

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
  .action(() => notImplemented("tasks"));

program
  .command("builds")
  .argument("[query]", "Optional build query.")
  .description("List or search Agentic Builds.")
  .action(() => notImplemented("builds"));

program
  .command("runs")
  .description("List Runs.")
  .action(() => notImplemented("runs"));

program
  .command("status")
  .description("Show Nerv workspace status.")
  .action(() => notImplemented("status"));

program
  .command("clean")
  .description("Clean safe generated Nerv artifacts.")
  .action(() => notImplemented("clean"));

program.parse();
