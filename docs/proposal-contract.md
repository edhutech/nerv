# Portable Proposal Contract

The public flow is `nerv intake create`, `nerv intake context`, hand the
generated package to any external agent, `nerv intake propose --input`,
`nerv intake proposal`, `nerv intake review`, then `nerv intake apply
--dry-run` or `apply`. Nerv never calls an AI model, SDK, or provider. The
flow is independent of agents, sessions, and `current_run_id`.

Proposal JSON is canonical and uses `schemaVersion: 1`. It has `rationale`,
`context`, `units`, and `relationships`. A unit has a stable `unit-...` ID,
planning `justification`, and is one of:

- `standalone`: exactly one Task.
- `new-build`: one named new Build with one or more Tasks.
- multiple `new-build` units plus `relationships`: related new Builds.
- `existing-build`: Tasks explicitly associated to an existing `buildId`.

Every Task has a stable `task-...` ID, expected `outcome`, scope boundary,
dependencies, unique `order`, risk, and bounded `runSize`. This makes the
chosen planning form and its relationships structured data, not prose.

```json
{
  "schemaVersion": 1,
  "rationale": "The migration needs two separately reviewable Builds.",
  "context": "Read the linked product and repository context.",
  "units": [{
    "id": "unit-data",
    "type": "new-build",
    "title": "Migrate data",
    "justification": "Data migration is independently releasable.",
    "tasks": [{
      "id": "task-schema",
      "title": "Add schema",
      "intent": "Add the schema.",
      "outcome": "Schema is migrated.",
      "scope": "Schema only.",
      "dependencies": [],
      "order": 1,
      "risk": "medium",
      "runSize": "small"
    }]
  }],
  "relationships": []
}
```

Invalid IDs, references, duplicate order, self-dependencies, unknown Builds,
or incomplete planning data are rejected before storage. The next version of
the contract uses this exact saved JSON to produce dry-run and apply results;
neither command reinterprets prose or starts a Run.
