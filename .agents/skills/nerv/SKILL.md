---
name: nerv
description: "Use an installed Nerv runtime to govern normal software development in a Git repository. Plan before materializing work, use canonical context, and close only reviewed Work Items safely. Do not use to develop Nerv itself."
nerv_managed_sha256: "149d0b618923e52996a315961a81f62e0d958fb1a376fc1bdf56aaec2da364b2"
---

# Nerv

Use this skill when a repository uses Nerv and a developer gives a normal software-development request. Use `nerv-development` only while developing the Nerv repository itself.

Nerv is agent agnostic. Use its deterministic runtime primitives; do not create an agent controller, another lifecycle, or persistent state outside Nerv.

## Public Workflow

The normal operations are `nerv plan`, `nerv approve`, `nerv review`, and `nerv close`. They are agent-facing protocol operations, not necessarily literal shell commands. Do not blindly execute a command because it appears in this workflow. `nerv review` and `nerv close` are runtime commands; `nerv plan` is the agent's planning protocol and `nerv approve` is the developer approval boundary. Translate those protocol operations directly through the deterministic `work` primitives when persistence is required. `nerv status` is read-only; `nerv checkpoint` is exceptional recovery evidence. The runtime is agent and provider agnostic and never requires the runtime to call an AI API.

End every governed interaction with one concise **Recommended next operation**. Prefer `nerv approve` after a Plan Preview or REWORK remediation proposal, `nerv review WORK-###` after approved execution and full validation, and `nerv close WORK-###` after explaining optional verification on PASS. During Execution, use phase-level continuation such as `Continue with Task 2.` rather than exposing persistence primitives. After Close, state that no further Nerv lifecycle operation is required.

### Plan

Before the `nerv plan "<intent>"` protocol operation, inspect only relevant portions of `.nerv-context/product.md` for current product truth and `.nerv-context/repo.md` for current repository truth, alongside implementation and authoritative project or domain guidance. Do not load either file ritualistically when it is not relevant. Relevant external context sources such as repository tooling, documentation, skills, MCPs, plugins, or specialized tools may assist when available; they are optional and do not replace Nerv governance. Plan may propose context changes but must not persist them. If required context is absent, minimal, or insufficient, establish only the minimum confirmed truth needed for the Work: product facts require explicit developer statements, authoritative product documentation, or confirmed current behavior. Repository facts may be derived from authoritative repository evidence. Do not infer speculative product strategy. During approved execution, a context update must be in Work scope and task-attributed; expected touchpoints guide planning but are not a path whitelist. Update context only when the Work establishes or changes durable current truth, replacing outdated truth rather than appending Work history. In a fresh session, reconstruct existing work from SQLite, active context, canonical context, and Git state, not conversational memory. After the developer approves, translate `nerv approve` in this order: create the Work with its approved title, intent, goal, scope, Work acceptance criteria, and full validation; add every approved Task with its title, scope, Task acceptance criteria, and targeted validation; then activate the Work. Use the required `work create`, `work add-task`, and `work activate` primitives for that materialization; use `nerv --help` only to obtain their exact arguments. Never probe whether `nerv plan` or `nerv approve` exists as a literal command.

`product.md` answers what is being built, for whom, and what must remain true now; it is current product truth, not a history or evolution log. `repo.md` answers what is needed to modify this repository safely; it is durable current implementation truth, not a file inventory or architecture history. Do not create another lifecycle for this preparation.

Use this precedence internally: current developer decision, Product Context, authoritative repository/domain context, then generic external guidance. Surface a concise non-blocking warning only for a material Product Context or authority conflict with no safe interpretation. The developer may continue, adjust the implementation, or update Product Context; update canonical truth only when the developer confirms it changed.

Relevant Skills, MCPs, plugins, and specialized tools may assist inside Nerv governance. They may provide guidance or evidence but cannot replace Product Context reasoning, Plan Preview, approval, Work boundaries, Work Review, or Git-safe Close.

Show a concise, non-durable **Plan Preview** before changing Work records:

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

