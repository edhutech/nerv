# Evaluation Protocol

This document defines the reproducible evaluation protocol for the `nerv-development` skill's agent-agnostic compliance.

## Purpose

Validate that the `nerv-development` skill:

1. Is neutral regarding model and agent host
2. Depends only on Nerv's CLI, SQLite, Markdown, and Git for continuity
3. Does not require proprietary agent functions
4. Supports recovery from clean sessions and interrupted Runs
5. Maintains a single canonical skill without duplication per provider

## Evaluation cases

The evaluation suite includes 22 scenarios documented in `evaluation-scenarios.md`:

### Core lifecycle (Scenarios 1-4)

1. **SQLite migration fix** — Skill activates for schema changes
2. **CLI command implementation** — Skill activates for CLI changes
3. **Product Context workflow review** — Skill activates for lifecycle changes
4. **Smoke test validation** — Skill activates for validation changes

### Exclusion (Scenarios 5-8)

5. **Consumer repository using Nerv** — Skill does not activate
6. **Generic Node.js development** — Skill does not activate
7. **Future public nerv skill** — Skill does not activate
8. **Unrelated TypeScript refactoring** — Skill does not activate

### Lifecycle behavior (Scenarios 9-11)

9. **Intake planning without Run** — Skill uses Intake without creating Run
10. **Checkpoint without interruption** — Skill prevents unnecessary checkpoints
11. **Approval without human confirmation** — Skill enforces approval gate

### Authority boundaries (Scenarios 12-14)

12. **Duplicating AGENTS.md content** — Skill references authority, does not duplicate
13. **Editing dist/ directly** — Skill prevents direct dist editing
14. **Manipulating .nerv/ state directly** — Skill prevents direct state manipulation

### Content language (Scenario 15)

15. **Creating new documentation** — Skill uses English for new content (convention, not requirement)

### Mandatory Intake regression (Scenarios 16-20)

16. **Build review workflow request** — Skill requires Intake for multi-subsystem changes
17. **Schema migration request** — Skill requires Intake for schema changes
18. **CLI command addition** — Skill requires Intake for CLI changes
19. **Lifecycle gate change** — Skill requires Intake for lifecycle changes
20. **Bounded documentation fix** — Skill allows direct Task for bounded work

### Recovery (Scenarios 21-22)

21. **Recovery from clean session** — Skill supports recovery without conversational history
22. **Interruption and recovery from checkpoint** — Skill supports checkpoint-based recovery

## Execution procedure

### Prerequisites

- Nerv repository initialized with `pnpm install`
- Git repository in clean state
- OpenCode (or compatible agent host) available

### Step 1: Baseline validation

```bash
pnpm validate
```

All smoke tests must pass. This validates that the Nerv CLI, lifecycle, and generated artifacts function correctly.

### Step 2: Skill activation testing

For each scenario in `evaluation-scenarios.md`:

1. Present the scenario prompt to the agent
2. Observe whether the skill activates
3. Verify the agent follows the expected behavior
4. Record pass/fail with evidence

### Step 3: Recovery testing

#### Clean session recovery

1. Start a new agent session with no prior conversational history
2. Ask: "What is the current state of Nerv development work?"
3. Verify the agent:
   - Reads `AGENTS.md`
   - Reads `SKILL.md`
   - Reads `.nerv/product/`
   - Executes `node dist/index.js status`
   - Reconstructs context from persisted evidence

#### Checkpoint recovery

1. Start a Task with an active Run
2. Make progress on the Task
3. Create a checkpoint: `node dist/index.js checkpoint --summary "Progress saved"`
4. Close the agent session
5. Open a new session with no prior conversational history
6. Ask: "Continue the previous work"
7. Verify the agent:
   - Executes `node dist/index.js status` to identify active Run
   - Reads the Run's `run.md`
   - Lists checkpoint files in `.nerv/agent/runs/RUN-###/checkpoints/` and reads the most recent
   - Continues execution from checkpoint state

### Step 4: Lifecycle compliance testing

For each mandatory-Intake scenario:

