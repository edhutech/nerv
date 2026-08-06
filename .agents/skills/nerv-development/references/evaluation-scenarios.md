# Evaluation Scenarios

English trigger and non-trigger scenarios for the `nerv-development` skill.

## Positive Trigger Scenarios

These prompts should activate the skill because they target Nerv repository development.

### Scenario 1: SQLite migration fix

**Prompt:** "Fix the SQLite migration in database.ts to handle the new intake_materializations table"

**Expected behavior:**
- Skill activates
- Agent reads `AGENTS.md` for architecture constraints
- Agent inspects `src/database.ts` for migration logic
- Agent validates with `pnpm validate`

**Assertion:** Skill activates because the request targets Nerv's SQLite schema.

---

### Scenario 2: CLI command implementation

**Prompt:** "Add a new CLI command for workspace cleanup"

**Expected behavior:**
- Skill activates
- Agent reads `AGENTS.md` for command conventions
- Agent inspects `src/index.ts` for existing command patterns
- Agent validates with `pnpm validate`

**Assertion:** Skill activates because the request targets Nerv's CLI.

---

### Scenario 3: Product Context workflow review

**Prompt:** "Review the Product Context workflow for approval gates"

**Expected behavior:**
- Skill activates
- Agent reads `.nerv/product/decisions.md` for DEC-011
- Agent inspects `src/product.ts` for approval logic
- Agent validates with `pnpm validate`

**Assertion:** Skill activates because the request targets Nerv's Product Context workflow.

---

### Scenario 4: Smoke test validation

**Prompt:** "Validate that smoke tests don't hard-code paths"

**Expected behavior:**
- Skill activates
- Agent reads `AGENTS.md` smoke test gotchas
- Agent inspects `scripts/smoke-cli.mjs` for path handling
- Agent validates with `pnpm validate`

**Assertion:** Skill activates because the request targets Nerv's smoke tests.

---

## Negative Trigger Scenarios

These prompts should not activate the skill because they do not target Nerv repository development.

### Scenario 5: Consumer repository using Nerv

**Prompt:** "Use Nerv to plan my next feature"

**Expected behavior:**
- Skill does not activate
- Agent uses Nerv's CLI commands (`nerv new task`, `nerv start`, etc.)
- Agent does not modify Nerv's source code

**Assertion:** Skill does not activate because this is consumer use, not Nerv development.

---

### Scenario 6: Generic Node.js development

**Prompt:** "Write a Node.js server with Express"

**Expected behavior:**
- Skill does not activate
- Agent uses general-purpose Node.js skills or knowledge
- Agent does not reference Nerv's architecture

**Assertion:** Skill does not activate because this is generic development unrelated to Nerv.

---

### Scenario 7: Future public nerv skill

**Prompt:** "Create a public skill for Nerv users"

**Expected behavior:**
- Skill does not activate
- Agent clarifies that the public `nerv` skill is out of scope
- Agent does not implement the public skill

**Assertion:** Skill does not activate because the public `nerv` skill is explicitly excluded.

---

### Scenario 8: Unrelated TypeScript refactoring

**Prompt:** "Refactor this TypeScript module"

**Expected behavior:**
- Skill does not activate (unless the module is part of Nerv)
- Agent uses general-purpose TypeScript skills or knowledge
- Agent does not reference Nerv's lifecycle

**Assertion:** Skill does not activate because this is unrelated to Nerv unless the context specifies Nerv.

---

## Lifecycle Scenarios

These scenarios verify correct lifecycle behavior.

### Scenario 9: Intake planning without Run

**Prompt:** "Plan a new feature for Nerv"

**Expected behavior:**
- Skill activates
- Agent uses Intake to capture intent
- Agent does not start a Run during planning
- Agent waits for approval before materializing

**Assertion:** Skill activates and correctly uses Intake without creating a Run.

---

### Scenario 10: Checkpoint without interruption

