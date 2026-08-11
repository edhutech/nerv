# Nerv

Nerv is a local-first work harness for developers who build software with coding agents. It makes agent-assisted work recoverable, reviewable, and safe to close without launching, routing, or requiring any agent or model.

## Users And Problem

Developers need a compact, durable way to preserve the approved path, relevant context, execution evidence, and review outcome across sessions without accumulating historical prompt dumps or introducing process-heavy lifecycle machinery.

## Product Principles

- Less context, better chosen.
- Work Items govern coherent outcomes; Tasks are bounded execution units inside them.
- Planning and Work Review use relevant context and evidence; Execution follows approved scope.
- Human approval precedes durable Work and remediation Tasks, then normally continues into Execution in the same agent interaction.
- One Work Item closes as one Git-safe reviewed atomic commit by default.

## Boundaries And Direction

SQLite is local operational truth. `.nerv/` is ignored local state and temporary active context. Tracked `.nerv-context/` holds shared Product Context, explicit Repo Context, and selectively promoted Knowledge. Nerv remains agent, provider, and host agnostic; it has no agent hosting, model routing, sync service, or parallel lifecycle.

Stable Work UUIDs and local `WORK-###` references are distinct; Tasks have parent-scoped positions, not global task references. PASS permits optional user or external verification before requested Git-safe Close. REWORK stays in the same Work Item; checkpoints are exceptional recovery evidence.

## Versioning And Releases

`package.json` is Nerv's single version source. Nerv follows Semantic Versioning and remains in `0.x.y` during normal pre-1.0 development: PATCH is for compatible fixes and MINOR is for meaningful compatible product or runtime evolution. A completed Work Item does not automatically change the product version; `1.0.0` requires a deliberate stable public-contract decision.

When a distribution is made, its Git tag uses `v<version>` such as `v0.1.0`. A GitHub Release may be created from that tag. Pre-release identifiers such as `0.1.0-alpha.1` or `0.1.0-beta.1` are available for external testing without adding release automation.
