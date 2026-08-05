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

## Summary

- **Positive triggers:** 4 scenarios (SQLite, CLI, Product Context, smoke tests)
- **Negative triggers:** 4 scenarios (consumer use, generic dev, public skill, unrelated refactor)
- **Lifecycle:** 3 scenarios (Intake without Run, checkpoint without interruption, approval gate)
- **Authority:** 3 scenarios (reference vs duplicate, no dist editing, no .nerv/ manipulation)
- **Language:** 1 scenario (English-only for new content)

All scenarios use English prompts, fixtures, assertions, and expected results.
