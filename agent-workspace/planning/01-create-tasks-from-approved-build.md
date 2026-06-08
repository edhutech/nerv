# Create Agentic Tasks from an Approved Build

You are helping break down one approved Agentic Build into clear Agentic Tasks for the real Nerv MVP.

## Your task

Read the approved Build and propose the Agentic Tasks needed to complete it.

## Read first

- `agent-workspace/product/mvp.md`
- `agent-workspace/product/stack.md`
- `agent-workspace/product/architecture.md`
- `agent-workspace/product/development.md`
- `agent-workspace/product/decisions.md`
- `agent-workspace/product/glossary.md`
- `agent-workspace/method/task-template.md`
- The selected Build file from `agent-workspace/builds/`

## Inspect the repo

Before proposing tasks, inspect the files related to the Build.

Look for current implementation, missing files and likely affected areas.

## Rules

Do not implement anything yet.

Do not create tasks outside the selected Build.

Create tasks that are scoped, contextual and verifiable.

A task should be large enough to be meaningful, but small enough for a coding agent to complete without losing focus.

Do not create Micro Actions as separate tasks.

## Task quality criteria

Each task must have:

- Clear goal
- Why it matters
- Scope
- Out of scope
- Files to inspect
- Files likely to change
- Data or state affected
- Acceptance criteria
- Validation
- Risks
- Agent instructions
- Expected evidence

## Output format

Return proposed tasks using this structure:

```md
# Proposed Tasks for BUILD-ID

## TASK-001: Task name

### Goal

...

### Why this matters

...

### Scope

- ...
- ...

### Out of scope

- ...
- ...

### Files to inspect

- ...

### Files likely to change

- ...

### Data or state affected

...

### Acceptance criteria

- ...
- ...

### Validation

- ...
- ...

### Risks

- ...
- ...

### Agent instructions

...

### Expected evidence

...
```

## Approval rule

After proposing the Tasks, stop.

Do not create files.

Do not implement anything.

Wait for the user to approve, edit or reject the proposed Tasks.
