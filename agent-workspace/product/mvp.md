# Nerv MVP

## MVP definition

The Nerv MVP is a local-first CLI for developers who work with coding agents.

It should prove that a developer can create or resume an Agentic Task, give the agent a minimum useful context file, save progress, review evidence, close the work and preserve product evolution without re-explaining everything.

## MVP promise

Turn vague developer intent into clear, contextual, scoped and verifiable agentic work.

## MVP scope

The MVP includes:

- `nerv init`
- `nerv product`
- `nerv new task "..."`
- `nerv new build "..."`
- `nerv build plan BUILD-001`
- `nerv start <query>`
- `nerv current`
- `nerv checkpoint`
- `nerv review`
- `nerv close`
- `nerv tasks [query]`
- `nerv builds [query]`
- `nerv runs`
- `nerv status`
- `nerv clean`

## Core flow

```bash
nerv init
nerv product
nerv new task "Add Google login without breaking email auth"
nerv start login
# agent works with @.nerv/agent/runs/RUN-001/run.md
nerv checkpoint --run RUN-001
nerv review --run RUN-001
git add .
git commit -m "TASK-001 Add Google login without breaking email auth"
nerv close --run RUN-001
```

## What the MVP must prove

The MVP must prove that Nerv can:

1. Create local project structure.
2. Create product context.
3. Convert intent into an Agentic Task or suggest an Agentic Build.
4. Create a Run for a task.
5. Generate a focused `run.md` for the agent.
6. Save checkpoint memory.
7. Review work against acceptance criteria and validation evidence.
8. Close tasks and update related Builds.
9. Preserve product evolution.
10. Reduce repeated explanations between sessions.

## Out of scope for MVP

The MVP does not include:

- MCP server
- TUI
- Subagents
- Team mode
- Nerv Cloud
- GitHub App
- CI/CD integrations
- Sandbox runtime
- Skills marketplace
- DSL contracts
- Tree-sitter deep analysis
- Advanced CodeGraph
- Vector database
- Advanced semantic search
- Multi-user sync
- Permissions
- Audit logs
