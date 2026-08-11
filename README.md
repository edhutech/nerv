# Nerv

Local-first Agent Work Harness for developers who build software with coding agents.

Nerv persists the minimum useful context and work state needed to make agent-assisted work recoverable and reviewable. It does not launch, control, or require a particular coding agent or model.

**Less context, better chosen.**

## Model

A Work Item is the governed unit of work. It contains one or more bounded Tasks. Tasks are executed and validated; the integrated Work Item is reviewed and closed as one Git-safe atomic change.

The normal flow is: relevant Product Context, plan preview, human approval, materialize, execute Tasks, validate, Work Review, optional user or external verification, then Git-safe close on request. Review rework adds approved remediation Tasks to the same Work Item. A Checkpoint is only for a genuine interruption.

SQLite is the durable operational source of truth. Product Context and Repo Context are canonical long-lived context. Generated Markdown is minimal temporary active context, not the lifecycle authority.

## Install

```bash
git clone https://github.com/edhutech/nerv.git ~/tools/nerv
pnpm --dir ~/tools/nerv install
pnpm --dir ~/tools/nerv build
```

Nerv requires Node.js 20 or later, pnpm, and a Git repository.

## Runtime CLI

Run `nerv` from the target repository. The examples use the installed `nerv` binary; replace it with `node ~/tools/nerv/dist/index.js` when running directly from a local clone. The runtime is agent agnostic and exposes deterministic primitives; it never calls an AI API.

```bash
node ~/tools/nerv/dist/index.js init
node ~/tools/nerv/dist/index.js product
node ~/tools/nerv/dist/index.js product write product.md --content "# Product\n\nApproved product description."
node ~/tools/nerv/dist/index.js repo

# Materialize and operate on approved Work Item data.
nerv work create "Durable knowledge storage" --intent "..." --goal "..." --scope "..." --acceptance-criteria "..." --validation "..."
nerv work list
nerv work add-task WORK-001 "Add storage" --scope "..." --acceptance-criteria "..." --validation "..."
nerv work activate WORK-001
nerv task start TASK-001
nerv task done TASK-001 --evidence "..." --files src/example.ts
nerv review WORK-001 --outcome PASS --summary "..." --validation-evidence "..."
nerv close WORK-001 --message "Add durable knowledge storage"
```

`nerv work list` provides a read-only overview of every Work Item, including its ID, title, and current state. Other primitives include `nerv work status`, `nerv task block`, `nerv checkpoint`, and `nerv knowledge add|search|show`. Use `nerv --help` for exact arguments.

Close is deliberately Git-safe: it requires a passing Work Review and validation evidence, stages only attributable Work Item changes, and blocks rather than guessing when unrelated changes cannot be separated safely.

## Agent Workflows

Agents may plan and execute work using Nerv, but the runtime makes no assumptions about host, provider, model, or conversational memory. A reasoning model plans, replans, and performs Work Review; an execution model implements approved Tasks and runs deterministic validation. The user may hand off between those roles: planning shows a non-durable structured preview before approval, materialization reports readiness for execution, and separated execution stops at `Ready for Work Review` after validation.

A PASS Review is ready for optional user or external verification and does not close automatically. Verification failures become REWORK evidence on the same Work Item. The user may request Git-safe Close after successful verification, or explicitly opt into auto-close for a Work Item without changing Nerv runtime configuration or state.

Before planning product work, read relevant Product Context. When it is absent or only scaffold placeholders, confirm a concise product understanding with the developer, run `nerv product`, and record only approved facts through the restricted `nerv product write <document> --content "..."` primitive. Product Context grounds Work Item goals, scope, Tasks, acceptance criteria, and integrated Review; Repo Context remains separate and is refreshed only when useful.

For consumer repositories, `.agents/skills/nerv/SKILL.md` is the public agent skill. It translates normal development requests into the installed runtime's deterministic primitives without creating another lifecycle. The package includes this file for host or developer skill discovery.

For development of this repository, `.agents/skills/nerv-development/SKILL.md` defines the `nerv-dev` protocol. `nerv-dev` is an agent-facing workflow protocol, not a second engine or a replacement for the agent-agnostic `nerv` runtime CLI.

## Development

```bash
pnpm validate
```

`pnpm validate` runs build, typecheck, and smoke validation.

## License

Apache-2.0
