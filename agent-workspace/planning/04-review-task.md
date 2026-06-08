# Review a Task

Use this before committing and closing a Task.

## Your task

Review whether the selected Task is ready to commit and close.

## Read first

- `agent-workspace/method/review-template.md`
- The selected Task file
- The parent Build file
- Relevant product docs
- Current Git diff if available

## Review areas

Check:

- Acceptance criteria
- Scope
- Validation evidence
- Git diff
- Risks
- Expected evidence
- Whether related docs or generated files need updates

## Git rule

The ideal flow is:

1. Checkpoint
2. Review
3. Git commit
4. Close

Do not close the task before the user commits, unless the user explicitly decides to close without commit.

## Output

Return:

- Review result
- What passed
- What failed or is missing
- Required fixes if any
- Suggested commit message

## Approval rule

Stop after the review.

Do not commit automatically unless the user explicitly asks.
