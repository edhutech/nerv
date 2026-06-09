# Commit System

Use this for every manual Agentic Task commit.

## Goal

Create small, reviewable commits that match one Task or one explicit workflow/documentation change.

## Commit only after review

Do not commit just because code compiles.

Commit after:

- Acceptance criteria are checked.
- Scope is checked.
- Validation passed or failures are documented.
- Git diff is reviewed.
- Unrelated files are excluded.

## Required pre-commit checks

Run or inspect:

```bash
git status --short
git diff
git log --oneline -5
```

Run required validation for the Task, usually:

```bash
pnpm validate
```

If validation cannot run, record why in the Task review or close summary.

## Staging rules

Stage only files related to the Task.

Good:

```bash
git add src/index.ts scripts/smoke-cli.mjs agent-workspace/tasks/TASK-018-add-review-persistence-and-nerv-review.md
```

Avoid:

```bash
git add -A
```

`git add -A` is acceptable only after checking `git status --short` and `git diff`, and confirming every changed file belongs to the Task.

## Commit message format

For Task implementation commits:

```txt
TASK-018 Add review persistence and command

- Add review repository helpers
- Implement nerv review with outcome and evidence capture
- Persist review records and write review Markdown
- Add smoke coverage for review behavior
```

For Build-level fixes or closure:

```txt
BUILD-006 Fix review evidence gaps

- Capture Git status and diff summary in reviews
- Add smoke assertions for Git metadata output
```

For workflow documentation:

```txt
docs: simplify agent workspace workflow

- Make Task files the active work record
- Deprecate manual Run files
- Add commit practice system
```

For metadata or evolution-only updates:

```txt
Evolution: record TASK-018 commit hash 5f7d347
```

## Safe commit hash recording

Do not amend a commit only to record that same commit's hash.

Wrong flow:

1. Commit TASK-018.
2. Add TASK-018's own commit hash to files.
3. Amend TASK-018.
4. The hash changes and the recorded hash is stale.

Correct flow:

1. Commit TASK-018 implementation.
2. Read the commit hash with `git log --oneline -1`.
3. Update task or evolution files with that hash.
4. Create a separate metadata commit.

Example:

```bash
git commit -m "TASK-018 Add review persistence and command"
git log --oneline -1
git add agent-workspace/evolution/product-evolution.md agent-workspace/tasks/TASK-018-add-review-persistence-and-nerv-review.md
git commit -m "Evolution: record TASK-018 commit hash 5f7d347"
```

## Task close rule

A Task can close when:

- Implementation is complete.
- Review is recorded.
- Validation evidence is recorded.
- Implementation commit exists.
- Commit hash is recorded, using a separate metadata commit if needed.
- Parent Build progress is updated.

## Build close rule

A Build can close when:

- All child Tasks are closed.
- Build status is `Closed`.
- Product evolution has a Build close entry.
- Final validation passed or exceptions are recorded.
- Build close metadata is committed separately if it records a prior commit hash.

## Anti-patterns

- Committing before review.
- Committing unrelated files.
- Using `git add -A` without inspecting the diff.
- Amending only to record the same commit hash.
- Mixing implementation and hash-recording metadata when it creates hash instability.
- Closing a Task without validation evidence.
