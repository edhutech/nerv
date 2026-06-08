# START HERE

This folder is not the Nerv product.

This folder is a temporary agent workspace to help build the real Nerv MVP inside the `nerv` repo.

The real MVP is a local-first CLI. The Markdown files in this folder only guide the planning, task breakdown, implementation, checkpoints, reviews and close process while Nerv does not exist yet as software.

## Correct mental model

Nerv is not a Markdown-only workflow.

Nerv is an Agent Work Harness for developers who work with coding agents.

The final MVP should be a CLI that helps a developer:

1. Initialize Nerv in a repo.
2. Create product context.
3. Create Agentic Tasks or Agentic Builds from intent.
4. Start a Run for a selected task.
5. Generate a focused `run.md` for the coding agent.
6. Save checkpoints.
7. Review task completion.
8. Commit stable code with Git.
9. Close the task and update product evolution.

## How to use this folder

Use this folder manually with a coding agent while building Nerv.

Recommended first prompt:

```txt
Read `agent-workspace/planning/00-analyze-project-and-propose-builds.md` and follow the instructions.
```

The agent should then read the product documents, inspect the current repo and propose the Agentic Builds needed to build the real Nerv MVP.

## Important rule

Do not ask the agent to build everything at once.

Use the Nerv flow before Nerv exists:

1. Propose Builds.
2. Wait for approval.
3. Create Tasks for one approved Build.
4. Wait for approval.
5. Start one Task Run.
6. Implement.
7. Checkpoint.
8. Review.
9. Commit.
10. Close.
