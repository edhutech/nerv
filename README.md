# Nerv

Local-first Agent Work Harness for developers who build software with coding agents.

Nerv persists the minimum useful context and work state needed to make agent-assisted work recoverable and reviewable. It does not launch, control, or require a particular coding agent or model.

**Less context, better chosen.**

## Model

A Work Item is the governed unit of work. It contains one or more bounded Tasks. Tasks are executed and validated; the integrated Work Item is reviewed and closed as one Git-safe atomic change.

The normal flow is: relevant Product Context, plan preview, human approval, materialize, execute Tasks, validate, Work Review, optional local or user verification, then Git-safe close on request. Review rework adds approved remediation Tasks to the same Work Item. A Checkpoint is only for a genuine interruption.

SQLite is the durable local operational source of truth. Each Work Item has a stable UUID and a repository-local friendly `WORK-###` reference; Tasks have UUID identities and positions scoped within their Work Item, never global task references. On fresh local state, Nerv seeds friendly numbering from the highest valid paired Nerv trailer reachable from the current `HEAD`; existing SQLite allocation remains authoritative. Friendly references are not distributed identifiers: divergent or disconnected histories may reuse them, and no-diff Work refs cannot be recovered after local state is discarded because no commit records their trailers. Shared canonical context is tracked only in `.nerv-context/product.md` and `.nerv-context/repo.md`. `.nerv/` is local ignored state and temporary active context.

## Install

```bash
npm install --global @edhutech/nerv
```

Nerv supports Node.js 22 and 24 LTS and requires Git. The installed command remains `nerv`; package installation does not require cloning this repository or installing pnpm.

In the Git repository you want Nerv to govern:

```bash
cd path/to/repository
nerv init
git add AGENTS.md CLAUDE.md .agents/skills/nerv/SKILL.md .nerv-context/product.md .nerv-context/repo.md
git commit -m "Establish Nerv setup"
```

`nerv init` creates the tracked managed public skill and canonical context files. It also creates `.nerv/` for local SQLite operational state and temporary active Work context, then excludes it through Git's repository-local exclude file. Do not commit `.nerv/`.

## Workflow

Run `nerv` from the target repository. The public workflow is deliberately small:

```text
intent
  -> Plan Preview (agent protocol)
  -> human approval (agent protocol)
  -> execution
  -> nerv review WORK-###
  -> optional local or user verification
  -> nerv close WORK-###
```

Plan Preview and human approval are agent-facing protocol operations, not `nerv` CLI commands. Planning requires Work title, goal, scope, acceptance criteria, and validation, plus Task title, objective, acceptance criteria, and validation; other fields are shown only when useful. Use one Task by default. Approval atomically materializes the approved Work, all approved Tasks, and its activation baseline through deterministic `work` primitives. The first Task activates automatically and completion activates the next. Record targeted validation and every new Work-owned path; Review blocks ambiguous new unattributed changes. REWORK remediation is persisted with Review and approval materializes that exact proposal. `nerv review` and `nerv close` are literal runtime commands. The runtime remains agent agnostic and never calls an AI API.

Execution implements the approved Tasks, records targeted validation and attributable paths, and stops for Work Review. Stop execution only for an explicit developer request, a material scope or context conflict, a genuine block, or an exceptional checkpoint; incidental implementation differences inside the approved outcome do not create ceremony.

`nerv review WORK-###` evaluates the integrated result against intent, relevant Product/Repo Context, relevant project authority, the approved boundaries, implementation, diff, validation, and supplied external evidence. A Review outcome exists only after this runtime command succeeds and persists it; narrative analysis alone is not a completed Nerv Review and must not recommend approval. Findings are `critical`, `high`, `medium`, or `low`: critical and high always require REWORK; medium requires REWORK unless the developer explicitly accepts it as residual risk; low is residual by default. Review still records one Work-level outcome. PASS shows any residual findings and makes the Work Item ready for optional verification. Every persisted REWORK, including after remediation, requires findings, identifies the blockers, and presents a minimum execution-ready remediation preview before human approval materializes it through deterministic Work primitives.

