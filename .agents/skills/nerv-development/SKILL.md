---
name: nerv-development
description: "Develop, review, or validate the Nerv repository using the Nerv Work Item protocol. Use for this repository's CLI, SQLite, context, Git-safe close, and validation work. Do not use for consumer repositories that merely use Nerv or for unrelated Node.js work."
---

# Nerv Development

Use this skill to develop Nerv itself. It defines the `nerv-dev` agent workflow protocol over the agent-agnostic `nerv` runtime primitives.

## Authority

Read only the authority relevant to the request, in this order:

1. The developer's current decision.
2. `.nerv-context/product/` for canonical product direction.
3. `AGENTS.md` and other applicable authoritative repository guidance.
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

`nerv-dev status` is read-only and `nerv-dev checkpoint` is exceptional. `nerv-dev` operations are protocol syntax, not shell commands. Do not blindly execute them. `nerv-dev plan` is the planning protocol and `nerv-dev approve` is the developer approval boundary; translate them through deterministic `nerv work` primitives and repository evidence. `nerv-dev review` and `nerv-dev close` direct the corresponding runtime operations. Execution is a phase after approval, not another normal public operation. `nerv-dev` is not a required executable, second database, second engine, host-specific orchestrator, or agent controller.

End every governed interaction with one concise **Recommended next operation**. Mirror the public workflow: recommend `nerv-dev approve` after planning or remediation proposals, `nerv-dev review WORK-###` after full validation, and `nerv-dev close WORK-###` after optional verification. During Execution, recommend phase-level continuation such as `Continue with Task 2.`; do not present task primitives as the normal journey. After Close, state that no further Nerv lifecycle operation is required.

## Planning And Approval

Before the `nerv-dev plan` protocol operation, inspect relevant Product Context. If it is missing or scaffold-only, establish the minimum confirmed product understanding with the developer before materializing work; record only confirmed facts. Inspect relevant implementation, `AGENTS.md`, and focused local or shared Knowledge. After approval, translate `nerv-dev approve` directly through `nerv work create`, `nerv work add-task`, and `nerv work activate`; use `nerv --help` only for exact primitive arguments, never to discover whether `nerv-dev` exists.

Surface a concise non-blocking warning only when the intended direction materially conflicts with Product Context or relevant authority and has no safe interpretation. The developer may proceed, adjust the implementation, or update Product Context; do not rewrite canonical context without confirmation.

Relevant Skills, MCPs, plugins, and specialized tools may provide guidance, assistance, or evidence. They remain subordinate to Product Context, the Plan Preview, approval, Work boundaries, Work Review, and Git-safe Close.

Before approval, show a concise Plan Preview with a proposed Work Item, goal, scope, expected touchpoints, meaningful out-of-scope boundaries, acceptance criteria, full validation, and execution-ready Tasks. Represent every applicable Work-level and Task-level field visibly, rather than only considering its details internally:

```text
Proposed Work Item: <title>
Goal: <goal>
Scope: <product-aware boundary>
Expected touchpoints: <likely files, modules, components, or subsystems when useful>
Out of scope: <meaningful boundaries when useful>
Tasks:

Task 1 — <title>

Objective:
<bounded outcome owned by this Task>

Implementation approach:
<evidence-based intended solution path>

Expected touchpoints:
<likely files, modules, or subsystems when useful>

Acceptance criteria:
<Task-specific completion criteria>

Targeted validation:
<Task-specific checks>

Task 2 — ...

Acceptance criteria: <integrated Work-level completion criteria>
Full validation: <commands or checks>
```

Keep fields concise and omit a field only when it genuinely does not apply. Do not collapse meaningful exclusions into Scope or rely only on Task criteria when integrated Work-level criteria are meaningful. Work-level Expected touchpoints describe the Work boundary; Task-level Expected touchpoints describe where that Task is expected to act. Show Task-level touchpoints explicitly when repository evidence makes them clear, even when the Work-level field already names the same location. Expected touchpoints guide execution, not a file allowlist; do not invent boilerplate touchpoints when none are evidenced. Implementation approach describes the intended solution path based on repository evidence; it is not a low-level coding script. Apply this same structure to remediation Tasks proposed after REWORK. A Plan Preview is not ready for approval when applicable Work-level or Task-level information is missing, including repository-evidenced Task-level Expected touchpoints, and the execution boundary is less reviewable, or when its Tasks are only titles, vague summaries, or otherwise require Execution to redesign the implementation path. Revise the preview before recommending `nerv-dev approve`. Do not assign a durable Work reference or persist speculative plans.

`nerv-dev approve` is satisfied by materializing approved Work and Tasks through those primitives, activating the Work Item, and persisting compact execution handoff context. Unless the developer explicitly asks to stop after approval, continue through approved Execution in the same agent interaction: complete each Task, record validation and attribution, run `pnpm validate`, then report readiness for Work Review. This is agent workflow behavior, not runtime agent control.

## Execution And Review

Execution uses the active Work context to implement approved Tasks, run targeted validation, persist evidence and attribution, and mark Tasks done. Do not replan ordinary execution. After successful Execution and validation, stop before Work Review and report:

```text
Execution complete.
Full validation passed.
WORK-### is ready for Work Review.

Recommended next operation: nerv-dev review WORK-###
```

Do not invoke or simulate `nerv-dev review`, record PASS or REWORK, proceed to optional verification, or recommend Close unless the developer explicitly requests `nerv-dev review WORK-###` or unambiguously requests Work Review. Apply the same stop boundary after approved REWORK remediation execution. Stop with evidence for an explicit developer request, material scope expansion, architecture change, Product Context or authoritative-context conflict, or genuine block.

`nerv-dev review` evaluates the integrated implementation, diff, validation evidence, context, Knowledge, external evidence, regressions, and risks. Classify every finding as `critical`, `high`, `medium`, or `low`. Critical and high findings always require REWORK. Medium findings require REWORK unless the developer explicitly accepts them as durable residual risk; low findings are residual by default. Review has one Work-level outcome: PASS or REWORK. PASS is ready for optional user or external verification, then Close on request; visibly list residual low findings and accepted medium risks, which do not block Close. REWORK first presents severity-labeled findings, identifies the blockers, and then proposes minimum remediation Tasks without materializing them. Each proposed remediation Task must use the same visible execution-ready structure before recommending `nerv-dev approve`. `nerv-dev approve` adds approved remediation to the same Work Item and reactivates it; execution then stops before the next explicit Work Review.

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
