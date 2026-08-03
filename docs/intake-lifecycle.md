# Intake Lifecycle

SQLite is authoritative. Generated Intake Markdown is a synchronized readable
view and preserves the original captured Intent and every proposal version.

## Intake

An Intake starts as `captured`. Creating a Proposal moves it to `planning`.
Reviewing a Proposal moves it to `changes_requested`, `approved`, or
`rejected`. Only an approved version may later move the Intake to
`materialized`. `rejected` and `materialized` are terminal states. An approved
Intake cannot accept another Proposal.

## Proposal Version

Each Proposal starts as `proposed`. `nerv intake review --action
changes-requested` moves that version to `changes_requested`; only then can a
new version be recorded. The new version has its own ID and records the prior
version as `parent_proposal_id`; the decision record is updated with its
`superseding_proposal_id`. A proposed version can instead become `approved` or
`rejected`; both are terminal except that an approved version can later become
`materialized` through apply.

Every decision is append-only in `intake_proposal_reviews`, with Intake,
Proposal, decision, timestamp, and version-link data. Approval is recorded on
the Intake as `approved_proposal_id`. Restarting Nerv and using `nerv intake
status <INTAKE-ID>` reconstructs the same lifecycle history without relying on
an active Run, Product Session, or agent memory.
