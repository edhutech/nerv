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

**Discovery mechanism:** Automatic in this reference environment

OpenCode discovers skills in `.agents/skills/*/SKILL.md` automatically based on the `name` and `description` fields in the YAML frontmatter.

**Evidence:** This repository is configured for OpenCode discovery through `.agents/skills/`. No persisted OpenCode scenario-suite result is recorded; see `.agents/skills/nerv-development/references/external-validation-backlog.md` for the pending host validation.

**Manual loading fallback:** Not needed; OpenCode loads the skill automatically.

**Adapter requirements:** None. OpenCode natively supports the `.agents/skills/` convention.

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

## Validation status

- **OpenCode:** Reference integration available; scenario-suite execution pending
- **Codex:** Documented but not runtime-validated
- **Claude Code:** Documented but not runtime-validated
- **Cursor:** Documented but not runtime-validated

Runtime validation for hosts other than OpenCode requires execution in those environments, which is outside the scope of this repository's local tooling. Do not claim portability for unvalidated hosts.
