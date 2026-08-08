# Nerv vNext Design

**Status:** Approved design baseline  
**Purpose:** Authoritative implementation guide for the Nerv vNext core replacement  
**Language:** English  
**Audience:** Coding agents and developers working on the Nerv repository

---

## 1. Product Definition

Nerv is a **local-first Agent Work Harness** for developers who build software with coding agents.

Nerv does not replace coding agents and does not need to launch or control them.

Nerv prepares, persists, retrieves, and governs the minimum useful context and work state required for agents to execute software work reliably.

### Core product principle

> **Less context, better chosen.**

Nerv should reduce friction, not add process.

Every entity, state, Markdown file, command, database table, and prompt must justify its existence by improving execution quality, recoverability, determinism, or review quality.

---

## 2. vNext Goals

The vNext core must:

1. Replace the current overgrown lifecycle with a small, coherent lifecycle.
2. Make the **Work Item** the primary governed unit.
3. Keep **Tasks** as execution units inside a Work Item.
4. Remove standalone Task lifecycle behavior.
5. Remove Runs as a core entity.
6. Remove formal Task Review and Task Close ceremonies.
7. Remove Intake and Proposal from the normal development lifecycle.
8. Keep human approval where reasoning produces a plan.
9. Use strong reasoning models only where reasoning materially improves quality.
10. Allow cheaper execution models to implement already-defined Tasks.
11. Preserve state across sessions without depending on conversation memory.
12. Keep SQLite as the durable source of truth.
13. Minimize generated Markdown.
14. Keep Product Context and Repo Context as canonical long-lived context.
15. Add small, searchable durable knowledge instead of growing historical Markdown.
16. Make Git close safe, deterministic, and atomic by default.
17. Remain agent-agnostic.

---

## 3. Core Terminology

### 3.1 Intent

An **Intent** is the developer's natural-language request.

Intent is input to planning. It is not a durable lifecycle entity by itself.

Example:

```text
Add durable knowledge retrieval for future agent sessions.
```

### 3.2 Work Item

A **Work Item** is the primary unit of governed agentic work in Nerv.

Formal ID:

```text
WORK-017
```

A Work Item represents one coherent, independently reviewable outcome.

A Work Item may contain one or many Tasks.

```text
WORK-017
├── TASK-061
├── TASK-062
└── TASK-063
```

A small change may legitimately be:

```text
WORK-018
└── TASK-064
```

Do not create a separate standalone Task lifecycle for small work.

> A Work Item is the coherent unit of agentic work that Nerv plans, governs, reviews, and closes.

### 3.3 Task

A **Task** is an execution unit inside a Work Item.

Tasks exist to make implementation bounded and executable.

A Task may include code changes, targeted validation, and local technical reasoning.

Tasks are not independent governed outcomes.

> A Task is a bounded implementation unit inside a Work Item.

### 3.4 Work Review

A **Work Review** is the reasoning-heavy integrated evaluation of a Work Item.

It is not a technical test command and it is not a collection of formal Task reviews.

A Work Review evaluates the actual integrated result against:

- the original goal,
- acceptance criteria,
- Product Context,
- Repo Context,
- implementation results,
- Git diff,
- validation evidence,
- integration quality,
- regressions,
- risks.

### 3.5 Checkpoint

A **Checkpoint** is an exceptional recovery snapshot used only when execution must genuinely be interrupted.

It is not part of the normal happy path.

### 3.6 Knowledge

**Knowledge** is small, durable, searchable information discovered during work that may be useful in future work.

Examples:

- architecture constraints,
- recurring implementation patterns,
- important discoveries,
- technical decisions,
- non-obvious repository behavior.

Knowledge is not a giant historical document.

---

## 4. Canonical Lifecycle

The normal lifecycle is:

```text
INTENT
  ↓
PLAN — strong reasoning model
  ↓
1..N Work Items proposed on screen
  ↓
HUMAN APPROVAL
  ↓
Materialize approved Work Item plan
  ↓
EXECUTE — execution model
  ↓
Task → implement → targeted validate → done
Task → implement → targeted validate → done
...
  ↓
FULL VALIDATION
  ↓
WORK REVIEW — strong reasoning model
  ↓
PASS ───────────────→ CLOSE
  │
  └─ REWORK
       ↓
     findings
       ↓
     proposed remediation Tasks
       ↓
     HUMAN APPROVAL
       ↓
     add Tasks to SAME Work Item
       ↓
     EXECUTE
       ↓
     REVIEW again
```

