---
name: nerv
description: "Use an installed Nerv runtime to govern normal software development in a Git repository. Plan before materializing work, use canonical context, and close only reviewed Work Items safely. Do not use to develop Nerv itself."
nerv_managed_sha256: "dbd2137145794c72e46f6747bb32f36931daa1bd465353887826e4a7477faa48"
---

# Nerv

Use this skill when a repository uses Nerv and a developer gives a normal software-development request. Use `nerv-development` only while developing the Nerv repository itself.

Nerv is agent agnostic. Use its deterministic runtime primitives; do not create an agent controller, another lifecycle, or persistent state outside Nerv.

## Start And Recover

1. Run `nerv status`. If Nerv is not initialized, run `nerv init` in the Git repository before governing work.
2. Inspect relevant tracked `.nerv-context/product/` files before planning product work. They are canonical long-lived Product Context. Read only files needed for the request. `nerv repo` generates local observations under `.nerv/repo/`; shared repository facts belong in `.nerv-context/repo/` after `nerv repo scaffold`.
3. Run `nerv work list`. For relevant open work, use `nerv work status WORK-###` and `nerv work show WORK-###`; read its active context at `.nerv/agent/active/WORK-###.md` when present.
4. Search focused terms with `nerv knowledge search "..."`, then load only relevant results with `nerv knowledge show <id>`.

In a fresh session, reconstruct work from these persisted sources and Git state, not prior conversation memory. Record small, reusable discoveries with `nerv knowledge add`; promote only stable authoritative facts to Product or Repo Context.

## Product Context Before Planning

For product work, inspect Product Context before proposing a Work Item. If relevant files contain useful context, read only those files and proceed. Treat absent files or scaffold placeholders without approved product facts as effectively empty.

When Product Context is effectively empty, do not materialize a Work Item. Establish only the minimum useful understanding in conversation: what the product is, its intended users, the problem or value, the requested outcome, and relevant boundaries. Present that inferred understanding for the developer to confirm or correct. Keep this lightweight for a demo or small project.

After confirmation, run `nerv product` to scaffold canonical files. Write only confirmed information with `nerv product write <document> --content "..."`; valid documents are the canonical files under `.nerv-context/product/`. Then read the relevant written files and continue to the normal Plan Preview. This is context preparation, not Intake, Proposal, Product Session, Product Review, or another lifecycle.

## Context, Conflicts, And Capabilities

Before planning, inspect the repository deeply enough to prepare an implementation path. Discover only project-specific authoritative sources relevant to the affected domain, such as `DESIGN.md`, `AGENTS.md`, architecture decisions, design tokens, theme configuration, or established component systems. Do not copy them into `.nerv/`, duplicate them in Product Context, or create Nerv-owned replacements. For frontend work, project design guidance outranks generic design advice; if none exists, infer from the existing UI or briefly note that durable guidance could be established separately without blocking work.

Use this reasoning order: an explicit current developer decision; canonical Product Context for product direction; authoritative repository or domain context; then generic guidance from external Skills, MCPs, plugins, and tools. If relevant authoritative sources materially conflict with no safe interpretation, surface it to the developer. Keep ordinary source selection internal.

Before a product-work Plan Preview, compare the material intent and proposed direction with relevant Product Context. If there is a material conflict with a goal, constraint, boundary, or durable decision, show a concise non-blocking warning naming the inconsistency and why it matters. Offer the developer a choice to continue, align the implementation, or update Product Context first. Do not warn about minor implementation details. If the developer proceeds, do not automatically change Product Context: update it only when the developer confirms a durable product-direction change; otherwise retain a useful exception as Work evidence or small durable Knowledge. Do not repeat a warning for an already established durable decision.

Respect an explicitly requested relevant external Skill, MCP, plugin, or specialized tool within approved Work Item and Task boundaries. Otherwise, the host or agent may use a clearly relevant installed capability without enumerating capabilities or requesting separate approval. Mention it in the Plan Preview only when it materially changes the implementation. External capabilities supply specialized context, evidence, or assistance; they never replace Product Context reasoning, Plan Preview, human approval, approved boundaries, Work Review, or Git-safe Close. Preserve Nerv governance when external guidance recommends another lifecycle, approval, or commit process.

## Plan And Approve

