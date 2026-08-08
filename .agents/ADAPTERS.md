# Agent Adapters

The canonical Nerv development protocol is `.agents/skills/nerv-development/SKILL.md`. Adapters may make that skill discoverable or instruct an agent to read it directly. Do not copy the skill into host-specific files.

## Boundaries

- An adapter handles discovery and optional context wiring only.
- An adapter must not redefine the Work Item lifecycle, persist a parallel state store, or implement an alternative engine.
- An adapter must not require a specific provider, model, output format, cloud service, or persistent conversation memory.
- An adapter may provide repository paths, Git state, or selected relevant context, but must preserve the authority of `AGENTS.md`, Product Context, Repo Context, and the runtime state.
- An adapter must not claim that Nerv launches or controls an agent. The `nerv` runtime CLI is agent agnostic.

## Protocol Boundary

`nerv-dev` is an agent-facing workflow protocol for development of Nerv itself. It coordinates planning, explicit human approval, execution, Work Review, exceptional checkpoints, and Git-safe close by using the deterministic `nerv` runtime primitives.

It is not a host integration layer and it is not a second CLI engine, database, or lifecycle. Hosts may expose the protocol differently, but its semantics remain identical.
