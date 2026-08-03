# BUILD-003 Acceptance Matrix

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