The reasoning model plans the minimum coherent Work Item or Work Items needed for the request. Inspect the relevant implementation before planning so the execution model receives an approved path rather than a superficial title. Before changing Nerv work records, always show a concise **Plan Preview**:

```text
Proposed Work Item: <title>
Goal: <goal>
Scope: <product-aware boundary>
Expected touchpoints: <likely files, modules, components, or subsystems when useful>
Out of scope: <meaningful boundaries when useful>
Tasks: <bounded implementation Tasks>
Acceptance criteria: <criteria>
Validation: <commands or checks>
```

Define the goal, scope, Tasks, and acceptance criteria from the relevant Product Context as well as the request. Expected touchpoints are planning guidance, not a file allowlist; out-of-scope boundaries prevent material expansion and should not be boilerplate. Each Task should state its bounded objective, evidence-based approach, expected touchpoints when useful, Task-specific criteria, and targeted validation. Give enough direction to execute without redesigning, but do not turn obvious coding work into scripts. On materialization, retain compact approved boundaries and touchpoints in the existing Work Item and Task `scope` fields so active context survives the planning handoff. Do not assign a durable `WORK-###` ID in the preview. For multiple Work Items, show the high-level roadmap and dependencies, but fully detail Tasks only for the next Work Item.

Wait for explicit human approval. Then materialize the approved Work Item with `nerv work create`, add its approved Tasks with `nerv work add-task`, and use `nerv work activate`. Report that the Work Item is ready for execution. If the workflow uses separate models, stop at this explicit execution handoff.

Never materialize speculative plans, use standalone Task governance, or add Runs, Builds, Intake, Proposal, formal Task Review, or Task Close ceremony.

## Model Roles And Execution

Nerv is provider- and host-agnostic. The user may change models between phases. Use only these roles:

- The **reasoning model** plans, replans after a genuine block, and performs integrated Work Review.
- The **execution model** implements approved Tasks and runs deterministic validation.

For each pending approved Task, the execution model runs `nerv work task start WORK-### <position>`, uses the active Work Item context and approved Task detail, implements only its scope, runs targeted validation, then records evidence and touched paths with `nerv work task done WORK-### <position> --evidence "..." --files ...`. Tasks have stable internal UUIDs but no global task reference. Small implementation-local adjustments and incidental file differences are allowed when they remain inside the approved outcome and boundaries. Do not stop for approval between ordinary Tasks or re-plan completed approved work.

If satisfying a Task requires material scope expansion, an architectural change, a Product Context conflict, or work outside the approved Work Item boundary, use `nerv work task block WORK-### <position> --reason "..."`, stop execution, and return concise evidence to the reasoning model. Use `nerv checkpoint WORK-### --task <position>` only for a genuine interruption before work can complete, with concise recovery evidence.

After all Tasks are done, run the Work Item's full validation. When roles are separated, do not perform the reasoning-heavy Review in the execution phase. Report `Ready for Work Review` and hand off to the reasoning model.

## Review, Verification, And Close

The reasoning model performs the integrated Work Review against the request, relevant Product Context, Repo Context when applicable, relevant specialized project guidance, acceptance criteria, relevant Knowledge, implementation, Git diff, validation evidence, supplied external testing or tool evidence, regressions, and risks. Verify that the result satisfies the relevant product goals and constraints, not only technical validation. Persist its outcome with `nerv review WORK-###`.

For `REWORK`, persist the outcome, present findings and minimum remediation Tasks, and wait for human approval. Add approved remediation with `nerv work add-task` to the same Work Item, reactivate it, return to execution, validate, and review again. Do not create a new Work Item merely to repair the current one.

For `PASS`, persist the outcome and report that the Work Item is ready for optional user or external-tool verification. Do not commit by default. If verification finds a problem, treat it as new review evidence: record `REWORK` on the same Work Item, propose minimum remediation Tasks, wait for approval, then execute, validate, and review again.

After a successful verification, the user may request `nerv close WORK-### --message "..."`. Let Nerv selectively stage Work Item-owned changes and block unsafe boundaries. Never use `git add -A` to close governed work. One Work Item produces one reviewed atomic commit by default.

If the user explicitly requests auto-close for the Work Item, a `PASS` may proceed directly to Git-safe Close. This is a workflow preference only; do not add runtime state, configuration, or lifecycle concepts for it.