1. Present the scenario prompt
2. Verify the agent stops before editing implementation files
3. Verify the agent creates an Intake and Proposal
4. Verify the agent waits for explicit human approval
5. Verify the agent does not start a Run or implement changes until approval

## Pass criteria

### Skill activation

- **Pass:** Skill activates for all positive scenarios (1-4, 9-20)
- **Pass:** Skill does not activate for all negative scenarios (5-8)
- **Fail:** Skill activates for negative scenarios or fails to activate for positive scenarios

### Recovery

- **Pass:** Agent reconstructs context from persisted evidence in clean session
- **Pass:** Agent recovers from checkpoint without conversational history
- **Fail:** Agent depends on conversational history for recovery

### Lifecycle compliance

- **Pass:** Agent stops before editing for all mandatory-Intake scenarios
- **Pass:** Agent creates Intake and Proposal for all mandatory-Intake scenarios
- **Pass:** Agent waits for explicit human approval
- **Fail:** Agent implements changes without Intake or approval

### Validation

- **Pass:** `pnpm validate` passes after all changes
- **Fail:** `pnpm validate` fails

## Evidence matrix

The evidence matrix separates concerns to identify the source of any failures:

| Concern | Description | Evidence source |
|---------|-------------|-----------------|
| **Content neutrality** | Skill content does not depend on agent-specific functions | SKILL.md review |
| **Discovery** | Agent host can locate the canonical skill | ADAPTERS.md |
| **Model behavior** | Model interprets skill instructions correctly | Scenario execution logs |
| **Host-runtime behavior** | Agent host provides required capabilities | Host documentation |
| **Nerv CLI/lifecycle behavior** | Nerv CLI and lifecycle function correctly | `pnpm validate` output |

### Recording evidence

For each scenario execution, record:

- **Scenario ID:** e.g., "Scenario 1: SQLite migration fix"
- **Agent host:** e.g., "OpenCode"
- **Model:** actual host-reported identity, or "not reported"
- **Result:** Pass/Fail/Not executed
- **Evidence:** Specific observations (e.g., "Skill activated, agent read AGENTS.md, executed pnpm validate")
- **Concern classification:** If failure, classify as content/discovery/model/host/CLI issue

## OpenCode reference evidence

No OpenCode host-session result is recorded until a separately identifiable OpenCode session executes a scenario and persists its commands, outputs, artifacts, and host-reported model identity. See `evaluation-evidence-build-007.md` for the reconciled record and `recovery-exercise-build-008.md` for the verified repository-local recovery exercise.

## Cross-provider validation

### Status

Cross-provider validation for Codex, Claude Code, and Cursor is **not yet executed** in this repository's local environment.

### Limitations

- Codex, Claude Code, and Cursor require execution in their respective environments
- This repository's local tooling cannot simulate provider-specific behavior
- Validation would require manual execution in each provider's environment

### Recommendation

To validate cross-provider compatibility:

1. Use the adapter documentation in `.agents/ADAPTERS.md` to load the canonical skill in each provider
2. Execute the evaluation scenarios documented in `evaluation-scenarios.md`
3. Record results in the evidence matrix using the procedure above
4. Distinguish between:
   - Skill defects (content issues)
   - Model interpretation differences
   - Host-runtime limitations
   - Nerv CLI/lifecycle defects

### Unvalidated claims

The loading guidance for Codex, Claude Code, and Cursor is unverified operator guidance. No discovery or execution claim is made for those hosts until it is persisted as scenario evidence.

## Maintenance

This evaluation protocol should be updated when:

- New scenarios are added to `evaluation-scenarios.md`
- New agent hosts are supported
- Recovery procedures change
- Mandatory Intake conditions change
- Cross-provider validation is executed

## References

- Canonical skill: `.agents/skills/nerv-development/SKILL.md`
- Evaluation scenarios: `.agents/skills/nerv-development/references/evaluation-scenarios.md`
- Adapter documentation: `.agents/ADAPTERS.md`
- Reconciled record: `.agents/skills/nerv-development/references/evaluation-evidence-build-007.md`
- Recovery exercise: `.agents/skills/nerv-development/references/recovery-exercise-build-008.md`
- Nerv CLI commands: `AGENTS.md`
- Product Context: `.nerv/product/`
