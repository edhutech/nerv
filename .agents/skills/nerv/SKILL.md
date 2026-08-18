---
name: nerv
description: "Govern software work in a Git repository: plan before materializing, use relevant canonical context, and close only reviewed Work Items safely."
---

# Nerv

Use this skill for Nerv-governed development, including Nerv itself. Repository rules remain in repository authority such as `AGENTS.md` and relevant canonical context. For structured Nerv CLI inputs, inspect the relevant command's `--help` output for the exact public contract instead of inspecting implementation source.

Nerv is local-first, agent/provider/host agnostic, and does not call AI APIs or control agents. Use deterministic runtime primitives to persist approved work; do not create another lifecycle or operational store.

Nerv governs boundaries, not agent intelligence. Preserve the host agent's native reasoning, planning, clarification, exploration, tool use, and implementation capabilities; use them to produce the best approved result rather than replacing them with a Nerv-specific procedure.

## Workflow

The developer-facing lifecycle is `plan`, `approve`, `review`, and `close`. `plan` and `approve` are conversational actions, not shell commands to probe or blindly run. After approval, the agent materializes the approved Work with `nerv work materialize --plan <json>` or persisted REWORK with `nerv work materialize-rework WORK-###`; execution then continues automatically. `review` and `close` invoke their runtime commands. `status` is read-only; `checkpoint` is exceptional recovery evidence.

End governed interactions with one recommended next action: `approve` after a Plan or persisted remediation proposal, `review` after execution and full validation, and `close` after PASS and any optional local/user verification. These are conversational agent intents, not shell commands. When explicitness is useful, the agent translates `approve` into the applicable materialization primitive, then uses `nerv review WORK-###` and `nerv close WORK-###` for Review and Close. After Close, no further lifecycle operation is required.

Human-facing lifecycle shorthand is semantic conversational intent, not keyword matching. Resolve it only when the developer's full message clearly expresses the lifecycle action, the current workspace identifies exactly one applicable Work and valid transition, and the action is not negative, hypothetical, conditional, explanatory, or deferred. Words such as `approve`, `review`, or `close` appearing in a message are never sufficient by themselves: "Before approve, explain the migration", "Do not approve yet", "What happens after close?", "Do not close this yet", "For the review, use two subagents first", "todavía no lo apruebes", and "antes de cerrar quiero revisar otra cosa" do not advance Nerv. `approve` means approval of the presented Plan or persisted REWORK remediation; `review` means Review of the current Work after all Tasks are done; and `close` means Close of the current Work after PASS. If no applicable Work or transition exists, explain that instead of guessing. If intent, Work resolution, or state is ambiguous or invalid, explain that instead of guessing or forcing a transition. Preserve `WORK-###`, Task numbers, `PASS`, and `REWORK` in the surrounding handoff. Equivalent natural-language intent in the developer's language, such as "I approve this plan", "Run the review", "apruébalo", "haz el review", or "ciérralo", may express the same action; do not require exact-phrase matching or add runtime natural-language parsing. Explicit `nerv ...` forms remain valid, and this workspace-scoped rule does not assume future parallel Work support.

### Developer Authority And Temporary Opt-Out

After `nerv init`, automatic discovery makes Nerv the default for repository work, including requests that do not name Nerv. Explicit developer intent has precedence over that automatic governance for the scope the developer states. A clear request such as "do not use Nerv for this task" suppresses the Nerv lifecycle only for that requested work; "do not use Nerv for this session" suppresses it for the current conversational session. Equivalent natural-language intent in the developer's language, including English and Spanish, has the same meaning; do not require an exact phrase or host-specific `/`, `@`, or `$` invocation.

During an active opt-out scope, work natively: do not automatically prepare a Nerv Plan, materialize a Work Item, execute Nerv lifecycle commands, create Tasks, or perform Nerv Review or Close. This is temporary conversational authority, not repository installation or durable configuration: do not remove or modify Nerv files or contexts, uninstall the skill, change lifecycle state, or introduce runtime session state. A future session returns to the normal Nerv default unless the developer opts out again. A later explicit request such as "use Nerv again" or "use Nerv for this next task" restores governed behavior for subsequent work in the same conversation.

