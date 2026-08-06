# Agent Host Integration Adapters

This document describes how different agent hosts can discover or load the canonical `nerv-development` skill.

## Canonical skill location

The single canonical skill is located at:

```
.agents/skills/nerv-development/SKILL.md
```

All agent hosts must reference this canonical skill. Do not copy its contents; copies diverge from updates and violate the single-source principle.

## Adapter boundaries

All adapters must respect these boundaries:

1. **Discovery only:** Adapters provide mechanisms to locate and load the canonical skill. They do not modify or extend the skill's lifecycle rules.

2. **No duplication:** Adapters reference the canonical skill through symlinks, includes, or explicit file reads. If the canonical skill is updated, all adapters automatically benefit.

3. **No lifecycle redefinition:** Adapters cannot redefine Intake, Build, Task, Run, Checkpoint, Review, or Close. These concepts are defined by the canonical skill and the Nerv CLI.

4. **Context wiring:** Adapters may provide additional context (e.g., current file, git status) but must not override the skill's authority hierarchy (AGENTS.md → .nerv/product/ → .nerv/repo/).

5. **Validation:** Adapters must not bypass the `pnpm validate` gate or modify the Nerv CLI's behavior.

## OpenCode

**Discovery mechanism:** Not executed; pending host validation.

The canonical skill is available at `.agents/skills/nerv-development/SKILL.md`, but this repository has not recorded OpenCode execution evidence for automatic discovery or loading behavior.

**Evidence:** See `.agents/skills/nerv-development/references/compatibility-evidence-status.md` for the authoritative status and `external-validation-backlog.md` for the pending OpenCode validation.

**Manual loading fallback:** Not validated. Record host-specific evidence before relying on any fallback or discovery mechanism.

**Adapter requirements:** No OpenCode-specific requirements are established until host validation is recorded.

## Codex (OpenAI)

**Discovery mechanism:** Not verified

This repository has not verified how Codex discovers repository-local skills. To use the `nerv-development` skill without relying on discovery, explicitly instruct Codex to read the canonical skill.

**Manual loading approach:**

```bash
# Symlink the skill to a location Codex can access
ln -s .agents/skills/nerv-development/SKILL.md CODEX_CONTEXT.md
```

Alternatively, instruct Codex to read `.agents/skills/nerv-development/SKILL.md` directly in the prompt.

**Evidence:** Not runtime-validated. The symlink example is unverified operator guidance, not a claim about Codex discovery behavior.

**Adapter requirements:** Codex must be able to read files from the repository and execute shell commands.

## Claude Code (Anthropic)

**Discovery mechanism:** Not verified

This repository has not verified how Claude Code discovers repository-local skills. To use the `nerv-development` skill without relying on discovery, explicitly instruct Claude Code to read the canonical skill.

**Manual loading approach:**

```bash
# Symlink the skill to CLAUDE.md
ln -s .agents/skills/nerv-development/SKILL.md CLAUDE.md
```

Alternatively, instruct Claude Code to read `.agents/skills/nerv-development/SKILL.md` directly in the prompt.

**Evidence:** Not runtime-validated. The symlink example is unverified operator guidance, not a claim about Claude Code discovery behavior.

**Adapter requirements:** Claude Code must be able to read files from the repository and execute shell commands.

## Cursor

**Discovery mechanism:** Not verified

This repository has not verified how Cursor discovers repository-local skills. To use the `nerv-development` skill without relying on discovery, explicitly instruct Cursor to read the canonical skill.

**Manual loading approach:**

```bash
# Create Cursor rules directory
mkdir -p .cursor/rules

# Symlink the skill
ln -s ../../.agents/skills/nerv-development/SKILL.md .cursor/rules/nerv-development.md
```

Alternatively, instruct Cursor to read `.agents/skills/nerv-development/SKILL.md` directly in the prompt.

**Evidence:** Not runtime-validated. The symlink example is unverified operator guidance, not a claim about Cursor discovery behavior.

**Adapter requirements:** Cursor must be able to read files from the repository and execute shell commands.

## Validation Status

Current compatibility evidence status is authoritative in `.agents/skills/nerv-development/references/compatibility-evidence-status.md`. Runtime validation for hosts requires execution in those environments; do not claim portability for unvalidated hosts.
