# Nerv Glossary

## Agentic Build

A group of Agentic Tasks that together deliver a significant change in the product or code.

Example:

```txt
BUILD-001 Authentication system
```

## Agentic Task

A scoped, contextual and verifiable unit of work that a coding agent can execute.

It should include:

- Goal
- Scope
- Out of scope
- Acceptance criteria
- Validation
- Relevant files
- Risks
- Evidence expected

## Micro Action

A small change inside an active Agentic Task.

A Micro Action should not become a separate task if it clearly belongs to the active task.

## Run

A working session for one Agentic Task.

A Run generates an agent entrypoint:

```txt
.nerv/agent/runs/RUN-001/run.md
```

## Checkpoint

A saved progress summary for a Run.

It should capture:

- What changed
- Files touched
- Decisions made
- Problems found
- Pending work
- Next step

## Review

A structured check before closing a task.

It verifies:

- Acceptance criteria
- Validation commands
- Evidence
- Risks
- Scope control
- Git diff

## Close

The formal closure of a Task or Build.

Closing a Task can update a Build.

Closing a Build updates product evolution.

## Product Evolution

A minimal history of important progress in the product.
