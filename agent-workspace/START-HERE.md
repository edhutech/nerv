# START HERE

This folder is not the Nerv product.

This folder is a temporary agent workspace to help build the real Nerv MVP inside the `nerv` repo.

The real MVP is a local-first CLI. The Markdown files in this folder only guide the planning, task breakdown, implementation, checkpoints, reviews, commits and close process while Nerv does not exist yet as software.

## Correct mental model

Nerv is not a Markdown-only workflow.

Nerv is an Agent Work Harness for developers who work with coding agents.

The final MVP should be a CLI that helps a developer:

1. Initialize Nerv in a repo.
2. Create product context.
3. Create Agentic Tasks or Agentic Builds from intent.
4. Work from one approved Task at a time.
5. Save checkpoints in the Task file.
6. Review task completion.
7. Commit stable code with Git.
8. Close the task and update product evolution.

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
5. Start one approved Task.
6. Implement.
7. Checkpoint in the Task file.
8. Review.
9. Commit using the commit system.
10. Close the Task.

## Simplified workspace rule

The manual workspace now uses Builds and Tasks only.

Use the Task file as the active execution record. Do not create new manual Run files under `agent-workspace/runs/`; those files are historical records from the earlier workflow.
