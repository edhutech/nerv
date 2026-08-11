---
name: nerv-development
description: "Develop, review, or validate the Nerv repository using the vNext Work Item protocol. Use for this repository's CLI, SQLite, context, Git-safe close, and validation work. Do not use for consumer repositories that merely use Nerv or for unrelated Node.js work."
---

# Nerv Development

Use this skill to develop Nerv itself. It defines the `nerv-dev` agent workflow protocol over the agent-agnostic `nerv` runtime primitives.

## Authority

Read only the authority relevant to the request, in this order:

1. The developer's current decision.
2. `.nerv-context/product/` for canonical product direction.
3. `NERV_VNEXT_DESIGN.md`, `AGENTS.md`, and other applicable authoritative repository guidance.
4. Generic external guidance.

SQLite is the durable operational source of truth. `.nerv/repo/` contains generated local observations; do not edit `.nerv/` state or `dist/` directly.

## Protocol

Use the same public workflow:

```text
nerv-dev plan "<intent>"
nerv-dev approve
nerv-dev review WORK-###
nerv-dev close WORK-###
```

`nerv-dev status` is read-only and `nerv-dev checkpoint` is exceptional. Execution is a phase after approval, not another normal public operation. `nerv-dev` is a protocol, not a required executable, second database, second engine, host-specific orchestrator, or agent controller. Interpret it through deterministic `nerv` primitives and repository evidence.

End every governed interaction with one concise **Recommended next operation**. Mirror the public workflow: recommend `nerv-dev approve` after planning or remediation proposals, `nerv-dev review WORK-###` after full validation, and `nerv-dev close WORK-###` after optional verification. During Execution, recommend phase-level continuation such as `Continue with Task 2.`; do not present task primitives as the normal journey. After Close, state that no further Nerv lifecycle operation is required.

## Planning And Approval

Before planning, inspect relevant Product Context. If it is missing or scaffold-only, establish the minimum confirmed product understanding with the developer before materializing work; record only confirmed facts. Inspect relevant implementation, `NERV_VNEXT_DESIGN.md`, `AGENTS.md`, and focused local or shared Knowledge.

Surface a concise non-blocking warning only when the intended direction materially conflicts with Product Context or relevant authority and has no safe interpretation. The developer may proceed, adjust the implementation, or update Product Context; do not rewrite canonical context without confirmation.

Relevant Skills, MCPs, plugins, and specialized tools may provide guidance, assistance, or evidence. They remain subordinate to Product Context, the Plan Preview, approval, Work boundaries, Work Review, and Git-safe Close.

Before approval, show a concise Plan Preview with a proposed Work Item, goal, scope, expected touchpoints, meaningful out-of-scope boundaries, acceptance criteria, full validation, and execution-ready Tasks. Each Task needs a bounded objective, intended approach based on repository evidence, touchpoints when useful, task acceptance criteria, and targeted validation. Do not assign a durable Work reference or persist speculative plans.

`nerv-dev approve` materializes approved Work and Tasks, activates the Work Item, and persists compact execution handoff context. Unless the developer explicitly asks to stop after approval, continue through approved Execution in the same agent interaction: complete each Task, record validation and attribution, run `pnpm validate`, then report readiness for Work Review. This is agent workflow behavior, not runtime agent control.

## Execution And Review

Execution uses the active Work context to implement approved Tasks, run targeted validation, persist evidence and attribution, and mark Tasks done. Do not replan ordinary execution. Stop with evidence for an explicit developer request, material scope expansion, architecture change, Product Context or authoritative-context conflict, or genuine block. After full validation, the Work Item is ready for Work Review.

`nerv-dev review` evaluates the integrated implementation, diff, validation evidence, context, Knowledge, external evidence, regressions, and risks. PASS is ready for optional user or external verification, then Close on request. REWORK persists findings and proposes minimum remediation Tasks without materializing them. `nerv-dev approve` adds approved remediation to the same Work Item and reactivates it.

## Guardrails

- Do not create standalone Task governance, Runs, Builds, Intake, Proposal, formal Task Review, or Task Close behavior.
- Do not materialize a plan or remediation Tasks before explicit human approval.
- Keep generated Markdown minimal and temporary. Active Work Item context belongs under `.nerv/agent/active/`; operational history belongs in SQLite.
- Preserve Product Context and Repo Context as canonical long-lived context. Record durable discoveries as small searchable knowledge, not large historical documents.
- Close only after the latest Work Review passes, required validation succeeds, and the user requests Close. Stage only Work Item-owned changes; block if unrelated changes cannot be separated safely. Never blindly use `git add -A`.

## Repository Rules

- Use `pnpm` with Node.js 20 or later. `pnpm validate` is the complete verification gate: build, typecheck, then smoke.
- TypeScript uses NodeNext and local `.js` import specifiers.
- Smoke tests use temporary Git repositories. Do not hard-code external paths.
- Reconstruct context from SQLite, canonical context, active Work Item Markdown when present, and Git state. Do not depend on previous conversation history.

## When Not To Use

- Consumer repository using Nerv as a tool: use Nerv's CLI commands, not this skill.
- Generic Node.js or TypeScript development unrelated to Nerv: use general-purpose skills.
- A public or host-specific integration skill is a separate concern.