The three reasoning-heavy moments are:

1. **Plan**
2. **Replan when necessary**
3. **Work Review**

Execution should not repeatedly re-plan already approved work.

---

## 5. Work Item States

The canonical Work Item states are:

```text
planned
active
review
rework
closed
```

### `planned`

The Work Item is durable and identified at a high level, but its implementation Tasks may not yet be fully planned.

This state is especially important for future Work Items discovered during multi-Work planning.

### `active`

The Work Item has approved executable Tasks and is being implemented.

### `review`

Execution and validation are complete enough for integrated Work Review.

### `rework`

The latest Work Review found problems that must be corrected before close.

The same Work Item remains open.

### `closed`

The Work Item passed review, Git close completed successfully, and no further lifecycle operation is required.

Do not add extra states unless they change what operation is allowed.

---

## 6. Task States

The canonical Task states are:

```text
pending
active
done
blocked
```

### `pending`

Approved but not yet executed.

### `active`

Currently being implemented.

### `done`

Implementation is complete and targeted Task validation passed.

### `blocked`

Execution cannot continue safely without new reasoning, clarification, or replanning.

A blocked Task must stop execution.

The execution model must not invent a substantial new plan to escape a genuine block.

---

## 7. Planning

### 7.1 Planning an Intent

Canonical agent-facing invocation:

```text
nerv-dev plan "<intent>"
```

Planning is performed by a strong reasoning model.

The planner must determine the **minimum necessary number of coherent Work Items**.

Possible result:

```text
WORK-017  Durable knowledge storage
WORK-018  Context-aware knowledge retrieval
WORK-019  Knowledge-aware planning integration
```

### Planning rule

If multiple Work Items are required:

- define all Work Items at high level,
- define dependencies between them,
- fully detail Tasks only for the first/next Work Item,
- do not prematurely detail Tasks for later Work Items.

The goal is to avoid obsolete future planning.

### 7.2 Planning a Previously Identified Work Item

Canonical invocation:

```text
nerv-dev plan WORK-018
```

This operation:

1. loads the high-level durable Work Item,
2. inspects the current repository state,
3. considers the actual outcomes of prior Work Items,
4. retrieves relevant Product Context, Repo Context, and Knowledge,
5. proposes detailed Tasks for the Work Item,
6. waits for human approval before materializing the new Task plan.

### 7.3 Planning Persistence

Planning discussion is not persisted as a chain of Intake and Proposal Markdown files.

Before approval:

```text
plan
→ show proposal
→ discuss/edit in conversation
```

After approval:

```text
approved plan
→ materialize durable Work Item + Tasks
```

No normal lifecycle entity named Intake or Proposal is required.

---

## 8. Approval

Canonical invocation:

```text
nerv-dev approve WORK-017
```

Use the same approval operation for:

- initial Work Item planning,
- later detailed planning of a `planned` Work Item,
- remediation Tasks proposed after Work Review.

Do not create specialized commands such as:

```text
approve-fix
approve-remediation
apply-proposal
```

Approval must remain conceptually simple.

---

## 9. Execution

Canonical invocation:

```text
nerv-dev execute WORK-017
```

Execution is intended for a cheaper execution-focused model when appropriate.

Normal behavior:

```text
for each pending Task:
    set active
    implement
    run targeted validation
    set done

run full Work Item validation
move Work Item to review
```

### Execution rules

- Do not stop for human approval between normal Tasks.
- Do not create a Run.
- Do not create a formal Task Review.
- Do not create a Task Close ceremony.
- Do not create a commit per Task.
- Do not require a Checkpoint after each Task.
- Do not re-plan unless a real block or newly discovered constraint requires it.

---

## 10. Blocked Execution

If execution cannot safely continue:

```text
TASK-063 → blocked
```

Stop Work Item execution.

Return concise evidence:

```text
Blocked: TASK-063
Reason: ...
Evidence: ...
Next: nerv-dev review WORK-017
```

A strong model can then diagnose the issue and propose a revised path.

The execution model should execute defined work.

The reasoning model should replan when new reasoning is necessary.

---

## 11. Validation vs Review

These are separate concepts.

### Validation

Validation is technical and as deterministic as possible.

Examples:

- build,
- typecheck,
- tests,
- smoke checks,
- targeted assertions,
- CLI execution checks.

Validation may be performed by the execution model.

### Review