An already-active Work Item is not canceled, abandoned, mutated, or silently bypassed by an opt-out request. Its durable lifecycle and active context remain authoritative; do not use the opt-out to corrupt or sidestep that governed Work. Treat the opt-out as applying to new work, and resume or complete the active Work through its existing lifecycle when the developer re-enables Nerv or when that Work must be safely continued.

### Plan

Natural user requests need not name Nerv, Work, Tasks, Review, lifecycle commands, or repository instructions before this contract applies.

Inspect only relevant Product Context, Repo Context, repository evidence, and authority. Use `nerv status` to distinguish missing, scaffold, and established canonical context; established means only that non-template content exists, not that it is sufficient for this Work. Precedence is developer decision, Product Context, authoritative project/domain context, then generic guidance. Do not infer product strategy.

Plan is non-durable. When reliable evidence exists, propose the minimum durable context missing from scaffold or insufficient context: derive Repo Context only from authoritative repository evidence; derive Product Context only from explicit developer statements, authoritative product documentation, or confirmed behavior. Do not infer Product strategy. Persist context only during approved, scoped, task-attributed execution, replacing outdated current truth rather than appending history. Keep Product Context authority-backed: an implementation decision is not a product fact, and speculative copy, unsupported assumptions, temporary mock content, or other implementation inventions must not be persisted as durable product truth.

Shape the Work from intent, relevant context, artifact type, and relevant engineering expectations. Make acceptance criteria describe the requested outcome as well as technical correctness: passing builds, tests, and checks are evidence, not proof by themselves that the requested outcome is complete. Validation intent must be coherent with the acceptance criteria; do not present a technical check as the complete strategy when the approved outcome also requires behavior, interaction, visual quality, responsiveness, accessibility, or another result that check cannot establish. Distinguish implementation decisions from product facts. Technical choices may be proposed, defaulted, or safely inferred when confidence is genuinely high; a declared technical default such as React + Vite is an implementation decision, not product authority. Claims about the real product, business, customers, or organization require sufficient authority, including prices, packages, composition, health, nutrition, performance, legal, safety, quality, shipping, delivery, contact, social, customer, testimonial, review, metric, certification, client, partner, award, and comparable factual claims. Before approval, resolve through native clarification, explicitly declare as a proposed decision/default, or safely infer any material implementation choice that would meaningfully change the approved result. Infer safe defaults when confidence is genuinely high; ask only when the answer would materially change the result. When product information is missing, use native judgment to choose an appropriate path: ask a focused clarification when it materially changes the outcome, use neutral copy, clearly label temporary placeholder or demo content, omit the claim, or propose a product decision for explicit human approval. Do not impose a fixed questionnaire or suppress ordinary agent exploration and planning. Approval of a Plan records approved work boundaries; it does not make an unsupported product assumption authoritative.

Skills, plugins, MCPs, code-intelligence or memory systems, browser, research, and other domain tools may assist execution or provide evidence. The developer and host agent may choose their native execution strategy, including one or more subagents, without Nerv prescribing topology. A capability invocation, subagent, or delegation does not by itself create a Task or Work; create a Task only for a real execution boundary inside the approved Work, and create another Work only for a materially separate outcome needing its own approval, evidence, Review, and Close. They cannot bypass approval, redefine approved scope, advance the lifecycle, substitute Work Review, or Close Work. Attribute and review every repository mutation they make normally. Nerv remains agent-, model-, provider-, and host-agnostic. Fabricated testimonials, customers, metrics, certifications, awards, contacts, or similar social proof must never be presented as real; if used for a demonstration, identify it clearly as temporary placeholder or demo content and keep it out of canonical Product Context.

