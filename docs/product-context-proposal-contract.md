# Product Context Proposal Contract

`nerv product` creates or resumes a Product Session and writes a portable agent
entrypoint. An external agent returns JSON and the developer persists it with
`nerv product propose PRODUCT-### --proposal proposal.json`. Nerv does not call an
AI provider and this command does not approve or apply changes.

SQLite is authoritative. Each proposal has a session-scoped, recoverable ID
(`PRODUCT-001-PROPOSAL-001`), immutable canonical JSON, a generated Markdown
view, and a snapshot of temporary input paths plus SHA-256 hashes. Inputs are
traceability only; they are not canonical Product Context.

The schema uses `schemaVersion: 1`:

```json
{
  "schemaVersion": 1,
  "assessment": {
    "mode": "evolution",
    "confirmedFacts": [{ "id": "fact-local", "statement": "State is local.", "sources": ["notes.md"] }],
    "gaps": [],
    "contradictions": [],
    "assumptions": [],
    "pendingQuestions": []
  },
  "changes": [{
    "document": "product.md",
    "action": "update",
    "summary": "Clarify product positioning.",
    "rationale": "New confirmed evidence.",
    "proposedContent": "# Product\n"
  }]
}
```

`assessment.mode` must match the Product Session. Observation IDs are unique
lowercase identifiers with a statement and source paths. A change targets one
of the nine Product Context documents at most once and supplies a complete
proposed document. Invalid JSON, modes, observations, or changes are rejected
before SQLite or Markdown state changes.
