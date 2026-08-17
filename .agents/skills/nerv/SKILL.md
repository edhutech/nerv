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

Inspect only relevant Product Context, Repo Context, repository evidence, and authority. Use `nerv status` to distinguish missing, scaffold, and established canonical context; established means only that non-template content exists, not that it is sufficient for this Work. Precedence is developer decision, Product Context, authoritative project/domain context, then generic guidance. Do not infer product strategy.

Plan is non-durable. When reliable evidence exists, propose the minimum durable context missing from scaffold or insufficient context: derive Repo Context only from authoritative repository evidence; derive Product Context only from explicit developer statements, authoritative product documentation, or confirmed behavior. Do not infer Product strategy. Persist context only during approved, scoped, task-attributed execution, replacing outdated current truth rather than appending history.

Shape the Work from intent, relevant context, artifact type, and relevant engineering expectations. Make acceptance criteria describe the requested outcome as well as technical correctness: passing builds, tests, and checks are evidence, not proof by themselves that the requested outcome is complete. Infer safe defaults when confidence is high; ask only an unresolved high-impact question whose answer would materially change the result.

Skills, plugins, MCPs, code-intelligence or memory systems, and domain tools may assist execution or provide evidence. They cannot bypass approval, redefine approved scope, advance the lifecycle, substitute Work Review, or Close Work. Attribute and review every repository mutation they make normally.

Show an execution-ready preview before changing Work records:

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

When outcome judgment would be useful before Close, hand off the result in the execution or PASS response: provide the relevant local preview URL, artifact path, reproducible command, or focused verification instruction. This is optional evidence for the developer, not a new lifecycle state or a web-specific requirement.

### Review And Close

Review only an active Work with all Tasks done. Evaluate the approved result, relevant authority, diff, validation, risks, and supplied evidence. Select concerns relevant to the Work rather than applying a universal checklist: for example authorization, API contracts, database integrity, testing, accessibility, frontend behavior, performance, and error handling only when the artifact, scope, or diff makes them applicable. Confirm outcome acceptance criteria separately from technical validation. Persist exactly one outcome: PASS or REWORK. Narrative review is not an outcome.

Classify findings as critical, high, medium, or low. Critical/high require REWORK; medium requires REWORK unless explicitly accepted as durable residual risk; low is residual. REWORK remains in the same Work: show blockers and a minimum execution-ready remediation proposal, then await approval.

PASS saves the reviewed-tree fingerprint. Show residual low findings and accepted medium risks. Optional local or user verification may occur before Close; remote CI, push, deployment, and provider access are outside this lifecycle. Supplied verification evidence can later require REWORK.

Close requires PASS, validation evidence, and the developer's request. `nerv close WORK-###` uses the Work title by default; an agent may supply a repository-compliant subject when repository authority requires one. It commits only the exact reviewed attributable tree, preserves unrelated changes, and never stages indiscriminately. One Work normally produces one reviewed atomic commit; a verified no-diff result closes without an empty commit.

## Guardrails

- Do not materialize Work or remediation before explicit approval.
- Do not add standalone Task governance, Runs, Builds, Intake, Proposal, Task Review, or Task Close.
- Keep active Markdown temporary and minimal; SQLite is operational truth.
- Keep Product and Repo Context compact current truth, not history or general-purpose memory.

## Response Presentation

Use a consistent semantic Markdown hierarchy for every developer-facing Nerv response: Plan, materialization, execution handoff, PASS, REWORK, remediation, verification handoff, and Close. Use a heading for the lifecycle stage or major response block, subordinate headings for Tasks, findings, or remediation Tasks, and bold labels for relevant metadata such as Goal, Scope, Objective, Outcome, Evidence, Acceptance criteria, Validation, or Result. Use inline code for commands, paths, Work references, IDs, and technical literals. Use lists for findings, touchpoints, acceptance criteria, or artifacts when they improve scanning. Keep responses compact and omit irrelevant sections. Meaning must remain clear without relying on host-specific colors, themes, or rendering behavior.
