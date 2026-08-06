# Manual Agent Workflow for Building Nerv

This workflow exists only until Nerv can run as a real CLI.

## Goal

Use agent-workspace to build the real Nerv MVP without losing the decisions already made.

## Flow

### 1. Propose Builds

Ask the agent to read:

```txt
agent-workspace/planning/00-analyze-project-and-propose-builds.md
```

The agent should inspect the product docs and current repo, then propose Agentic Builds.

It must not create tasks yet.

### 2. Approve one Build

Review the proposed Builds.

Create a Build file in:

```txt
agent-workspace/builds/
```

Use the build template.

### 3. Create Tasks for the approved Build

Ask the agent to read:

```txt
agent-workspace/planning/01-create-tasks-from-approved-build.md
```

The agent should propose tasks only for that Build.

It must not implement anything yet.

### 4. Approve one Task

Create a Task file in:

```txt
agent-workspace/tasks/
```

Use the task template.

### 5. Start the approved Task

Work directly from the selected Task file in:

```txt
agent-workspace/tasks/
```

The Task file is the active execution record. Do not create a manual Run file.

### 6. Checkpoint

After meaningful progress, update the Task checkpoint log with:

- What changed
- Files touched
- Decisions
- Problems
- Pending work
- Next step

### 7. Review

#### Task review

Before committing and closing each Task, verify its acceptance criteria, scope, relevant diff, validation, and concise evidence. A Task passes only when validation passed and evidence is recorded; otherwise record `failed` or `blocked` and do not close it.

#### Build review

After every Task is closed and before closing the Build, verify the Build acceptance criteria against the integrated result. Confirm final validation, cross-Task compatibility, generated artifacts, documentation, and residual risks. Do not repeat every Task diff unless integration evidence identifies a problem.

Increase review depth only when the Task or Build affects migrations or durable data, CLI contracts, security or dependencies, concurrency, or user-facing interfaces.

### 8. Commit

After review and before close:

Follow `agent-workspace/method/commit-system.md`.

At minimum, inspect status, diff and recent commits before staging only the intended files.

### 9. Close

Update the Task close summary.

If it belongs to a Build, update the Build status.

If the Build is complete, update product evolution.

## Deprecated Run layer

Older files under `agent-workspace/runs/` are historical records only. The manual workflow no longer creates or updates Run files.
