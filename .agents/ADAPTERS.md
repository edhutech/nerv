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

**Discovery mechanism:** Automatic (verified)

OpenCode discovers skills in `.agents/skills/*/SKILL.md` automatically based on the `name` and `description` fields in the YAML frontmatter.

**Evidence:** OpenCode loads the skill automatically when the request matches the description. Verified during BUILD-006 and BUILD-007 execution.

**Manual loading fallback:** Not needed; OpenCode loads the skill automatically.

**Adapter requirements:** None. OpenCode natively supports the `.agents/skills/` convention.

## Codex (OpenAI)

**Discovery mechanism:** Manual (not verified)

Codex does not automatically discover skills in `.agents/skills/`. To use the `nerv-development` skill with Codex, reference the canonical skill explicitly.

**Manual loading approach:**

```bash
# Symlink the skill to a location Codex can access
ln -s .agents/skills/nerv-development/SKILL.md CODEX_CONTEXT.md
```

Alternatively, instruct Codex to read `.agents/skills/nerv-development/SKILL.md` directly in the prompt.

**Evidence:** Not runtime-validated. This approach is based on documented Codex conventions but has not been executed in this repository.

**Adapter requirements:** Codex must be able to read files from the repository and execute shell commands.

## Claude Code (Anthropic)

**Discovery mechanism:** Manual (not verified)

Claude Code does not automatically discover skills in `.agents/skills/`. To use the `nerv-development` skill with Claude Code, reference the canonical skill explicitly.

**Manual loading approach:**

```bash
# Symlink the skill to CLAUDE.md
ln -s .agents/skills/nerv-development/SKILL.md CLAUDE.md
```

Alternatively, instruct Claude Code to read `.agents/skills/nerv-development/SKILL.md` directly in the prompt.

**Evidence:** Not runtime-validated. This approach is based on documented Claude Code conventions but has not been executed in this repository.

**Adapter requirements:** Claude Code must be able to read files from the repository and execute shell commands.

## Cursor

**Discovery mechanism:** Manual (not verified)

Cursor does not automatically discover skills in `.agents/skills/`. To use the `nerv-development` skill with Cursor, reference the canonical skill explicitly.

**Manual loading approach:**

```bash
# Create Cursor rules directory
mkdir -p .cursor/rules

# Symlink the skill
ln -s ../../.agents/skills/nerv-development/SKILL.md .cursor/rules/nerv-development.md
```

Alternatively, instruct Cursor to read `.agents/skills/nerv-development/SKILL.md` directly in the prompt.

**Evidence:** Not runtime-validated. This approach is based on documented Cursor conventions but has not been executed in this repository.

**Adapter requirements:** Cursor must be able to read files from the repository and execute shell commands.

## Validation status

- **OpenCode:** Verified as the reference integration
- **Codex:** Documented but not runtime-validated
- **Claude Code:** Documented but not runtime-validated
- **Cursor:** Documented but not runtime-validated

Runtime validation for hosts other than OpenCode requires execution in those environments, which is outside the scope of this repository's local tooling. Do not claim portability for unvalidated hosts.