Review is reasoning-heavy evaluation of whether the Work Item actually achieved its intended outcome correctly.

Review must inspect the integrated result.

Do not reduce Review to:

```text
tests passed
therefore review passed
```

---

## 12. Work Review

Canonical invocation:

```text
nerv-dev review WORK-017
```

A strong reasoning model performs the review.

Possible outcomes:

```text
PASS
REWORK
```

### PASS

The Work Item is eligible for Git-safe close.

```text
Next: nerv-dev close WORK-017
```

### REWORK

The review must return:

- findings,
- why each finding matters,
- minimum remediation required,
- proposed Tasks.

Example:

```text
REWORK

Findings:
1. Knowledge retrieval ignores repository scope.
2. Full validation did not cover stale observations.

Proposed Tasks:
- TASK-074 Add project-scoped retrieval.
- TASK-075 Add stale-observation regression coverage.

Waiting for approval.

Next: nerv-dev approve WORK-017
```

The proposed remediation Tasks are not durable until approved.

After approval, the Tasks are added to the **same Work Item**.

Do not create a new Work Item merely to repair the current Work Item.

Create a new Work Item only when the discovered work is a genuinely separate objective.

---

## 13. Review History

SQLite should preserve all Work Review attempts.

```text
WORK-017
Review 1 → REWORK
Review 2 → REWORK
Review 3 → PASS
```

The active context should expose only the information currently needed.

Historical Review detail should be queryable without being injected into every future prompt.

---

## 14. Status

Canonical invocation:

```text
nerv-dev status WORK-017
```

Status is read-only.

It does not create recovery state.

Example:

```text
WORK-017
State: rework
Latest review: REWORK
Pending remediation: awaiting approval
Next: nerv-dev approve WORK-017
```

The state machine must determine the correct next operation deterministically.

Commands should also return a deterministic `Next:` suggestion whenever possible.

Do not require the LLM to infer lifecycle state from scattered Markdown.

---

## 15. Checkpoint

Canonical invocation:

```text
nerv-dev checkpoint WORK-017
```

Checkpoint is exceptional.

Use it only when:

- the context window must end,
- the machine/session must stop,
- execution must be interrupted before a Task is complete,
- another genuine interruption makes recovery evidence necessary.

A Checkpoint should be associated with the Work Item and may record:

- active Task,
- concise progress summary,
- files touched,
- decisions made,
- unresolved issue,
- next implementation step.

Do not create a separate Checkpoint lifecycle.

---

## 16. Active Markdown

Nerv should generate **one temporary active Markdown file per active Work Item**.

Conceptual path:

```text
.nerv/agent/active/WORK-017.md
```

It may contain:

- Work Item ID and title,
- goal,
- current state,
- acceptance criteria,
- completed Tasks,
- pending Tasks,
- active Task,
- active Task scope,
- targeted validation,
- latest Review findings,
- latest Checkpoint summary if relevant,
- next operation.

Do not generate:

- per-Run directories,
- duplicated `task.md` copies,
- permanent Task Review Markdown,
- permanent Work summary Markdown for every operation.

On close, the temporary active Work Item Markdown may be removed.

SQLite remains the durable operational source of truth.

---

## 17. Durable Context and Knowledge

Nerv should distinguish three categories.

### Operational history

Stored in SQLite.

Examples:

- Work Item state,
- Tasks,
- Reviews,
- Checkpoints,
- commit association.

### Durable discovered knowledge

Stored as small searchable SQLite observations.

Suggested fields:

```text
id
type
title
content
work_item_id
topic_key        optional
created_at
updated_at
```

Useful types may include:

```text
decision
architecture
discovery
pattern
```

Do not add many categories without demonstrated value.

Knowledge should be searchable in SQLite.

SQLite FTS5 is preferred if it keeps the implementation simple and dependency-free.

### Canonical truth

Long-lived authoritative information belongs in:

```text
Product Context
Repo Context
```

A discovery should only be promoted to canonical context when it becomes a stable truth that future work should treat as authoritative.

---

## 18. Knowledge Retrieval

Do not inject all historical knowledge into every prompt.

Use progressive retrieval:

```text
search
↓
small ranked results
↓
load full observation only when relevant
```

Planning and Review should retrieve only relevant knowledge.

This is a core token-efficiency requirement.

Avoid giant files such as:

```text
discoveries.md
learnings.md
history.md
all-decisions-ever.md
```

---

## 19. Git Model

The default Git model is:

> **One Work Item = one reviewed atomic commit.**

Tasks do not create their own commit lifecycle.

Normal flow:

```text
execute Tasks
↓
validate
↓
Work Review
↓
rework if necessary
↓
PASS
↓
selective stage
↓
inspect staged diff
↓
commit
↓
close
```

---

## 20. Git-Safe Close

Canonical invocation:

```text
nerv-dev close WORK-017
```

Close must:

1. verify the latest Work Review is `PASS`,
2. verify required validation passed,
3. inspect Git working state,
4. identify Work Item-owned changes,
5. stage only intended changes,
6. inspect the staged diff,
7. block if unrelated changes cannot be distinguished safely,
8. create the final commit,
9. record the commit hash,
10. mark the Work Item closed,
11. remove temporary active context when appropriate.

### Safety rule

Never blindly do:

```bash
git add -A
```

when unrelated working-tree changes may exist.

If Nerv cannot identify safe staging boundaries:

```text
BLOCK
```

Do not guess.

---

## 21. Commit Convention

Public Nerv must respect the repository's existing commit convention.

Nerv should not force Conventional Commits on every repository.

For machine traceability, Nerv may add a Git trailer:

```text
Nerv-Work: WORK-017
```

Example:

```text
refactor(lifecycle): replace run-scoped execution

Remove the redundant Run lifecycle and execute Tasks directly
inside the governing Work Item.

Nerv-Work: WORK-017
```

The exact subject/body style should follow the repository convention.

---

## 22. Parallel Work

Parallel Work Items do not require mandatory branches or worktrees in the initial vNext implementation.

Default:

```text
single developer
sequential Work Items
normal working tree
```

Future true concurrency may use:

```text
one branch/worktree per active Work Item
```

Do not introduce mandatory worktree complexity before it is needed.

---

## 23. Agent-Facing Protocol

The canonical semantics for Nerv development are exact plain-text operations:

```text
nerv-dev plan "<intent>"
nerv-dev plan WORK-018
nerv-dev approve WORK-017
nerv-dev execute WORK-017
nerv-dev status WORK-017
nerv-dev review WORK-017
nerv-dev close WORK-017
nerv-dev checkpoint WORK-017
```

### Important boundary

`nerv-dev` is the developer-facing protocol/interface for developing Nerv itself.

It must **not** become:

- a second lifecycle,
- a second database,
- a second engine,
- a host-specific orchestration layer,
- a tool that must launch or control coding agents.

The runtime core remains Nerv.

The `nerv-development` skill may interpret exact `nerv-dev ...` text and use deterministic Nerv operations underneath.

A thin executable/facade may exist later if useful, but the design must not depend on it.

---

## 24. Public Nerv vs Nerv Development

Public Nerv and Nerv Development share the same conceptual core:

```text
Work Item
Task
Work Review
Checkpoint
Knowledge
Close
```

`nerv-development` adds Nerv-repository-specific knowledge such as:

- `pnpm validate`,
- Nerv architecture constraints,
- Nerv SQLite rules,
- Nerv CLI validation,
- repository-specific review expectations.

It must not redefine the lifecycle.

---

## 25. Core Replacement Strategy

This is **not a compatibility migration**.

There is no requirement to preserve the old lifecycle or convert historical Builds, Runs, Intakes, Proposals, Task Reviews, or closure matrices.

Git history is the historical backup.

Implementation strategy:

```text
REPLACE
↓
PROVE
↓
CUT OVER
↓
DELETE LEGACY
```

### Principle

Build the new vertical core cleanly, prove it end-to-end, switch the runtime to it, then remove the old lifecycle completely.

Do not gradually mutate the old lifecycle until it resembles vNext.

---

## 26. Infrastructure to Keep

Preserve and reuse good infrastructure where it remains conceptually valid.

### Keep

- Node.js
- TypeScript
- ESM
- Commander
- better-sqlite3
- SQLite WAL
- SQLite foreign keys
- local-first `.nerv/` workspace
- repository root detection
- metadata helpers
- sequential ID pattern
- Repo Context capability
- Product Context capability
- Git awareness
- agent-agnostic architecture
- `pnpm validate` as the top-level verification concept

Reuse implementation only when it remains simpler than replacing it.

Do not preserve code merely because it already exists.

---

## 27. Core Areas to Rewrite

### `src/database.ts`

Rewrite around a fresh vNext schema.

Do not maintain schema-13 compatibility.

