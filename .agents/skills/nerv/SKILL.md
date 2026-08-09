---
name: nerv
description: "Use an installed Nerv runtime to govern normal software development in a Git repository. Plan before materializing work, use canonical context, and close only reviewed Work Items safely. Do not use to develop Nerv itself."
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

Plan the minimum coherent Work Item or Work Items needed for the request. A Work Item is the reviewable outcome; Tasks are bounded implementation units within it. For multiple Work Items, propose all outcomes and dependencies, but detail Tasks only for the next one.

Present the plan, acceptance criteria, and validation before changing Nerv work records. Wait for explicit human approval. After approval, materialize the selected Work Item with `nerv work create`, add its approved Tasks with `nerv work add-task`, then use `nerv work activate`.

Never materialize speculative plans, use standalone Task governance, or add Runs, Builds, Intake, Proposal, formal Task Review, or Task Close ceremony.

## Execute And Validate

For each pending approved Task: run `nerv task start TASK-###`, implement only its scope, run its targeted validation, then record evidence and touched paths with `nerv task done TASK-### --evidence "..." --files ...`. Do not stop for approval between ordinary Tasks or re-plan completed approved work.

After all Tasks are done, run the Work Item's full validation. Perform an integrated review against the request, acceptance criteria, Product and Repo Context, relevant Knowledge, implementation, Git diff, validation evidence, regressions, and risks. Persist it with `nerv review WORK-###` using `PASS` or `REWORK`.

If execution is genuinely blocked, use `nerv task block TASK-### --reason "..."`, stop execution, and report concise evidence. Replan only when new reasoning or clarification is necessary. Use `nerv checkpoint WORK-###` only for a genuine interruption before work can complete, with the active Task and concise recovery evidence.

## Rework And Close

A `REWORK` review must name findings, why they matter, the minimum remediation, and proposed Tasks. Present those Tasks and wait for explicit approval. Add approved remediation with `nerv work add-task` to the same Work Item, reactivate it, execute, validate, and review again. Do not create a new Work Item merely to repair the current one.

Only after the latest review is `PASS` and required validation passed, inspect Git state and use `nerv close WORK-### --message "..."`. Let Nerv selectively stage Work Item-owned changes and block unsafe boundaries. Never use `git add -A` to close governed work. One Work Item produces one reviewed atomic commit by default.
