# TASK-ID: Task Title

## Status

Proposed

## Parent Build

BUILD-ID

## Task Goal

Describe the specific outcome this task should achieve.

## Why this task matters

Explain why this task is needed for the parent Build and the Nerv MVP.

## Context

Explain the minimum background the agent needs to understand this task.

## Scope

This task includes:

- Item 1
- Item 2
- Item 3

## Out of scope

This task does not include:

- Item 1
- Item 2
- Item 3

## Files to inspect

The agent should inspect these files before making changes:

- `path/to/file`
- `path/to/file`

## Files likely to change

The agent may need to change:

- `path/to/file`
- `path/to/file`

## Data or state affected

Describe any affected files, database schema, generated Markdown or `.nerv/` paths.

## Acceptance criteria

This task is complete when:

- Criterion 1
- Criterion 2
- Criterion 3

## Validation

Run or verify:

- Command or manual check 1
- Command or manual check 2
- Command or manual check 3

## Risks

- Risk 1
- Risk 2
- Risk 3

## Agent instructions

Work only within this task scope.

Do not expand into other tasks from the parent Build.

If you find that the task is too broad, blocked or unsafe, stop and explain the issue before making unrelated changes.

## Active work instructions

Use this Task file as the active execution record.

Do not create a manual Run file. Record progress in the checkpoint log below, then record review and close evidence in this same Task file.

## Expected evidence

At the end, provide:

- Summary of changes
- Files changed
- Validation results
- Remaining risks
- Suggested commit message

## Commit checklist

Before committing:

- Review `git status --short`.
- Review `git diff`.
- Review recent commits with `git log --oneline -5`.
- Run required validation or explain why it could not run.
- Stage only files related to this Task.
- Use the commit message format from `agent-workspace/method/commit-system.md`.
- Record the implementation commit hash in a separate metadata commit if needed.

## Checkpoint log

### Checkpoint 001

Pending.

## Review

Pending.

## Close summary

Pending.
