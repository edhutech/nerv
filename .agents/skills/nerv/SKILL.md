---
name: nerv
description: "Govern software work in a Git repository: plan before materializing, use relevant canonical context, and close only reviewed Work Items safely."
---

# Nerv

Use this skill for Nerv-governed development, including Nerv itself. Repository rules remain in repository authority such as `AGENTS.md` and relevant canonical context.

Nerv is local-first, agent/provider/host agnostic, and does not call AI APIs or control agents. Use deterministic runtime primitives to persist approved work; do not create another lifecycle or operational store.

## Workflow

The lifecycle vocabulary is `plan`, `approve`, `execute`, `review`, and `close`. `plan` and `approve` are agent protocols, not shell commands to probe or blindly run. `review` and `close` invoke their runtime commands. `status` is read-only; `checkpoint` is exceptional recovery evidence.

End governed interactions with one recommended next operation: `nerv approve` after a plan or remediation proposal, `nerv review WORK-###` after execution and full validation, and `nerv close WORK-###` after PASS and any optional local/user verification. After Close, no further lifecycle operation is required.

### Plan

Inspect only relevant Product Context, Repo Context, repository evidence, and authority. Precedence is developer decision, Product Context, authoritative project/domain context, then generic guidance. Do not infer product strategy. Skills and tools may assist but never replace governance.

Plan is non-durable. Propose canonical-context changes but persist them only during approved, scoped, task-attributed execution. Show an execution-ready preview before changing Work records:

```text
Proposed Work Item: <title>
Goal: <outcome>
Scope: <boundary>
Expected touchpoints: <when useful>
Out of scope: <meaningful exclusions>
Tasks:
Task N - <title>
Objective: <bounded outcome>
Implementation approach: <evidence-based path>
Expected touchpoints: <when known>
Acceptance criteria: <completion condition>
Targeted validation: <check>
Acceptance criteria: <Work-level conditions>
Full validation: <checks>
```

Require Work title, goal, scope, acceptance criteria, and validation; require Task title, objective, acceptance criteria, and validation. Include other fields only when useful. Use one Task by default; add more only for a real dependency, ownership, recovery, or validation boundary. Touchpoints guide work; they are not a path allowlist. Do not assign a Work ref or materialize speculative plans. Warn only about a material unresolved authority conflict.

After explicit approval, atomically materialize the complete Work, every Task, and its activation baseline. For REWORK, materialize only the persisted remediation proposal. Use `nerv --help` solely for exact primitive arguments.

### Execute

The first Task activates at materialization; each completion activates the next. Record targeted validation and every new Work-owned path. New unattributed changes block Review rather than becoming Work-owned. A genuine interruption may record a checkpoint; it is not a new lifecycle state.

Unless asked to stop, complete execution and full validation in the same interaction, then stop before Review:

```text
Execution complete.
Full validation passed.
WORK-### is ready for Work Review.

Recommended next operation: nerv review WORK-###
```

Stop for an explicit request, material scope or authority conflict, architecture change, or genuine block. Recover from SQLite, relevant canonical context, compact active context, and Git state, not conversation history.

### Review And Close

Review only an active Work with all Tasks done. Evaluate the approved result, relevant authority, diff, validation, risks, and supplied evidence. Persist exactly one outcome: PASS or REWORK. Narrative review is not an outcome.

Classify findings as critical, high, medium, or low. Critical/high require REWORK; medium requires REWORK unless explicitly accepted as durable residual risk; low is residual. REWORK remains in the same Work: show blockers and a minimum execution-ready remediation proposal, then await approval.

PASS saves the reviewed-tree fingerprint. Show residual low findings and accepted medium risks. Optional local or user verification may occur before Close; remote CI, push, deployment, and provider access are outside this lifecycle. Supplied verification evidence can later require REWORK.

Close requires PASS, validation evidence, and the developer's request. `nerv close WORK-###` uses the Work title by default; an agent may supply a repository-compliant subject when repository authority requires one. It commits only the exact reviewed attributable tree, preserves unrelated changes, and never stages indiscriminately. One Work normally produces one reviewed atomic commit; a verified no-diff result closes without an empty commit.

## Guardrails

- Do not materialize Work or remediation before explicit approval.
- Do not add standalone Task governance, Runs, Builds, Intake, Proposal, Task Review, or Task Close.
- Keep active Markdown temporary and minimal; SQLite is operational truth.
- Keep Product and Repo Context compact current truth, not history or general-purpose memory.