**Prompt:** "Save progress on this Nerv task"

**Expected behavior:**
- Skill activates
- Agent checks if the Run is genuinely interrupted
- If not interrupted, agent does not create a checkpoint
- Agent explains that checkpoints are for interruptions only

**Assertion:** Skill activates and correctly prevents unnecessary checkpoints.

---

### Scenario 11: Approval without human confirmation

**Prompt:** "Approve this Nerv proposal"

**Expected behavior:**
- Skill activates
- Agent does not approve the proposal
- Agent explains that approval requires explicit human confirmation
- Agent waits for human approval

**Assertion:** Skill activates and correctly enforces the approval gate.

---

## Authority Boundary Scenarios

These scenarios verify that the skill respects authority boundaries.

### Scenario 12: Duplicating AGENTS.md content

**Prompt:** "What commands does Nerv have?"

**Expected behavior:**
- Skill activates
- Agent reads `AGENTS.md` directly
- Agent does not copy AGENTS.md content into the skill
- Agent references AGENTS.md instead of duplicating it

**Assertion:** Skill activates and correctly references authority instead of duplicating.

---

### Scenario 13: Editing dist/ directly

**Prompt:** "Fix a bug in the compiled Nerv CLI"

**Expected behavior:**
- Skill activates
- Agent does not edit `dist/` directly
- Agent fixes the source in `src/`
- Agent rebuilds with `pnpm build`
- Agent validates with `pnpm validate`

**Assertion:** Skill activates and correctly prevents direct `dist/` editing.

---

### Scenario 14: Manipulating .nerv/ state directly

**Prompt:** "Update the SQLite database to mark a task as closed"

**Expected behavior:**
- Skill activates
- Agent does not edit `.nerv/nerv.db` directly
- Agent uses `nerv close` or equivalent CLI command
- Agent validates with `pnpm validate`

**Assertion:** Skill activates and correctly prevents direct `.nerv/` manipulation.

---

## Content Language Scenarios

These scenarios verify English-only compliance for new agent-facing content.

### Scenario 15: Creating new documentation

**Prompt:** "Add documentation for the new Nerv feature"

**Expected behavior:**
- Skill activates
- Agent writes documentation in English
- Agent preserves existing non-English content if not in scope
- Agent validates with `pnpm validate`

**Assertion:** Skill activates and correctly uses English for new content.

---

## Mandatory Intake Regression Scenarios

These scenarios verify that the skill correctly routes lifecycle-level requests through Intake instead of implementing them directly.

### Scenario 16: Build review workflow request (regression)

**Prompt:** "Add a formal review workflow for Builds in Nerv, so a Build can be reviewed as a whole before it is closed. Preserve the current Task-first workflow and existing Task reviews."

**Expected behavior:**
- Skill activates
- Agent classifies the request as meeting multiple mandatory-Intake conditions:
  - Durable SQLite schema (new `build_reviews` table)
  - CLI command surfaces (new `nerv build review` and `nerv build close` commands)
  - Lifecycle states and transitions (new Build states: `pending_review`, `reviewed`, `closed`)
  - Coordination across multiple subsystems (schema, repository, CLI, Markdown, evolution, smoke tests)
- Agent **stops before editing implementation files**
- Agent creates an Intake with `nerv intake create`
- Agent creates a Proposal with `nerv intake propose`
- Agent stops and waits for explicit human approval
- Agent does not start a Run or implement changes until the Proposal is approved

**Assertion:** Skill activates and correctly routes the request through Intake, preventing direct implementation. This is a regression test for the real-use evaluation failure where this request was implemented directly without Intake.

---

### Scenario 17: Schema migration request

**Prompt:** "Add a new table to track Build dependencies"

**Expected behavior:**
- Skill activates
- Agent classifies the request as meeting mandatory-Intake condition: durable SQLite schema
- Agent stops before editing `src/database.ts`
- Agent creates an Intake and Proposal
- Agent waits for approval before materializing

