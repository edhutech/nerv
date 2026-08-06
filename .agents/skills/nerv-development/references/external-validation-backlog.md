# External Validation Backlog

## Purpose

Track compatibility validations that cannot be performed by repository-local smoke coverage. A row is complete only when its required environment executes the listed scenarios and commits or attaches the requested evidence. Do not infer completion from documentation, a symlink, or model behavior in another host.

## Local Baseline

- Status: completed
- Evidence: `pnpm validate` includes deterministic recovery and clean-context fixtures.
- Scope: Nerv CLI state recovery, generated artifacts, `AGENTS.md`, Product Context, Repo Context, and active Run availability.
- Limitation: does not validate automatic skill discovery, a host session, or a model.

## Pending Validations

| ID | Host or model | Required environment | Scenario coverage | Required evidence | Owner | Status | Unlocks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EXT-001 | OpenCode | New identifiable OpenCode session | 1, 5, 16, 21, 22 | Prompt transcript, host-reported model identity, commands, generated artifacts, and outcome per scenario | Unassigned | Pending | OpenCode reference integration result |
| EXT-002 | Codex | Codex session with manual canonical-skill loading | 1, 5, 16, 21, 22 | Loading method, prompt transcript, commands, artifacts, and outcome per scenario | Unassigned | Pending | Level 2 portability evidence |
| EXT-003 | Claude Code | Claude Code session with manual canonical-skill loading | 1, 5, 16, 21, 22 | Loading method, prompt transcript, commands, artifacts, and outcome per scenario | Unassigned | Pending | Level 2 portability evidence |
| EXT-004 | Cursor | Cursor session with manual canonical-skill loading | 1, 5, 16, 21, 22 | Loading method, prompt transcript, commands, artifacts, and outcome per scenario | Unassigned | Pending | Level 2 portability evidence |
| EXT-005 | Two provider-distinct models | Available host sessions selected by the evaluator | Representative subset: 1, 5, 16, 21, 22 | Model identities, scenario transcripts, artifacts, and classification of every difference | Unassigned | Pending | Level 4 multi-agent matrix evidence |

## Completion Procedure

1. Start with a clean repository fixture and record the host and model identity exposed by that environment.
2. Load the canonical `.agents/skills/nerv-development/SKILL.md` without copying it.
3. Run the listed prompts exactly, recording whether skill discovery was automatic or manual.
4. Preserve CLI output and generated Nerv artifacts for every passed scenario.
5. Classify any failure as skill content, discovery, model interpretation, host runtime, or Nerv CLI/lifecycle behavior.
6. Update the corresponding row with links to evidence and a dated result. Do not change compatibility level until the evidence is reviewed.
