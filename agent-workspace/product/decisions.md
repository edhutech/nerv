# Nerv Decisions

## DEC-001: Nerv is not a coding agent

Status: Accepted

Nerv does not replace Codex, Claude Code, OpenCode, Cursor or other coding agents.

Nerv works around them by preparing context, scope and work structure.

## DEC-002: Use Agent Work Harness as the product category

Status: Accepted

Agent Work Harness is preferred because Nerv manages more than context. It supports the work lifecycle around agents.

## DEC-003: MVP is local-first CLI

Status: Accepted

The MVP should be a CLI that runs inside the developer's repo.

## DEC-004: SQLite is the source of truth

Status: Accepted

Use `.nerv/nerv.db` with SQLite for state, memory and relationships.

## DEC-005: Markdown is agent-facing, not the source of truth for all work state

Status: Accepted

Generated Markdown is used for agent context and human readability. SQLite stores the real work state.

## DEC-006: `run.md` is the single agent entrypoint

Status: Accepted

The agent should start from `.nerv/agent/runs/RUN-001/run.md`.

## DEC-007: `nerv start` replaces `nerv use`

Status: Accepted

`nerv start <query>` should find or create the right Run and return the exact agent prompt.

## DEC-008: Build creation must be confirmed before task planning

Status: Accepted

If `nerv new task "..."` detects that intent is too large, Nerv should first ask to create an Agentic Build.

Only after the user accepts should Nerv propose tasks for that Build.

## DEC-009: Commit after review and before close

Status: Accepted

The preferred flow is:

1. Checkpoint
2. Review
3. Git commit
4. Close

Nerv should store the commit hash when closing the task if available.

## DEC-010: Individual developer experience stays free and polished

Status: Accepted

Do not make the personal developer layer paid. Monetization can come later from Team, Startup and Enterprise needs.
