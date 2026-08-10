---
name: nerv
description: "Use an installed Nerv runtime to govern normal software development in a Git repository. Plan before materializing work, use canonical context, and close only reviewed Work Items safely. Do not use to develop Nerv itself."
nerv_managed_sha256: "78e896cebcaf41b6ee5fb8996bf06e57b3ef1ad88204ff6dcb538ea7dac3b1eb"
---

# Nerv

Use this skill when a repository uses Nerv and a developer gives a normal software-development request. Use `nerv-development` only while developing the Nerv repository itself.

Nerv is agent agnostic. Use its deterministic runtime primitives; do not create an agent controller, another lifecycle, or persistent state outside Nerv.

## Start And Recover

1. Run `nerv status`. If Nerv is not initialized, run `nerv init` in the Git repository before governing work.
2. Read available `.nerv/product/` and `.nerv/repo/` files. They are canonical long-lived context. Refresh Repo Context with `nerv repo` when it is missing or stale; use `nerv product` only to scaffold missing Product Context for the developer to maintain.
3. Run `nerv work list`. For relevant open work, use `nerv work status WORK-###` and `nerv work show WORK-###`; read its active context at `.nerv/agent/active/WORK-###.md` when present.
4. Search focused terms with `nerv knowledge search "..."`, then load only relevant results with `nerv knowledge show <id>`.

In a fresh session, reconstruct work from these persisted sources and Git state, not prior conversation memory. Record small, reusable discoveries with `nerv knowledge add`; promote only stable authoritative facts to Product or Repo Context.

## Plan And Approve

The reasoning model plans the minimum coherent Work Item or Work Items needed for the request. Before changing Nerv work records, always show a concise **Plan Preview**:

```text
Proposed Work Item: <title>
Goal: <goal>
Tasks: <bounded implementation Tasks>
Acceptance criteria: <criteria>
Validation: <commands or checks>
```

Do not assign a durable `WORK-###` ID in the preview. For multiple Work Items, show the high-level roadmap and dependencies, but fully detail Tasks only for the next Work Item.

Wait for explicit human approval. Then materialize the approved Work Item with `nerv work create`, add its approved Tasks with `nerv work add-task`, and use `nerv work activate`. Report that the Work Item is ready for execution. If the workflow uses separate models, stop at this explicit execution handoff.

Never materialize speculative plans, use standalone Task governance, or add Runs, Builds, Intake, Proposal, formal Task Review, or Task Close ceremony.

## Model Roles And Execution

Nerv is provider- and host-agnostic. The user may change models between phases. Use only these roles:

- The **reasoning model** plans, replans after a genuine block, and performs integrated Work Review.
- The **execution model** implements approved Tasks and runs deterministic validation.

For each pending approved Task, the execution model runs `nerv task start TASK-###`, implements only its scope, runs targeted validation, then records evidence and touched paths with `nerv task done TASK-### --evidence "..." --files ...`. Do not stop for approval between ordinary Tasks or re-plan completed approved work.

If execution is genuinely blocked, use `nerv task block TASK-### --reason "..."`, stop execution, and return concise evidence to the reasoning model. Use `nerv checkpoint WORK-###` only for a genuine interruption before work can complete, with the active Task and concise recovery evidence.

After all Tasks are done, run the Work Item's full validation. When roles are separated, do not perform the reasoning-heavy Review in the execution phase. Report `Ready for Work Review` and hand off to the reasoning model.

## Review, Verification, And Close

The reasoning model performs the integrated Work Review against the request, acceptance criteria, Product and Repo Context, relevant Knowledge, implementation, Git diff, validation evidence, regressions, and risks. Persist its outcome with `nerv review WORK-###`.

For `REWORK`, persist the outcome, present findings and minimum remediation Tasks, and wait for human approval. Add approved remediation with `nerv work add-task` to the same Work Item, reactivate it, return to execution, validate, and review again. Do not create a new Work Item merely to repair the current one.

For `PASS`, persist the outcome and report that the Work Item is ready for optional user or external-tool verification. Do not commit by default. If verification finds a problem, treat it as new review evidence: record `REWORK` on the same Work Item, propose minimum remediation Tasks, wait for approval, then execute, validate, and review again.

After a successful verification, the user may request `nerv close WORK-### --message "..."`. Let Nerv selectively stage Work Item-owned changes and block unsafe boundaries. Never use `git add -A` to close governed work. One Work Item produces one reviewed atomic commit by default.

If the user explicitly requests auto-close for the Work Item, a `PASS` may proceed directly to Git-safe Close. This is a workflow preference only; do not add runtime state, configuration, or lifecycle concepts for it.