Do not carry old additive migrations for a demo-stage lifecycle that is intentionally being removed.

### `src/repository.ts`

Rewrite the repository contract so it exposes only vNext concepts.

Do not rename old Build/Run methods and leave the old model underneath.

### `src/index.ts`

Rewrite the lifecycle CLI surface.

Do not keep old lifecycle branches hidden behind compatibility code.

### Task / Work implementation

Replace current standalone-Task and Build planning behavior with Work Item + Task semantics.

---

## 28. Legacy Areas to Remove

The final vNext codebase should not contain runtime dependencies on:

```text
Build as a lifecycle entity
Standalone Task lifecycle
Run
Task Review
Task Close
Intake
Proposal
Build audit classifications
Closure matrix
Outcome matrix
Run-scoped close records
```

Files dedicated purely to those concepts should be deleted rather than kept as dead compatibility code.

Examples include the current Run implementation and Intake lifecycle implementation.

---

## 29. Fresh SQLite Schema

The vNext schema should be designed from first principles.

A minimal conceptual schema is:

```text
metadata
work_items
tasks
work_reviews
checkpoints
knowledge
```

Additional tables are allowed only when a preserved Product Context or Repo Context capability genuinely requires them.

### Work Items

Must support at least:

```text
id
title
status
intent
goal
scope
acceptance_criteria
validation
created_at
updated_at
closed_at
commit_hash
```

Exact normalization may vary if it improves simplicity.

### Tasks

Must belong to a Work Item.

No nullable standalone parent.

Suggested minimum:

```text
id
work_item_id
title
status
scope
acceptance_criteria
validation
created_at
updated_at
```

### Work Reviews

Suggested minimum:

```text
id
work_item_id
outcome
summary
findings
validation_evidence
created_at
```

### Checkpoints

Associate with Work Item and optionally Task.

### Knowledge

Small searchable observations as defined earlier.

---

## 30. Workspace Shape

The generated operational workspace should become substantially smaller.

Conceptually:

```text
.nerv/
├── nerv.db
├── product/
├── repo/
└── agent/
    └── active/
        └── WORK-017.md
```

Avoid rebuilding:

```text
agent/runs/
agent/builds/
agent/tasks/
agent/intakes/
```

unless a future demonstrated requirement justifies them.

---

## 31. Product Context and Repo Context

Product Context and Repo Context remain important capabilities.

They should not be deleted merely because the operational lifecycle is being replaced.

However:

- remove lifecycle coupling that exists only for the old model,
- do not force Product Context through the old Intake/Proposal lifecycle,
- preserve canonical product/repository knowledge,
- keep them independently useful to planning and review.

If existing Product Context implementation is overly coupled to old proposal/session machinery, simplify it without losing the canonical context capability.

---

## 32. Legacy Repository Documentation

The tracked `agent-workspace/` was a temporary manual system used to build Nerv before the CLI existed.

It must not remain an authoritative competing lifecycle after vNext.

Before deletion:

1. extract any still-valid product truth,
2. extract any still-valid repository constraints,
3. move those truths to the appropriate canonical documentation,
4. delete obsolete lifecycle planning/build/task/run/method history.

Do not keep large historical lifecycle documentation that may confuse future agents.

Git already preserves history.

---

## 33. `nerv-development` Skill

Rewrite `.agents/skills/nerv-development/SKILL.md` after the vNext runtime model is implemented.

The skill should be concise.

It should:

- point to authoritative product/repo context,
- define the `nerv-dev` protocol,
- explain model-role separation,
- explain Work Item / Task / Review,
- explain exceptional Checkpoint behavior,
- explain Git-safe Close,
- remain agent-agnostic.

It must not preserve:

```text
Intake → Task → Run → Review → Close
```

or any old mandatory-Intake rules.

---

## 34. Validation Suite Replacement

The existing smoke suite should not be preserved merely to keep old behavior passing.

Replace lifecycle-specific tests with vNext tests.

Minimum required coverage:

### Initialization

- fresh Git repository,
- `nerv init`,
- correct fresh schema,
- idempotent initialization.

### Work planning/materialization

- one Work Item,
- multiple Work Items,
- future `planned` Work Item,
- Task materialization only after approval.

### Execution

- sequential Task execution,
- targeted validation,
- full validation,
- Task `blocked` behavior.

### Review

- PASS,
- REWORK,
- remediation Tasks inside the same Work Item,
- repeated Reviews,
- latest Review controls close eligibility.

