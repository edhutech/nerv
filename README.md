# Nerv

Local-first Agent Work Harness for developers who work with coding agents.

Nerv does not replace coding agents. It works **with** agents (Codex, Claude Code, OpenCode, Cursor, etc.) by preparing the right context, scope, decisions, and execution path for each unit of work.

**Core idea:** Less context, better chosen.

## What Nerv Does

- Turns vague developer intent into scoped, contextual, verifiable agentic work
- Creates focused `run.md` files that give agents minimum useful context
- Tracks runs, checkpoints, reviews, and closes
- Preserves product evolution and decisions across sessions
- Reduces repeated explanations between coding sessions

## Prerequisites

- **Node.js** >= 20
- **pnpm** (package manager)
- **Git** (Nerv works inside Git repositories)

## Installation

```bash
git clone https://github.com/<your-username>/nerv.git
cd nerv
pnpm install
pnpm build
pnpm link --global
```

Verify installation:

```bash
nerv --help
```

## Quick Start

```bash
# 1. Initialize Nerv in your project
cd your-project
nerv init

# 2. Create product context
nerv product

# 3. Create an Agentic Task from intent
nerv new task "Add Google login without breaking email auth"

# 4. Start a Run
nerv start login

# 5. Give your coding agent this file:
#    .nerv/agent/runs/RUN-001/run.md

# 6. Save progress
nerv checkpoint --summary "Implemented OAuth flow" --files "src/auth/google.ts"

# 7. Review work
nerv review --outcome passed --summary "All criteria met" --validation passed

# 8. Commit and close
git add .
git commit -m "TASK-001: Add Google login"
nerv close
```

## Commands

| Command | Description |
|---------|-------------|
| `nerv init` | Initialize Nerv in the current repo |
| `nerv product` | Create or update product context |
| `nerv repo` | Generate repo development context |
| `nerv new task "<intent>"` | Create Agentic Task from intent |
| `nerv new build "<intent>"` | Create Agentic Build from intent |
| `nerv build plan <BUILD-###>` | Plan tasks for a Build |
| `nerv start <query>` | Start a Run for a task |
| `nerv current` | Show current active Run |
| `nerv checkpoint` | Save progress for a Run |
| `nerv review` | Review work against acceptance criteria |
| `nerv close` | Close reviewed work and update evolution |
| `nerv tasks [query]` | List or search tasks |
| `nerv builds [query]` | List or search builds |
| `nerv runs` | List all Runs |
| `nerv status` | Show workspace status |
| `nerv clean` | Clean generated artifacts |

## Using with Coding Agents

When you start a Run with `nerv start <query>`, Nerv generates:

- `.nerv/agent/runs/RUN-###/run.md` — **Agent entrypoint**
- `.nerv/agent/runs/RUN-###/task.md` — Task details

Give your coding agent the `run.md` file. It contains:
- Which task is active
- Scope and acceptance criteria
- Context files to read
- Validation commands
- Checkpoint/review/close instructions

The agent reads `run.md` and works with focused context instead of guessing from the whole repo.

## Development

```bash
pnpm validate  # Runs build + typecheck + smoke tests
```

## License

Apache-2.0
