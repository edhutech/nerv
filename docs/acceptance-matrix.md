# Acceptance Matrix

| Original requirement | Implementation | Test | Evidence |
| --- | --- | --- | --- |
| Immutable direct/file Intent and deterministic SHA-256 | `createIntake`, `verifyIntake` | `intake-task1.mjs` | SQLite and generated Markdown assertions |
| Separate lifecycle, changes requested, version preservation, durable audit | `intakes`, `intake_proposals`, `intake_proposal_reviews` | `intake-task1.mjs` | v1 to v2 and reloadable history |
| Portable agent-neutral context and canonical four forms | `createPlanningEntrypoint`, `parseProposal` | `intake-task2.mjs` | CLI acceptance/rejection checks |
| Structured outcomes, scope, dependencies, order, risk, size, relations | Proposal schema and materialization ledger | `intake-task2.mjs`, `intake-task3.mjs` | canonical JSON and ledger items |
| Approved-only deterministic dry run/apply | `createMaterializationPlan`, `applyProposal` | `intake-task3.mjs` | same persisted plan output |
| Recoverable SQLite-Markdown coordination and idempotence | `intake_materializations` status ledger | `intake-task3.mjs` | repeated apply has four complete rows |
| No automatic Runs/Checkpoints | `applyProposal` has no run/checkpoint calls | `intake-task3.mjs`, `intake-e2e.mjs` | zero Runs assertion |
| End-to-end v1 change request, v2 approval and all forms | public CLI commands | `intake-e2e.mjs` | isolated Git workspace and SQLite reload |

## Product Context Lifecycle

| Original requirement | Implementation | Test | Evidence |
| --- | --- | --- | --- |
| Initial session creation and restart recovery | `startProductSession`, `getCurrentProductSessionState` | `product-context-e2e.mjs` | same `PRODUCT-001` is resumed from SQLite |
| Immutable proposal record and changes-requested revision | `createProductContextProposal`, `reviewProductContextProposal` | `product-context-e2e.mjs` | two versioned proposal Markdown files and append-only decisions |
| Human approval before apply | `reviewProductContextProposal`, `applyProductContextProposal` | `product-context-e2e.mjs` | unapproved v1 is rejected; approved v2 is applied |
| SQLite-Markdown coherence and safe repeat apply | materialization ledger and `productSessionState` checks | `product-context-e2e.mjs` | complete single ledger, matching Markdown checks, identical repeat plan |
| Review and close only for coherent applied context | `reviewCurrentProductSession`, `closeCurrentProductSession` | `product-context-e2e.mjs` | reviewed then closed session; current session cleared |
| No AI integration and no automatic Runs or Checkpoints | portable entrypoint and `runs: "none"` materialization plan | `product-context-e2e.mjs` | entrypoint assertion and zero `runs`/`checkpoints` rows |
| Compatible Product Context schema upgrades | additive `migrateSchema` columns | `product-context-e2e.mjs` | legacy session/materialization rows survive `nerv init` migration |