### Recovery

- `status` from a clean session,
- exceptional Checkpoint,
- resume using persisted state without conversation memory.

### Knowledge

- store durable observation,
- search relevant observations,
- retrieve only relevant full content,
- preserve Product/Repo Context separation.

### Git

- safe clean close,
- one atomic commit per Work Item by default,
- commit hash persistence,
- unrelated dirty changes block unsafe close,
- no blind global staging.

### Cleanup

- active Work Markdown removal after close,
- no Run/Build/Intake artifact generation.

---

## 35. Final Replacement Gate

Before the vNext replacement is considered complete, perform all of the following:

```text
1. pnpm install
2. pnpm build
3. pnpm typecheck
4. fresh repository initialization
5. complete Work Item happy-path E2E
6. REWORK E2E
7. blocked Task E2E
8. checkpoint/resume E2E
9. knowledge retrieval E2E
10. Git-safe close E2E
11. search for legacy runtime concepts
12. strong-model architectural review
```

The final repository search should confirm there are no unintended runtime references to:

```text
Run
Agentic Build
standalone Task
Task Review
Task Close
Intake
Proposal
closure matrix
outcome matrix
```

Historical references are acceptable only when explicitly retained for documentation value, and they must not be authoritative.

---

## 36. Suggested Replacement Work

The replacement itself should be governed as one coherent Work Item if practical.

Example:

```text
WORK-001  Replace Nerv core with vNext
```

Possible implementation Tasks:

```text
TASK-001  Define fresh vNext schema and repository contracts
TASK-002  Implement Work Item and Task persistence
TASK-003  Implement lifecycle state transitions and active context
TASK-004  Implement Work Review, Rework, Checkpoint, and Knowledge
TASK-005  Implement Git-safe Close
TASK-006  Replace CLI lifecycle surface
TASK-007  Replace smoke/E2E lifecycle coverage
TASK-008  Remove legacy runtime and generated artifacts
TASK-009  Rewrite nerv-development skill and authoritative docs
```

These Tasks are an implementation starting point, not a substitute for planning against the actual repository state.

The planning model may refine or regroup them before approval.

---

## 37. Non-Goals

Do not add the following to vNext unless separately approved:

- cloud sync,
- team collaboration,
- mandatory branches,
- mandatory worktrees,
- agent hosting,
- agent routing,
- model orchestration inside Nerv,
- webhook automation,
- complex memory conflict resolution,
- a large permanent discovery log,
- backwards compatibility with the current demo lifecycle,
- conversion of historical lifecycle records,
- multiple overlapping lifecycle abstractions.

---

## 38. Design Invariants

1. Every normal unit of governed development work is a Work Item.
2. Every Task belongs to a Work Item.
3. There is no Run entity.
4. There is no standalone Task lifecycle.
5. Task completion requires implementation + targeted validation, not a formal Task Review.
6. Integrated Work Review is performed at Work Item level.
7. Review failure produces remediation Tasks inside the same Work Item.
8. Checkpoint is exceptional.
9. SQLite is the durable operational source of truth.
10. Generated Markdown is minimal and temporary.
11. Historical knowledge is retrieved progressively, not dumped into prompts.
12. Product Context and Repo Context remain canonical long-lived context.
13. Close is Git-safe and never blindly stages unrelated work.
14. One Work Item produces one atomic reviewed commit by default.
15. Nerv does not depend on conversation memory.
16. Nerv remains agent-agnostic.
17. Nerv should prefer fewer concepts over additional ceremony.

---

## 39. Implementation Guidance for the Agent

Before changing code:

1. Read this document completely.
2. Read `AGENTS.md`.
3. Inspect current `src/`, scripts, Product Context, Repo Context, and Git state.
4. Treat the current lifecycle implementation as replaceable, not authoritative.
5. Identify reusable infrastructure versus lifecycle-coupled code.
6. Propose the final Work Item / Task implementation plan.
7. Wait for human approval before executing the replacement.

During implementation:

- do not preserve old lifecycle behavior for compatibility,
- do not layer vNext on top of the old lifecycle,
- do not create duplicate engines,
- do not edit generated `dist/` directly,
- keep the replacement vertically testable,
- delete obsolete code once vNext behavior is proven,
- keep the final repository smaller and easier to reason about than the current one.

The success criterion is not:

> The old Nerv still works plus vNext also works.

The success criterion is:

> **There is one Nerv, and its core is the vNext model defined here.**
