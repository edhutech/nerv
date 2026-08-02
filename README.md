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

Nerv is installed once in a local tools folder, but you run it from the project repository where you want Nerv to create and manage `.nerv/`.

```bash
mkdir -p ~/tools
git clone https://github.com/edhutech/nerv.git ~/tools/nerv
cd ~/tools/nerv
pnpm install
pnpm build
```

## Running Nerv

Nerv commands are executed from your project repository, not from the installation folder.

**Direct execution:**

```bash
cd your-project
node ~/tools/nerv/dist/index.js init
node ~/tools/nerv/dist/index.js product
```

Verify:

```bash
node ~/tools/nerv/dist/index.js --help
```

**Optional convenience alias:**

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
alias nerv='node ~/tools/nerv/dist/index.js'
```

Reload your shell:

```bash
source ~/.bashrc   # or source ~/.zshrc
```

Verify:

```bash
nerv --help
```

## Quick Start

The following examples use `nerv` for readability. If you did not configure the optional alias, replace `nerv` with `node ~/tools/nerv/dist/index.js`.

```bash
# 1. Initialize Nerv in your project
cd your-project
nerv init

# 2. Prepare a portable Product Context session
nerv product
# Give the printed .nerv/agent/product/run.md file to any coding agent.
# Optional temporary source material stays in your repository:
nerv product --input product-brief.md notes/

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
| `nerv product [--input <paths...>]` | Prepare an agent-neutral Product Context session |
| `nerv product status` | Show session state and Product Context checks |
| `nerv product review` | Check required documents and placeholders before close |
| `nerv product close` | Close a reviewed Product Session |
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

Product Context is independent of agents and providers. Nerv never opens an agent or calls an AI API. `nerv product` writes `.nerv/agent/product/run.md`; give that file to the agent you choose. It may update only `.nerv/product/`, asks only necessary questions, and requires you to review the diff before Git. A later `nerv product` resumes an active session; use `nerv product status`, then `nerv product review` and `nerv product close` when it is complete. Builds and checkpoints remain optional.

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

## Update Nerv

```bash
cd ~/tools/nerv
git pull
pnpm install
pnpm build
```

## Development

```bash
pnpm validate  # Runs build + typecheck + smoke tests
```

## License

Apache-2.0
