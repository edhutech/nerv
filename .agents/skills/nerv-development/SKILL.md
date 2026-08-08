---
name: nerv-development
description: "Develop, review, or validate the Nerv repository using the vNext Work Item protocol. Use for this repository's CLI, SQLite, context, Git-safe close, and validation work. Do not use for consumer repositories that merely use Nerv or for unrelated Node.js work."
---

# Nerv Development

Use this skill to develop Nerv itself. It defines the `nerv-dev` agent workflow protocol over the agent-agnostic `nerv` runtime primitives.

## Authority

Read authoritative context in this order:

1. `NERV_VNEXT_DESIGN.md` for the approved vNext model.
2. `AGENTS.md` for repository constraints and validation.
3. `.nerv/product/` and `.nerv/repo/` when available for canonical product and repository context.

SQLite is the durable operational source of truth. Do not edit generated `.nerv/` state or `dist/` directly.

## Protocol

The exact agent-facing operations are:

```text
nerv-dev plan "<intent>"
nerv-dev plan WORK-###
nerv-dev approve WORK-###
nerv-dev execute WORK-###
nerv-dev status WORK-###
nerv-dev review WORK-###
nerv-dev close WORK-###
nerv-dev checkpoint WORK-###
```

`nerv-dev` is a protocol, not a required executable, second database, second engine, host-specific orchestrator, or agent controller. Interpret these operations through the deterministic `nerv` CLI and repository evidence.

## Workflow

1. `plan` uses a strong reasoning model to propose the minimum coherent Work Items. Detail Tasks only for the next Work Item. Show the plan and wait for explicit human approval.
2. `approve` materializes the approved Work Item and its Tasks. A Work Item is the governed outcome; every Task belongs to one Work Item.
3. `execute` uses an execution-focused model when appropriate. For each approved Task: make it active, implement it, run targeted validation, and mark it done. Do not re-plan ordinary execution.
4. Run full Work Item validation, then `review` with a strong reasoning model. Review the integrated result, Git diff, validation evidence, context, regressions, and risks.
5. A PASS makes the Work Item eligible for `close`. A REWORK returns findings and minimum remediation Tasks, waits for human approval, and adds approved Tasks to the same Work Item.
6. `checkpoint` is exceptional recovery evidence only when execution must genuinely stop before completion.

The canonical Work Item states are `planned`, `active`, `review`, `rework`, and `closed`. Task states are `pending`, `active`, `done`, and `blocked`.

## Model Roles

- Use a strong reasoning model for planning, replanning after a genuine block, and Work Review.
- Use an execution-focused model for approved Task implementation and deterministic validation when appropriate.
- The execution model must stop when a Task is genuinely blocked. It must provide concise evidence rather than inventing a substantial new plan.
- Nerv must remain independent of model, provider, host, and conversational memory.

## Guardrails

- Do not create standalone Task governance, Runs, Builds, Intake, Proposal, formal Task Review, or Task Close behavior.
- Do not materialize a plan or remediation Tasks before explicit human approval.
- Keep generated Markdown minimal and temporary. Active Work Item context belongs under `.nerv/agent/active/`; operational history belongs in SQLite.
- Preserve Product Context and Repo Context as canonical long-lived context. Record durable discoveries as small searchable knowledge, not large historical documents.
- Close only after the latest Work Review passes and required validation succeeds. Stage only Work Item-owned changes; block if unrelated changes cannot be separated safely. Never blindly use `git add -A`.

## Repository Rules

- Use `pnpm` with Node.js 20 or later. `pnpm validate` is the complete verification gate: build, typecheck, then smoke.
- TypeScript uses NodeNext and local `.js` import specifiers.
- Smoke tests use temporary Git repositories. Do not hard-code external paths.
- Reconstruct context from SQLite, canonical context, active Work Item Markdown when present, and Git state. Do not depend on previous conversation history.

## When Not To Use

- Consumer repository using Nerv as a tool: use Nerv's CLI commands, not this skill.
- Generic Node.js or TypeScript development unrelated to Nerv: use general-purpose skills.
- A public or host-specific integration skill is a separate concern.
