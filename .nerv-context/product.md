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
- Human approval precedes durable Work and remediation Tasks.
- Work Review is required before Close; REWORK remains in the same Work Item.
- One Work Item normally closes as one Git-safe reviewed atomic commit; a verified no-diff outcome closes without an empty commit.

## Boundaries

Nerv governs work; it is not an agent memory or code-intelligence system. Nerv has no agent hosting, model routing, sync service, parallel lifecycle, or persistent conversation-memory requirement.

## Current direction

Keep durable context compact and current, use only relevant context and evidence for planning and Review, and make the agent-facing governance contract clear enough to shape, verify, and present Work consistently without adding lifecycle ceremony.

Nerv follows Semantic Versioning during pre-1.0 development. `package.json` is the single version source; completing a Work Item does not automatically change the version.
