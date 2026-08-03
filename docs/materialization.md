# Approved Proposal Materialization

`nerv intake apply <PROPOSAL-ID> --dry-run` emits the exact canonical plan:
Intake, approved Proposal, materialization ID, new and affected existing
Builds, Tasks, their planned IDs, order, dependencies, relationships, audit
references, and `runs: none`.

Without `--dry-run`, Nerv accepts only the Intake's explicitly approved
version. SQLite is the commit point: Builds, Tasks, materialization ledger,
item-level provenance, and lifecycle updates are one transaction. The ledger
then enters `pending_markdown`; generated Markdown is written and Builds are
synchronized through the existing `syncBuildMarkdown` path. Only then does the
ledger become `complete`.

If Markdown writing fails, SQLite remains intentionally recoverable rather
than silently contradictory: the persistent ledger stays `pending_markdown`.
Run the same `apply` command again. It reads the saved plan and completes the
Markdown phase without creating duplicate Builds, Tasks, references, Runs, or
Checkpoints. Repeating a completed apply returns the same materialization
plan. No apply executes work or starts a Run.
