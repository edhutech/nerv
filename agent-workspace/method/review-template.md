# Review Template

Use this before closing a task.

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
pnpm lint
pnpm test
pnpm build
```

Results:

- Lint:
- Test:
- Build:

## Git diff check

Summarize the diff:

- Files added:
- Files modified:
- Files deleted:

## Risks

Remaining risks:

- Risk 1
- Risk 2

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
