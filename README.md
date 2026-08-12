# Nerv

Local-first Agent Work Harness for developers who build software with coding agents.

Nerv persists the minimum useful context and work state needed to make agent-assisted work recoverable and reviewable. It does not launch, control, or require a particular coding agent or model.

**Less context, better chosen.**

## Model

A Work Item is the governed unit of work. It contains one or more bounded Tasks. Tasks are executed and validated; the integrated Work Item is reviewed and closed as one Git-safe atomic change.

The normal flow is: relevant Product Context, plan preview, human approval, materialize, execute Tasks, validate, Work Review, optional user or external verification, then Git-safe close on request. Review rework adds approved remediation Tasks to the same Work Item. A Checkpoint is only for a genuine interruption.

SQLite is the durable local operational source of truth. Each Work Item has a stable UUID and a local friendly `WORK-###` reference; Tasks have UUID identities and positions scoped within their Work Item, never global task references. Shared canonical context is tracked in `.nerv-context/{product,repo,knowledge}`. `.nerv/` is local ignored state, including generated repository observations and temporary active context.

## Install

```bash
git clone https://github.com/edhutech/nerv.git ~/tools/nerv
pnpm --dir ~/tools/nerv install
pnpm --dir ~/tools/nerv build
```

Nerv requires Node.js 20 or later, pnpm, and a Git repository.

## Workflow

Run `nerv` from the target repository. The public workflow is deliberately small:

```text
intent
  -> nerv plan "<intent>"
  -> nerv approve
  -> execution
  -> nerv review WORK-###
  -> optional user or external verification
  -> nerv close WORK-###
```

`nerv plan` and `nerv approve` are agent-facing protocol operations, not commands an agent should blindly execute in a shell. Planning inspects the relevant Product Context, repository evidence, authoritative project guidance, and focused Knowledge before showing a non-durable execution-ready Plan Preview. Approval creates the Work with its approved title, intent, goal, scope, acceptance criteria, and full validation; adds every Task with its title, scope, acceptance criteria, and targeted validation; then activates the Work through deterministic `work` primitives. Execution starts each pending Task, implements its approved scope, runs targeted validation, and records completion evidence and attributable paths before beginning the next Task. It then normally continues through approved Execution in the same agent interaction. `nerv review` and `nerv close` are runtime commands. The runtime remains agent agnostic and never calls an AI API.

Execution implements the approved Tasks, records targeted validation and attributable paths, and stops for Work Review. Stop execution only for an explicit developer request, a material scope or context conflict, a genuine block, or an exceptional checkpoint; incidental implementation differences inside the approved outcome do not create ceremony.

`nerv review WORK-###` evaluates the integrated result against intent, Product Context, relevant project authority, the approved boundaries, implementation, diff, validation, Knowledge, and supplied external evidence. A Review outcome exists only after this runtime command succeeds and persists it; narrative analysis alone is not a completed Nerv Review and must not recommend approval. Findings are `critical`, `high`, `medium`, or `low`: critical and high always require REWORK; medium requires REWORK unless the developer explicitly accepts it as residual risk; low is residual by default. Review still records one Work-level outcome. PASS shows any residual findings and makes the Work Item ready for optional verification. Every persisted REWORK, including after remediation, requires findings, identifies the blockers, and presents a minimum execution-ready remediation preview before recommending approval; `nerv approve` adds approved remediation to the same Work Item without materializing it first.

`nerv close WORK-###` is Git-safe: it requires PASS and validation evidence, stages only attributable Work Item changes, inspects the staged diff, and blocks rather than guessing when unrelated changes cannot be separated. One Work Item produces one reviewed atomic commit by default; a verified clean no-diff outcome closes without manufacturing an empty commit.

`nerv status` is a read-only query. `nerv checkpoint` is only for a genuine interruption.

## Context Infrastructure

Before planning product work, inspect relevant tracked `.nerv-context/product/` files. If they are absent or only placeholders, establish and record only the minimum confirmed product understanding before materializing work. Product Context governs both planning and review.

Planning uses this precedence: the developer's current decision, Product Context, relevant authoritative project or domain guidance, then generic external guidance. Surface only material conflicts. Skills, MCPs, plugins, and specialized tools can assist when relevant, but cannot bypass Plan Preview, approval, Work boundaries, Work Review, or Git-safe Close.

Plan Previews distinguish Work-level Expected touchpoints, which describe the Work boundary, from Task-level Expected touchpoints, which describe where each Task is expected to act. When repository evidence makes Task touchpoints clear, show them even if the Work-level field names the same paths; omit them only when genuinely inapplicable rather than adding boilerplate.

Shared Product Context, explicit shared Repo Context, and selectively promoted Knowledge are tracked in `.nerv-context/`. SQLite Knowledge and `.nerv/` operational state remain local. The low-level `work`, `product`, `repo`, and `knowledge` commands are deterministic implementation primitives; use `nerv --help` when an agent needs their exact arguments.

For consumer repositories, `.agents/skills/nerv/SKILL.md` is the public agent skill. For development of Nerv itself, `.agents/skills/nerv-development/SKILL.md` adds repository-specific constraints without creating a second lifecycle.

## Releases

`package.json` is the single source of the Nerv version. Nerv follows Semantic Versioning and remains in `0.x.y` during normal pre-1.0 development: PATCH is for compatible fixes, MINOR is for meaningful compatible product or runtime evolution, and `1.0.0` is a deliberate stable public-contract decision. Work Items do not automatically change the product version.

When an actual distribution is made, create an optional Git tag as `v<version>` such as `v0.1.0`; a GitHub Release may then be created from that tag. Pre-release identifiers are available for external testing. Nerv has no release subsystem or release automation.

## Development

```bash
pnpm validate
```

`pnpm validate` runs build, typecheck, and smoke validation.

## License

Apache-2.0
