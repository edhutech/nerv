# Checkpoint a Run

Use this when meaningful progress has been made during a Task Run.

## Your task

Prepare a checkpoint summary that can be pasted into the Task file.

## Read first

- `agent-workspace/method/checkpoint-template.md`
- The active Run file
- The active Task file
- The current Git diff if available

## Output

Return:

- Checkpoint ID
- Related Run
- Related Task
- Summary
- Files touched
- Decisions made
- Problems found
- Pending work
- Validation performed
- Next step
- Whether the task should continue, go to review or be marked blocked

## Important rule

Do not close the task during checkpoint.

Checkpoint saves memory. It does not mean the code is ready.
