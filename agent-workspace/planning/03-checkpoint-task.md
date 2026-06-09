# Checkpoint a Task

Use this when meaningful progress has been made during an Agentic Task.

## Your task

Prepare a checkpoint summary to add to the selected Task file.

## Read first

- `agent-workspace/method/checkpoint-template.md`
- The selected Task file
- The parent Build file if any
- Current Git diff if available

## Output

Return:

- Checkpoint ID
- Related Task
- Summary
- Files touched
- Decisions made
- Problems found
- Pending work
- Validation performed
- Next step
- Whether the Task should continue, go to review or be marked blocked

## Important rule

Do not close the Task during checkpoint.

Checkpoint saves memory. It does not mean the work is ready to commit.