Derive the goal, scope, Tasks, and acceptance criteria from Product Context and the request. Every applicable Work-level and Task-level field must be visible in the preview, not merely considered internally. Do not collapse meaningful exclusions into Scope or rely only on Task criteria when integrated Work-level criteria are meaningful. Keep fields concise and omit a field only when it genuinely does not apply. Work-level Expected touchpoints describe the Work boundary; Task-level Expected touchpoints describe where that Task is expected to act. Show Task-level touchpoints explicitly when repository evidence makes them clear, even when the Work-level field already names the same location. Expected touchpoints guide execution, not a file allowlist; do not invent boilerplate touchpoints when none are evidenced. Implementation approach describes the intended solution path based on repository evidence; it is not a low-level coding script. Apply this same structure to remediation Tasks proposed after REWORK.

A Plan Preview is not ready for approval when applicable Work-level or Task-level information is missing, including repository-evidenced Task-level Expected touchpoints, and the execution boundary is less reviewable, or when its Tasks are only titles, vague summaries, or otherwise require Execution to redesign the implementation path. Revise the preview before recommending `nerv approve`.

Do not assign a durable `WORK-###` reference in the preview or materialize speculative plans.

### Approve And Execute

`nerv approve` is satisfied by atomically materializing the complete currently approved Work Item and every approved Task with the deterministic persistence primitive, including its activation baseline, then persisting compact execution guidance. The Task contract maps directly from the Plan Preview: title, objective, implementation approach, expected touchpoints, acceptance criteria, and targeted validation. Unless the developer explicitly asks to stop after approval, continue through approved Execution in the same agent interaction: complete each Task, record targeted validation and attribution, then run full validation and report readiness for Work Review. This agent workflow behavior does not make the runtime launch, route, or control agents.

Execution uses the active Work context to complete each approved Task in order: only the earliest pending Task may start, and only the active Task may become done. A genuine interruption keeps the Task active and may record a Checkpoint with a summary and next step; it does not create another Task state. Do not require approval between normal Tasks. After successful Execution and validation, stop before Work Review and report:

```text
Execution complete.
Full validation passed.
WORK-### is ready for Work Review.

Recommended next operation: nerv review WORK-###
```

Do not invoke or simulate `nerv review`, record PASS or REWORK, proceed to optional verification, or recommend Close unless the developer explicitly requests `nerv review WORK-###` or unambiguously requests Work Review. Apply the same stop boundary after approved REWORK remediation execution. Stop and return evidence for an explicit developer request, material scope expansion, architecture change, Product Context conflict, authoritative-context conflict, or genuine block. Use a checkpoint only for a genuine interruption.

### Review And Close

`nerv review WORK-###` is accepted only from an active Work with every Task done. It evaluates intent, relevant product or repository context, project authority, approved boundaries, acceptance criteria, implementation, Git diff, validation, optional external evidence, regressions, and risks. A Nerv Review outcome exists only after this runtime command succeeds and persists it; narrative analysis alone is not a completed Nerv Review and must not recommend approval. Classify every finding as `critical`, `high`, `medium`, or `low`. Critical and high findings always require REWORK. Medium findings require REWORK unless the developer explicitly accepts them as durable residual risk. Low findings are residual by default. Review has one Work-level outcome only: PASS or REWORK.

PASS persists a Git-native synthetic-tree fingerprint for the attributed paths and is ready for optional user or external verification, then `nerv close WORK-###` on request. Show residual low findings and explicitly accepted medium risks, and state that they do not block Close. A PASS may become REWORK only when supplied verification evidence identifies blocking findings. Every persisted REWORK, including after verification or remediation, first shows severity-labeled findings and which findings block PASS, then persists findings and proposes minimum remediation Tasks without materializing them. Each proposed remediation Task must use the same visible execution-ready structure before recommending approval. `nerv approve` adds approved remediation to the same Work Item and reactivates it; execution then stops before the next explicit Work Review.

Close requires the saved PASS fingerprint and an unchanged protected baseline. It commits that exact reviewed tree with Git plumbing, preserving unrelated working-tree changes without staging them. Never use `git add -A`; one Work Item produces one reviewed atomic commit by default.

## Deterministic Primitives

The runtime retains `work` persistence commands for agents implementing an approved path. They are not the normal developer-facing lifecycle. Use `nerv --help` only when exact primitive arguments are needed, not to discover how to interpret protocol operations.
