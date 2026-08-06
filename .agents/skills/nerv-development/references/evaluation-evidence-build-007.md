# Reconciled Evaluation Record

## Status

The earlier BUILD-007 record contained unsupported pass claims. This replacement preserves no such claims.

## Not Executed

The following have no persistent, reviewable execution evidence and are recorded as not executed:

- Prompt scenarios 1, 5, 16, and 21
- Agent-host skill activation and exclusion behavior
- A clean OpenCode host session
- OpenCode model identity or model variation
- Codex, Claude Code, and Cursor discovery or execution

`pnpm validate` passed during BUILD-008, but it validates the Nerv CLI and smoke coverage. It does not validate agent-host behavior.

## Verified Repository-Local Recovery Exercise

The repository-local lifecycle recovery exercise is documented in `recovery-exercise-build-008.md`.

- Result: pass for Nerv CLI state recovery
- Persistent checkpoint artifact: `/tmp/opencode/nerv-recovery-case/.nerv/agent/runs/RUN-001/checkpoints/checkpoint-001.md`
- Independent evaluator: read-only subagent session
- Verified inputs: CLI state, `run.md`, `task.md`, and `checkpoint-001.md`

This exercise does not establish a new OpenCode host session, automatic skill discovery, a model result, or cross-provider portability.

## Compatibility Assessment

The canonical skill content is assessed as agent-neutral: it requires repository files, terminal commands, Git, the Nerv CLI, and persisted Nerv artifacts rather than proprietary conversational memory.

The evidence supports only a content-level Level 1 assessment and one repository-local recovery exercise. It does not support a claim that OpenCode, another model, Codex, Claude Code, or Cursor has executed the suite.
