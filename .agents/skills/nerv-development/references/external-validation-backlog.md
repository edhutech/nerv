# External Validation Backlog

## Purpose

Track compatibility validations that cannot be performed by repository-local smoke coverage. A row is complete only when its required environment executes the listed scenarios and commits or attaches the requested evidence. Do not infer completion from documentation, a symlink, or model behavior in another host.

## Status Authority

Current compatibility status, including the repository-local baseline and its limitations, is recorded only in `compatibility-evidence-status.md`.

## Pending Validations

| ID | Host or model | Required environment | Scenario coverage | Required evidence | Owner | Status | Contribution |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EXT-001 | OpenCode | New identifiable OpenCode session | 1, 5, 16, 21, 22 | Prompt transcript, host-reported model identity, commands, generated artifacts, and outcome per scenario | Unassigned | Pending | OpenCode host-matrix row |
| EXT-002 | Codex | Codex session with manual canonical-skill loading | 1, 5, 16, 21, 22 | Loading method, prompt transcript, commands, artifacts, and outcome per scenario | Unassigned | Pending | Codex host-matrix row |
| EXT-003 | Claude Code | Claude Code session with manual canonical-skill loading | 1, 5, 16, 21, 22 | Loading method, prompt transcript, commands, artifacts, and outcome per scenario | Unassigned | Pending | Claude Code host-matrix row |
| EXT-004 | Cursor | Cursor session with manual canonical-skill loading | 1, 5, 16, 21, 22 | Loading method, prompt transcript, commands, artifacts, and outcome per scenario | Unassigned | Pending | Cursor host-matrix row |
| EXT-005 | Two provider-distinct models | Available host sessions selected by the evaluator | Representative subset: 1, 5, 16, 21, 22 | Model identities, scenario transcripts, artifacts, and classification of every difference | Unassigned | Pending | Model-variation matrix row |

Completing an individual row contributes evidence only. It does not itself unlock or change a compatibility level.

## Compatibility-Level Prerequisites

The status record may change only after all listed prerequisites are met and the evidence is reviewed.

| Level | Combined prerequisites |
| --- | --- |
| Level 2 | At least one completed named-host row, a completed v1 evidence record with required artifacts, and a recorded evidence review. |
| Level 3 | Completed and reviewed records from at least two distinct named hosts using the same required scenario set, with a reviewed comparison of their outcomes and differences. |
| Level 4 | The Level 3 prerequisites, a completed and reviewed EXT-005 model-variation record, and a reviewed matrix that connects the required multi-host rows to the host-reported model identities and preserved artifacts. Multi-model evidence alone cannot satisfy this level. |

## Completion Procedure

1. Start with a clean repository fixture and record the host and model identity exposed by that environment.
2. Load the canonical `.agents/skills/nerv-development/SKILL.md` without copying it.
3. Run the listed prompts exactly, recording whether skill discovery was automatic or manual.
4. Preserve CLI output and generated Nerv artifacts for every passed scenario.
5. Classify any failure as skill content, discovery, model interpretation, host runtime, or Nerv CLI/lifecycle behavior.
6. Update the corresponding row with links to evidence and a dated result.
7. Apply the combined prerequisites above before changing `compatibility-evidence-status.md`; do not infer a level from one row or from multi-model evidence alone.
