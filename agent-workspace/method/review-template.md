# Task Review Template

Use this before committing and closing a Task. A passed review requires passed validation and concrete evidence.

## Related Task

TASK-ID

## Acceptance criteria check

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Scope check

Confirm that the work stayed within task scope.

## Validation check

Commands or checks performed:

```bash
pnpm validate
```

Results:

- `pnpm validate`:

## Git diff check

Summarize the diff:

- Files added:
- Files modified:
- Files deleted:

## Risks

Remaining risks:

- Risk 1
- Risk 2

## Escalation check

Only complete the applicable checks:

- [ ] Migration or durable state: compatibility and recovery.
- [ ] CLI or generated artifacts: command/output compatibility.
- [ ] Security or dependency: source, permissions, and impact.
- [ ] Concurrency: state transitions and recovery.
- [ ] User-facing behavior: observable end-to-end result.

## Evidence

Evidence that the task works:

- Evidence 1
- Evidence 2

## Review result

Choose one:

- Ready to commit
- Needs changes
- Blocked

## Suggested commit message

```txt
TASK-ID concise message
```

## Commit checklist

Before committing, follow `agent-workspace/method/commit-system.md`.

- [ ] `git status --short` reviewed
- [ ] `git diff` reviewed
- [ ] `git log --oneline -5` reviewed
- [ ] Validation passed or exception documented
- [ ] Only intended files will be staged
