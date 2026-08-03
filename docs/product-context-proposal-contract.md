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

## Human Review And Apply

The public lifecycle is `propose`, `review-proposal`, then `apply`. A review is
an explicit human decision: `approved`, `rejected`, or `changes-requested`.
Only `approved` can be applied. A changes-requested proposal is retained with
its append-only review record and permits the next proposal version; neither it
nor rejection changes canonical Product Context.

`nerv product apply <PROPOSAL-ID>` uses SQLite as its commit point. It records
an immutable document plan in a `pending_markdown` materialization ledger,
then atomically writes each Markdown document and marks the ledger `complete`.
Retry the same command after an interruption; it reuses the saved plan and
does not duplicate state. It refuses to overwrite a document that changed
outside that plan while pending. Apply never starts Runs or creates Checkpoints.

`nerv product status` reconstructs the current session, proposal decisions,
materialization state, and SQLite-to-Markdown checks after a process restart.
Only a session with no pending decisions, an applied proposal, matching
Markdown, and a matching decision index can pass `nerv product review` and
then `nerv product close`.

Replacing an accepted decision is a separate safety barrier. The proposal must
also preserve the complete replaced decision in its `evolution.md` change, and
the human must run apply with `--confirm-decision-replacement`. The confirmation
timestamp and the replaced decision summaries are retained in the SQLite plan.
