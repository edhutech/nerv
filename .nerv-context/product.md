# Product

## What it is

Nerv is a local-first work harness for developers who build software with coding agents. It preserves the approved path, execution evidence, and reviewed outcome without launching, routing, or requiring an agent or model.

## Users and problem

Developers need compact durable work context across sessions without historical prompt dumps or process-heavy lifecycle machinery.

## Core capabilities

- Govern Work Items and bounded Tasks through planning, approval, execution, validation, Review, and Git-safe Close.
- Persist local operational truth in SQLite with temporary active context in `.nerv/`.
- Provide deterministic persistence primitives without controlling coding agents.

## Product invariants

- Local-first, agent-agnostic, provider-agnostic, and host-agnostic.
- The runtime does not call AI APIs or launch, route, or control coding agents.
- Nerv governs work boundaries, not agent intelligence; it preserves native agent reasoning, planning, clarification, exploration, tool use, and implementation capabilities.
- Human approval precedes durable Work and remediation Tasks.
- Work Review is required before Close; REWORK remains in the same Work Item.
- One Work Item normally closes as one Git-safe reviewed atomic commit; a verified no-diff outcome closes without an empty commit.
- Human-facing interaction may follow the user's language when practical while commands, IDs, lifecycle outcomes, and other technical protocol remain canonical.
- When one current Work and valid transition are unambiguous, human-facing lifecycle input may use a single canonical action word while Nerv's explicit runtime protocol and Work observability remain unchanged.
- Lifecycle actions require clear developer intent; execution topology remains native to the developer and host agent, and capabilities or delegation do not imply Tasks or Works.
- Explicit developer authority may temporarily override automatic Nerv governance for the developer-stated task or conversational scope without changing repository installation or durable Nerv state.
- Repository setup is reversible through ownership-safe removal; uninstall must fail closed when local Nerv state cannot establish that no unresolved Work exists.
- Durable Product Context is authority-backed current product truth; implementation decisions, unsupported assumptions, speculative copy, and temporary demo content are not product authority.
- Human approval is informed: persisted REWORK remediation is presented before approval is requested.

## Boundaries

Nerv governs work; it is not an agent memory or code-intelligence system. Nerv has no agent hosting, model routing, sync service, parallel lifecycle, or persistent conversation-memory requirement.

## Current direction

Keep durable context compact and current, use only relevant context and evidence for planning and Review, and make the agent-facing governance contract clear enough to shape, verify, and present Work consistently without adding lifecycle ceremony.

Nerv follows Semantic Versioning during pre-1.0 development. `package.json` is the single version source; completing a Work Item does not automatically change the version.