`nerv close WORK-###` is Git-safe: it requires PASS and validation evidence, uses the Work title as its default subject, stages only attributable Work Item changes, and blocks when new unattributed changes make the boundary ambiguous. An agent may supply a subject that follows repository authority; Nerv does not impose a commit style. It does not push, inspect remote CI, or require provider access. One Work Item produces one reviewed atomic commit by default; a verified clean no-diff outcome closes without manufacturing an empty commit.

`nerv status` is a read-only query. `nerv checkpoint` is only for a genuine interruption.

## Context Infrastructure

`product.md` holds compact current product truth: what is being built, for whom, core capabilities, product invariants, boundaries, and current direction. `repo.md` holds compact durable repository truth: stack, architecture, important paths, development rules, generated/local state, validation, and repository invariants. Planning and Review use only relevant portions, not the entire context surface by default.

`nerv init` creates local `.nerv/` state and adds `.nerv/` to Git's repository-local exclude file. It creates absent tracked setup files: the managed public skill plus minimal `product.md` and `repo.md` headings. It also creates minimal `AGENTS.md` and `CLAUDE.md` discovery bridges only when absent; existing bridges are left byte-for-byte unchanged and are not Nerv-managed setup. Commit desired setup files before materializing a Work. Before every new Work, Nerv verifies only the canonical skill and context paths exist, are tracked, and exactly match `HEAD`; unrelated dirty paths remain protected baseline state. Init does not inspect the repository, invent facts, or run a wizard. Plan may inspect context and propose updates, but only approved execution may change it as scoped, task-attributed Work-owned tracked changes.

Planning uses this precedence: the developer's current decision, Product Context, relevant authoritative project or domain guidance, then generic external guidance. Surface only material conflicts. Skills, MCPs, plugins, and specialized tools can assist when relevant, but cannot bypass Plan Preview, approval, Work boundaries, Work Review, or Git-safe Close.

Plan Previews distinguish Work-level Expected touchpoints, which describe the Work boundary, from Task-level Expected touchpoints, which describe where each Task is expected to act. When repository evidence makes Task touchpoints clear, show them even if the Work-level field names the same paths; omit them only when genuinely inapplicable rather than adding boilerplate.

Nerv governs work; it is not an agent memory or code-intelligence system. Shared Product Context and shared Repo Context are tracked in `.nerv-context/`; `.nerv/` operational state remains local. The low-level `work` commands are deterministic implementation primitives; use `nerv --help` when an agent needs their exact arguments.

`.agents/skills/nerv/SKILL.md` is the single Nerv workflow skill. Repository-specific development rules belong in normal repository authority such as `AGENTS.md` and `.nerv-context/`.

## Agent Compatibility

Nerv's runtime is agent-agnostic: every host uses the same local CLI and SQLite Work state. Instruction discovery is host-specific; it never changes Nerv lifecycle behavior.

| Host | Instructions | Canonical skill | Discovery |
| --- | --- | --- | --- |
| OpenCode | `AGENTS.md` | `.agents/skills/nerv/SKILL.md` | Native |
| Codex | `AGENTS.md` | `.agents/skills/nerv/SKILL.md` | Native |
| Claude Code | `CLAUDE.md` bridge, optionally following `AGENTS.md` | Canonical skill read on demand | Minimal bridge |
| Cursor | `AGENTS.md` | `.agents/skills/nerv/SKILL.md` | Native |

The discovery bridges contain no workflow rules; they direct agents to existing repository authority when available and the canonical skill. Supporting a future host should normally require discovery integration only, never runtime lifecycle changes.

## Releases

`package.json` is the single source of the Nerv version. Nerv follows Semantic Versioning and remains in `0.x.y` during normal pre-1.0 development: PATCH is for compatible fixes, MINOR is for meaningful compatible product or runtime evolution, and `1.0.0` is a deliberate stable public-contract decision. Work Items do not automatically change the product version.

When an actual distribution is made, create an optional Git tag as `v<version>` such as `v0.1.0`; a GitHub Release may then be created from that tag. Pre-release identifiers are available for external testing. Nerv has no release subsystem or release automation.

Npm publication is an explicit release action; it is not performed by normal CI.

## Development

```bash
pnpm validate
```

`pnpm validate` runs build, typecheck, and focused regression tests.

## License

Apache-2.0
