---
name: nerv
description: "Use an installed Nerv runtime to govern normal software development in a Git repository. Plan before materializing work, use canonical context, and close only reviewed Work Items safely. Do not use to develop Nerv itself."
nerv_managed_sha256: "a4453a44d597ee42b7bf29a06d605cb0ca7539e21d763c4936b4e76efd77a3dd"
---

# Nerv

Use this skill when a repository uses Nerv and a developer gives a normal software-development request. Use `nerv-development` only while developing the Nerv repository itself.

Nerv is agent agnostic. Use its deterministic runtime primitives; do not create an agent controller, another lifecycle, or persistent state outside Nerv.

## Public Workflow

The normal operations are `nerv plan`, `nerv approve`, `nerv review`, and `nerv close`. `nerv status` is read-only; `nerv checkpoint` is exceptional recovery evidence. The runtime is agent and provider agnostic: these agent-facing operations use its deterministic primitives and never require the runtime to call an AI API.

End every governed interaction with one concise **Recommended next operation**. Prefer `nerv approve` after a Plan Preview or REWORK remediation proposal, `nerv review WORK-###` after approved execution and full validation, and `nerv close WORK-###` after explaining optional verification on PASS. During Execution, use phase-level continuation such as `Continue with Task 2.` rather than exposing persistence primitives. After Close, state that no further Nerv lifecycle operation is required.

### Plan

Before `nerv plan "<intent>"`, inspect only relevant Product Context, implementation, authoritative project or domain guidance, and focused local or shared Knowledge. In a fresh session, reconstruct existing work from SQLite, active context, canonical context, and Git state, not conversational memory.

For product work, treat missing or placeholder Product Context as empty. Establish the minimum confirmed product understanding before materializing a Work Item, then record only confirmed facts in tracked Product Context. Do not create another lifecycle for this preparation.

Use this precedence internally: current developer decision, Product Context, authoritative repository/domain context, then generic external guidance. Surface a concise non-blocking warning only for a material Product Context or authority conflict with no safe interpretation. The developer may continue, adjust the implementation, or update Product Context; update canonical truth only when the developer confirms it changed.

Relevant Skills, MCPs, plugins, and specialized tools may assist inside Nerv governance. They may provide guidance or evidence but cannot replace Product Context reasoning, Plan Preview, approval, Work boundaries, Work Review, or Git-safe Close.

Show a concise, non-durable **Plan Preview** before changing Work records:

```text
Proposed Work Item: <title>
Goal: <goal>
Scope: <product-aware boundary>
Expected touchpoints: <likely files, modules, components, or subsystems when useful>
Out of scope: <meaningful boundaries when useful>
Tasks: <bounded implementation Tasks>
Acceptance criteria: <criteria>
Full validation: <commands or checks>
```

Derive the goal, scope, Tasks, and acceptance criteria from Product Context and the request. Expected touchpoints guide execution, not a file allowlist. Each Task includes a bounded objective, evidence-based approach, touchpoints when useful, acceptance criteria, and targeted validation. Do not assign a durable `WORK-###` reference in the preview or materialize speculative plans.

### Approve And Execute

`nerv approve` materializes the currently approved Work Item and Tasks, activates the Work Item, and persists compact execution guidance in the Work and Task scopes. Unless the developer explicitly asks to stop after approval, continue through approved Execution in the same agent interaction: complete each Task, record targeted validation and attribution, then run full validation and report readiness for Work Review. This agent workflow behavior does not make the runtime launch, route, or control agents.

Execution uses the active Work context to complete each approved Task, run targeted validation, record evidence and attributable paths, then run full validation. Do not require approval between normal Tasks. Stop and return evidence for an explicit developer request, material scope expansion, architecture change, Product Context conflict, authoritative-context conflict, or genuine block. Use a checkpoint only for a genuine interruption.

### Review And Close

`nerv review WORK-###` evaluates intent, Product Context, relevant Repo Context and project authority, approved boundaries, acceptance criteria, implementation, Git diff, validation, Knowledge, external evidence, regressions, and risks.

PASS is ready for optional user or external verification, then `nerv close WORK-###` on request. REWORK persists findings and proposes minimum remediation Tasks without materializing them. `nerv approve` adds approved remediation to the same Work Item and reactivates it.

Close selectively stages Work-owned changes, inspects the staged diff, and blocks unsafe boundaries. Never use `git add -A`; one Work Item produces one reviewed atomic commit by default.

## Deterministic Primitives

The runtime retains `work`, `product`, `repo`, and `knowledge` persistence commands for agents implementing an approved path. They are not the normal developer-facing lifecycle. Use `nerv --help` only when exact primitive arguments are needed.