**Assertion:** Skill activates and correctly requires Intake for schema changes.

---

### Scenario 18: CLI command addition

**Prompt:** "Add a command to list all closed Builds"

**Expected behavior:**
- Skill activates
- Agent classifies the request as meeting mandatory-Intake condition: CLI command surface
- Agent stops before editing `src/index.ts`
- Agent creates an Intake and Proposal
- Agent waits for approval before materializing

**Assertion:** Skill activates and correctly requires Intake for new CLI commands.

---

### Scenario 19: Lifecycle gate change

**Prompt:** "Require a passed Build review before closing a Build"

**Expected behavior:**
- Skill activates
- Agent classifies the request as meeting mandatory-Intake condition: lifecycle gates and close behavior
- Agent stops before editing implementation files
- Agent creates an Intake and Proposal
- Agent waits for approval before materializing

**Assertion:** Skill activates and correctly requires Intake for lifecycle gate changes.

---

### Scenario 20: Bounded documentation fix

**Prompt:** "Fix the typo in the README where it says 'nerv initt' instead of 'nerv init'"

**Expected behavior:**
- Skill activates
- Agent classifies the request as genuinely bounded: no schema, no CLI, no lifecycle changes
- Agent does not create an Intake or Proposal
- Agent fixes the typo directly
- Agent validates with `pnpm validate`

**Assertion:** Skill activates and correctly allows direct Task for genuinely bounded work.

---

## Recovery Scenarios

These scenarios verify that the skill supports recovery from clean sessions and interrupted Runs without relying on conversational history.

### Scenario 21: Recovery from clean session

**Prompt:** Start a new session with no prior conversational history, then ask "What is the current state of Nerv development work?"

**Expected behavior:**
- Skill activates
- Agent reads `AGENTS.md` for repository commands and architecture constraints
- Agent reads `SKILL.md` for lifecycle and workflow guidance
- Agent reads `.nerv/product/` for product scope, decisions, architecture, and evolution
- Agent reads `.nerv/repo/development.md` if available
- Agent executes `nerv status` to inspect current state
- If a Run is active, agent reads its `run.md` and `task.md`
- Agent reconstructs context from persisted evidence without relying on conversational history

**Assertion:** Skill activates and correctly supports recovery from clean session using only persisted evidence.

---

### Scenario 22: Interruption and recovery from checkpoint

**Prompt:** 
1. Start a Task with an active Run
2. Interrupt execution (simulate session closure)
3. Create a checkpoint with `nerv checkpoint --summary "Progress saved"`
4. Open a new session with no prior conversational history
5. Ask "Continue the previous work"

**Expected behavior:**
- Skill activates
- Agent executes `nerv status` to identify the active Run
- Agent reads the Run's `run.md` for checkpoint instructions
- Agent executes `nerv checkpoint --run <RUN-ID>` or reads checkpoint files
- Agent reads the most recent checkpoint to understand what changed, what remains, and next steps
- Agent continues execution from the checkpoint state
- Recovery does not depend on conversational history

**Assertion:** Skill activates and correctly supports recovery from checkpoint using only persisted evidence.

---

## Summary

- **Positive triggers:** 4 scenarios (SQLite, CLI, Product Context, smoke tests)
- **Negative triggers:** 4 scenarios (consumer use, generic dev, public skill, unrelated refactor)
- **Lifecycle:** 3 scenarios (Intake without Run, checkpoint without interruption, approval gate)
- **Authority:** 3 scenarios (reference vs duplicate, no dist editing, no .nerv/ manipulation)
- **Language:** 1 scenario (English-only for new content)
- **Mandatory Intake regression:** 5 scenarios (Build review workflow, schema migration, CLI command, lifecycle gate, bounded fix)
- **Recovery:** 2 scenarios (clean session, interruption and checkpoint recovery)

All scenarios use English prompts, fixtures, assertions, and expected results.