Show an execution-ready Plan before changing Work records:

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
Work-level acceptance criteria: <Work-level conditions>
Full validation: <checks>
```

Require Work title, goal, scope, acceptance criteria, and validation; require Task title, objective, acceptance criteria, and validation. Include material implementation decisions and proposed defaults when they make the Plan execution-ready. Include other fields only when useful. Use one Task by default; add more only for a real dependency, ownership, recovery, or validation boundary. Touchpoints guide work; they are not a path allowlist. Do not assign a Work ref or materialize speculative plans. Warn only about a material unresolved authority conflict. End every Plan with Recommended next action: `approve`.

After explicit approval, atomically materialize the complete Work, every Task, and its activation baseline. For REWORK, materialize only the persisted remediation proposal. Use `nerv --help` solely for exact primitive arguments.

After successful materialization, continue execution automatically using the native agent workflow. The first Task is active operational state, not a developer action: do not ask the developer to execute a Task or wait for another lifecycle command before implementation. Complete each active Task, allow completion to activate the next Task, run full validation, and then hand off `review`.

### Execute

The first Task activates at materialization; each completion activates the next. Record targeted validation and every new Work-owned path. New unattributed changes block PASS rather than becoming Work-owned. Review them as blocking findings and persist REWORK with a remediation proposal; do not hide them through local Git exclusions or mutate the repository during Review. A genuine interruption may record a checkpoint; it is not a new lifecycle state.

Unless asked to stop, complete execution and full validation in the same interaction, then stop before Review:

```text
Execution complete.
Full validation passed.
WORK-### is ready for Work Review.

Recommended next action: review
```

Stop for an explicit request, material scope or authority conflict, architecture change, or genuine block. Recover from SQLite, relevant canonical context, compact active context, and Git state, not conversation history. When a Work is in REWORK, present its persisted remediation proposal before requesting approval; use the durable proposal exposed by the Work handoff or `nerv work show WORK-###`, rather than relying on the previous conversation.

When the approved acceptance criteria require the developer to view or try the result, prefer a concrete handoff in the execution response when reasonably available: provide the relevant observed local preview URL, artifact path, reproducible command, or focused verification instruction. For other outcomes, provide such a handoff when outcome judgment would be useful before Close. If a runtime URL is produced, report the URL actually observed for the current execution rather than assuming a conventional address, and include enough execution-specific detail to distinguish it from an unrelated process. This handoff is optional developer verification only when the approved acceptance criteria have already been demonstrated during Review; it must not defer evidence required to justify PASS, and it is not a new lifecycle state or a web-specific requirement.

### Review And Close

Review only an active Work with all Tasks done. Evaluate the approved result, relevant authority, diff, validation, risks, and supplied evidence. Select concerns relevant to the Work rather than applying a universal checklist: for example authorization, API contracts, database integrity, testing, accessibility, frontend behavior, performance, and error handling only when the artifact, scope, or diff makes them applicable. Distinguish technical validation from outcome verification. Reconcile every material Work-level acceptance criterion with evidence proportional to that criterion: a successful build can support a build criterion, but cannot by itself establish unrelated behavior, interaction, responsive, visual, accessibility, or other outcome criteria. Static source inspection and an HTTP response may inform review but do not prove runtime behavior or visual correctness. Review also protects product authority: a material product fact that conflicts with, exceeds, or is not grounded in available developer or Product Context authority is a focused blocking finding, even when the implementation is technically successful; route correction through existing REWORK. Do not treat Plan approval alone as authority for such a fact. If material evidence is failed, contradictory, or absent when verification is reasonably possible, do not treat the criterion as satisfied; record a focused blocking finding and route corrective work through REWORK. Confirm outcome acceptance criteria separately from technical validation. Persist exactly one outcome: PASS or REWORK. Narrative review is not an outcome.

Classify findings as critical, high, medium, or low. Critical/high require REWORK; medium requires REWORK unless explicitly accepted as durable residual risk; low is residual. A tree that cannot produce a trustworthy PASS fingerprint is also a blocking finding. REWORK remains in the same Work: show blockers and the persisted remediation proposal's objective, approach, expected touchpoints, acceptance criteria, and validation, then await approval. Do not recommend `approve` before this compact preview has been presented. The original Work Plan need not be repeated.

