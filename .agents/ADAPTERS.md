# Agent Host Integration Adapters

This document describes how different agent hosts can discover or load the canonical `nerv-development` skill.

## Canonical skill location

The single canonical skill is located at:

```
.agents/skills/nerv-development/SKILL.md
```

All agent hosts should reference this canonical skill rather than duplicating its contents. Adapters provide discovery and context wiring only; they must not redefine Nerv lifecycle concepts (Intake, Build, Task, Run, Checkpoint, Review, Close).

## OpenCode

**Discovery mechanism:** Automatic

OpenCode discovers skills in `.agents/skills/*/SKILL.md` automatically based on the `name` and `description` fields in the YAML frontmatter.

**Manual loading fallback:** Not needed; OpenCode loads the skill automatically when the request matches the description.

**Adapter requirements:** None. OpenCode natively supports the `.agents/skills/` convention.

## Codex (OpenAI)

**Discovery mechanism:** Manual

Codex does not automatically discover skills in `.agents/skills/`. To use the `nerv-development` skill with Codex:

1. Copy or symlink the canonical skill to a location Codex can access
2. Reference the skill explicitly in your prompt or Codex configuration
3. Ensure Codex can read `AGENTS.md` and `.nerv/product/` for context

**Manual loading fallback:**

```bash
# Option 1: Symlink the skill
ln -s .agents/skills/nerv-development/SKILL.md CODEX_CONTEXT.md

# Option 2: Copy the skill
cp .agents/skills/nerv-development/SKILL.md CODEX_CONTEXT.md
```

**Adapter requirements:** Codex must be able to read files from the repository and execute shell commands.

## Claude Code (Anthropic)

**Discovery mechanism:** Manual

Claude Code does not automatically discover skills in `.agents/skills/`. To use the `nerv-development` skill with Claude Code:

1. Copy or symlink the canonical skill to `CLAUDE.md` or reference it in your prompt
2. Ensure Claude Code can read `AGENTS.md` and `.nerv/product/` for context
3. Use Claude Code's file reading capabilities to access the skill

**Manual loading fallback:**

```bash
# Option 1: Symlink the skill
ln -s .agents/skills/nerv-development/SKILL.md CLAUDE.md

# Option 2: Copy the skill
cp .agents/skills/nerv-development/SKILL.md CLAUDE.md
```

**Adapter requirements:** Claude Code must be able to read files from the repository and execute shell commands.

## Cursor

**Discovery mechanism:** Manual

Cursor does not automatically discover skills in `.agents/skills/`. To use the `nerv-development` skill with Cursor:

1. Copy or symlink the canonical skill to `.cursor/rules/nerv-development.md` or reference it in your prompt
2. Ensure Cursor can read `AGENTS.md` and `.nerv/product/` for context
3. Use Cursor's rules system to load the skill

**Manual loading fallback:**

```bash
# Create Cursor rules directory
mkdir -p .cursor/rules

# Option 1: Symlink the skill
ln -s ../../.agents/skills/nerv-development/SKILL.md .cursor/rules/nerv-development.md

# Option 2: Copy the skill
cp .agents/skills/nerv-development/SKILL.md .cursor/rules/nerv-development.md
```

**Adapter requirements:** Cursor must be able to read files from the repository and execute shell commands.

## Adapter boundaries

All adapters must respect these boundaries:

1. **Discovery only:** Adapters provide mechanisms to locate and load the canonical skill. They do not modify or extend the skill's lifecycle rules.

2. **No duplication:** Adapters reference the canonical skill rather than copying its contents. If the canonical skill is updated, all adapters automatically benefit.

3. **No lifecycle redefinition:** Adapters cannot redefine Intake, Build, Task, Run, Checkpoint, Review, or Close. These concepts are defined by the canonical skill and the Nerv CLI.

4. **Context wiring:** Adapters may provide additional context (e.g., current file, git status) but must not override the skill's authority hierarchy (AGENTS.md → .nerv/product/ → .nerv/repo/).

5. **Validation:** Adapters must not bypass the `pnpm validate` gate or modify the Nerv CLI's behavior.

## Validation status

- **OpenCode:** Validated as the reference integration
- **Codex:** Documented but not runtime-validated in this repository
- **Claude Code:** Documented but not runtime-validated in this repository
- **Cursor:** Documented but not runtime-validated in this repository

Runtime validation for hosts other than OpenCode requires execution in those environments, which is outside the scope of this repository's local tooling.
