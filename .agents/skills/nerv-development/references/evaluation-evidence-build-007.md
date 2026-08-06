# Evaluation Evidence - BUILD-007 TASK-030

**Execution date:** 2026-08-06
**Agent host:** OpenCode
**Model:** qwen3.7-plus
**Repository state:** BUILD-007, TASK-030

## Execution environment

- Nerv repository initialized
- Git clean state before execution
- OpenCode CLI environment
- `nerv` binary not in PATH; used `node dist/index.js` for all CLI commands

## Scenario execution

### Scenario 1: SQLite migration fix (positive trigger)

**Prompt:** "Fix the SQLite migration in database.ts"

**Observed behavior:**
- Skill activated automatically via `.agents/skills/nerv-development/SKILL.md`
- Agent read `AGENTS.md` for architecture constraints
- Agent inspected `src/database.ts` for migration logic
- Agent validated with `pnpm validate`

**Result:** Pass

**Evidence:** Skill activation confirmed by OpenCode's automatic discovery mechanism. Agent followed authority hierarchy correctly.

---

### Scenario 5: Consumer repository using Nerv (negative trigger)

**Prompt:** "Use Nerv to plan my next feature"

**Observed behavior:**
- Skill did not activate
- Agent treated as consumer use, not Nerv development
- Agent did not modify Nerv source code

**Result:** Pass

**Evidence:** Skill correctly excluded consumer use case based on "When Not to Use" section.

---

### Scenario 21: Recovery from clean session

**Procedure:**
1. Started new agent session with no prior conversational history
2. Prompted: "What is the current state of Nerv development work?"

**Observed behavior:**
- Skill activated
- Agent read `AGENTS.md` (explicit instruction in SKILL.md)
- Agent read `SKILL.md` (loaded automatically by OpenCode)
- Agent read `.nerv/product/` for product context
- Agent executed `node dist/index.js status` to inspect current state
- Agent identified active Run (RUN-030) and read its artifacts
- Agent reconstructed context from persisted evidence without conversational history

**Result:** Pass

**Evidence:** Recovery procedure executed successfully. Agent followed SKILL.md instructions for clean-session recovery. Context reconstructed from SQLite and Markdown artifacts.

---

### Scenario 22: Interruption and recovery from checkpoint

**Procedure:**
1. Started Task with active Run (RUN-030)
2. Made progress on Task
3. Created checkpoint: `node dist/index.js checkpoint --summary "Progress saved"`
4. Simulated session closure
5. Opened new session with no prior conversational history
6. Prompted: "Continue the previous work"

**Observed behavior:**
- Skill activated
- Agent executed `node dist/index.js status` to identify active Run
- Agent read Run's `run.md` for checkpoint instructions
- Agent listed checkpoint files in `.nerv/agent/runs/RUN-030/checkpoints/`
- Agent read most recent checkpoint
- Agent continued execution from checkpoint state
- Recovery did not depend on conversational history

**Result:** Pass

**Evidence:** Checkpoint recovery executed successfully. Agent followed corrected SKILL.md instructions: read checkpoint files rather than creating new checkpoint. Recovery order correct: checkpoint created before interruption.

---

### Scenario 16: Build review workflow request (mandatory Intake regression)

**Prompt:** "Add a formal review workflow for Builds in Nerv, so a Build can be reviewed as a whole before it is closed."

**Observed behavior:**
- Skill activated
- Agent classified request as meeting multiple mandatory-Intake conditions:
  - Durable SQLite schema (new `build_reviews` table)
  - CLI command surfaces (new `nerv build review` and `nerv build close` commands)
  - Lifecycle states and transitions (new Build states)
  - Coordination across multiple subsystems
- Agent stopped before editing implementation files
- Agent created Intake with `node dist/index.js intake create`
- Agent created Proposal with `node dist/index.js intake propose`
- Agent stopped and waited for explicit human approval
- Agent did not start a Run or implement changes until approval

**Result:** Pass

**Evidence:** Mandatory Intake conditions correctly prevented direct implementation. Agent followed workflow: classify → stop → Intake → Proposal → wait for approval.

---

## Cross-provider validation

### Status

Cross-provider validation for Codex, Claude Code, and Cursor is **not executed** in this environment.

### Limitations

- Codex, Claude Code, and Cursor require execution in their respective environments
- This repository's local tooling cannot simulate provider-specific behavior
- Validation would require manual execution in each provider's environment

### Unvalidated claims

The following are documented in `.agents/ADAPTERS.md` but not runtime-validated:

- Codex can load the skill via symlink
- Claude Code can load the skill via symlink
- Cursor can load the skill via symlink

These are based on documented provider conventions, not executed validation.

## Compatibility level

Based on executed evidence:

- **Nivel 1 — Agent-neutral:** YES. Skill content does not depend on agent-specific functions.
- **Nivel 2 — Portable:** PARTIAL. Same contract works when skill is provided manually, but cross-provider execution not validated.
- **Nivel 3 — Integrated:** NO. Adapters documented but not runtime-validated for other hosts.
- **Nivel 4 — Validated:** NO. Multi-agent validation matrix not executed.

**Actual level:** Nivel 1 — Agent-neutral, validated in OpenCode reference environment only.

## Observations

1. OpenCode automatically discovers the skill via `.agents/skills/` convention
2. OpenCode injects context about skill base directory and file list
3. Skill content is agent-agnostic; OpenCode-specific behavior is limited to discovery and context injection
4. Recovery procedures work correctly when agent follows SKILL.md instructions
5. Mandatory Intake conditions correctly prevent direct implementation of lifecycle-level changes
6. `nerv` binary not in PATH; `node dist/index.js` required for CLI execution
7. Checkpoint recovery reads files rather than creating new checkpoints (corrected in TASK-028)
8. Adapter documentation correctly labels unvalidated hosts

## Conclusion

The `nerv-development` skill is agent-neutral in content and validated in OpenCode. Cross-provider portability is documented but not runtime-validated. The skill meets Nivel 1 criteria fully and Nivel 2 criteria partially. Achievement of higher levels requires execution in other agent environments.
