# Durable Recovery Exercise

## Scope

This exercise verifies repository-local Nerv state recovery. It does not claim a new OpenCode host session, model variation, or skill-discovery validation.

## Environment

- Date: 2026-08-06
- Isolated repository: `/tmp/opencode/nerv-recovery-case`
- Nerv CLI: `/home/edhu/projects/products/nerv/dist/index.js`
- Evaluator: independent read-only subagent session

`AGENTS.md` was not present in the isolated repository. The evaluator therefore recovered the Nerv lifecycle state from the CLI and generated artifacts only.

## Setup Commands

```sh
node /home/edhu/projects/products/nerv/dist/index.js init
node /home/edhu/projects/products/nerv/dist/index.js new task "Validate durable checkpoint recovery" --force
node /home/edhu/projects/products/nerv/dist/index.js start TASK-001
node /home/edhu/projects/products/nerv/dist/index.js checkpoint --summary "Recovery exercise paused after initialization" --files ".nerv/agent/runs/RUN-001/run.md,.nerv/agent/runs/RUN-001/task.md" --decisions "Use generated run artifacts as recovery entrypoint" --pending "Fresh evaluator must reconstruct active Run from persisted state" --next "Run status, inspect run.md, then inspect the checkpoint artifact"
```

The checkpoint was created before handing the repository to the independent evaluator.

## Persisted Artifacts

- Active Run: `RUN-001`
- Active Task: `TASK-001: Validate durable checkpoint recovery`
- Run entrypoint: `/tmp/opencode/nerv-recovery-case/.nerv/agent/runs/RUN-001/run.md`
- Task entrypoint: `/tmp/opencode/nerv-recovery-case/.nerv/agent/runs/RUN-001/task.md`
- Checkpoint: `/tmp/opencode/nerv-recovery-case/.nerv/agent/runs/RUN-001/checkpoints/checkpoint-001.md`

The checkpoint recorded:

- Summary: `Recovery exercise paused after initialization`
- Pending: `Fresh evaluator must reconstruct active Run from persisted state`
- Next: `Run status, inspect run.md, then inspect the checkpoint artifact`

## Independent Recovery Commands

```sh
node /home/edhu/projects/products/nerv/dist/index.js --help
node /home/edhu/projects/products/nerv/dist/index.js current
node /home/edhu/projects/products/nerv/dist/index.js status
```

The evaluator then read `run.md`, `task.md`, and `checkpoint-001.md` from the paths above.

## Result

Pass for repository-local lifecycle recovery: the CLI identified `RUN-001` as active and the generated Run artifacts plus checkpoint supplied sufficient scope, pending work, and next-step context.

## Limitations

- This is not evidence of a new OpenCode host session.
- This is not evidence of automatic skill discovery.
- This is not evidence for Codex, Claude Code, Cursor, or another model.
- The isolated exercise did not include `AGENTS.md`; a full clean-session test must separately verify authority-document discovery in a repository that provides it.
