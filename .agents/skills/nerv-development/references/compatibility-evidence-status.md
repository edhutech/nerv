# Compatibility Evidence Status

## Authority

This is the authoritative, versioned status record for `nerv-development` compatibility evidence. Other documents may describe procedures or historical records, but must link here rather than declare a current compatibility level or host-validation state.

## Current Status

- Version: 1
- Repository-local baseline: verified by `pnpm validate`, including deterministic recovery and clean-context fixtures.
- Content assessment: Level 1, based on review of the canonical skill's repository-only requirements.
- Host and model validation: not executed. No OpenCode, Codex, Claude Code, Cursor, or model result is recorded.
- External evidence: pending. The required host rows and contribution criteria are in `external-validation-backlog.md`.

Repository-local validation does not establish automatic skill discovery, a host session, model behavior, or cross-provider compatibility.

## Evidence Records

Use `external-evidence-template-v1.md` for every future host execution. A row becomes reviewable only when its completed record includes the required host-reported identity, execution details, artifacts, result, and failure classification.