For a developer-facing REWORK response, present this compact hierarchy:

```text
## REWORK
Work: WORK-###
Outcome: REWORK

### Findings
Severity: <severity>
Issue: <concise issue>
Why it blocks PASS: <blocking rationale>
Evidence: <relevant persisted Review evidence or finding evidence>
Affected Work-level acceptance criterion: <criterion or approved outcome boundary>
Medium residual-risk decision: <why this medium finding is not accepted as durable residual risk, when applicable>

### Remediation proposal
Task: <persisted remediation Task title>
Objective: <persisted objective>
Implementation approach: <persisted approach>
Expected touchpoints: <persisted touchpoints, when available>
Acceptance criteria: <persisted Task criteria>
Validation: <persisted Task validation>

### Scope continuity
<State whether the persisted remediation remains within the approved Work boundary. If that cannot be established or a material authority change exists, state that ordinary REWORK approval is not sufficient.>

Recommended next action: approve
```

After session recovery, reconstruct this preview only from the persisted Work boundary, latest Review outcome/findings/validation evidence, and persisted remediation proposal exposed by `nerv work show WORK-###`, `nerv work status WORK-###`, or derived active context. Do not rely on conversation history or invent rationale, evidence, acceptance criteria, or scope facts that durable state does not establish. Keep the original Plan omitted unless a specific durable field is needed to explain the affected boundary. A REWORK response has exactly one final handoff: `Recommended next action: approve`; never recommend Task execution.

PASS saves the reviewed-tree fingerprint only after the material approved outcome has been demonstrated with relevant evidence. Show residual low findings and accepted medium risks. Optional local or user verification may occur before Close only as additional developer inspection, never as a substitute for evidence required by Review; remote CI, push, deployment, and provider access are outside this lifecycle. Supplied verification evidence can later require REWORK.

Close requires PASS, validation evidence, and the developer's request. Before Close, inspect authoritative Repo Context for a repository commit convention. When it defines one, the agent must construct a compliant explicit subject and invoke the canonical `nerv close WORK-### --message <subject>` form rather than silently using the Work title; for this repository, valid Conventional Commit subjects include `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`, `refactor: ...`, `chore: ...`, `ci: ...`, and `build: ...`. When no authoritative convention exists, the generic runtime may continue using the Work title by default; Nerv does not impose Conventional Commits globally. It commits only the exact reviewed attributable tree, preserves unrelated changes, and never stages indiscriminately. One Work normally produces one reviewed atomic commit; a verified no-diff result closes without an empty commit.

## Guardrails

- Do not materialize Work or remediation before explicit approval.
- Do not add standalone Task governance, Runs, Builds, Intake, Proposal, Task Review, or Task Close.
- Keep active Markdown temporary and minimal; SQLite is operational truth.
- Keep Product and Repo Context compact current truth, not history or general-purpose memory.

## Response Presentation

Use a consistent semantic Markdown hierarchy for every developer-facing Nerv response: Plan, materialization, execution handoff, PASS, REWORK, remediation, verification handoff, and Close. Follow the user's language for human-facing Plans, clarification questions, findings, explanations, Review summaries, remediation proposals, and handoffs when practical; English and Spanish are supported initially. Keep commands, command arguments, IDs, lifecycle outcomes, and technical literals canonical, including `nerv work materialize --plan <json>`, `nerv work materialize-rework WORK-###`, `nerv review WORK-###`, `nerv close WORK-###`, `WORK-###`, `Task`, `PASS`, and `REWORK`. Use a heading for the lifecycle stage or major response block, subordinate headings for Tasks, findings, or remediation Tasks, and bold labels for relevant metadata such as Goal, Scope, Objective, Outcome, Evidence, Acceptance criteria, Validation, or Result. Use inline code for commands, paths, Work references, IDs, and technical literals. Use lists for findings, touchpoints, acceptance criteria, or artifacts when they improve scanning. Keep responses compact and omit irrelevant sections. Meaning must remain clear without relying on host-specific colors, themes, or rendering behavior.
