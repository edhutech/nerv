# Close a Task

Use this after the task has passed review and the code has been committed.

## Your task

Prepare the close summary for the selected Task.

## Read first

- `agent-workspace/method/close-template.md`
- `agent-workspace/method/commit-system.md`
- The selected Task file
- The parent Build file if any
- Product evolution file
- Current Git commit if available

## Close rules

A task should normally close after:

- Acceptance criteria are met
- Validation was performed or clearly reported as unavailable
- Git commit was created
- Commit hash is known or explicitly marked as not committed
- Commit hash was recorded safely, using a separate metadata commit if needed

If the task belongs to a Build, update Build progress.

If the Build is complete, ask whether the Build should also be closed.

If the task or Build created meaningful progress, update product evolution.

## Output

Return:

- Final task summary
- Commit hash or commit status
- Files changed
- Validation evidence
- Build update
- Product evolution note
- Follow-up tasks if needed

## Approval rule

Stop after preparing the close summary.

Do not edit files unless the user asks you to apply the close update.
