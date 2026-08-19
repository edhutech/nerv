# Nerv

[![npm version](https://img.shields.io/npm/v/@edhutech/nerv)](https://www.npmjs.com/package/@edhutech/nerv)
[![CI](https://github.com/edhutech/nerv/actions/workflows/ci.yml/badge.svg)](https://github.com/edhutech/nerv/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@edhutech/nerv)](LICENSE)
[![Node.js](https://img.shields.io/node/v/@edhutech/nerv)](package.json)

Nerv is a Local-first Agent Work Harness for developers building software with coding agents.

Coding-agent work often loses its approved intent, validation evidence, and review boundary between sessions. Nerv keeps that operational context small and durable so work stays recoverable and reviewable without becoming a prompt archive or a process-heavy system.

Nerv does not launch, control, or require a particular agent or model. It gives compatible agents and developers the same local workflow and Git-safe review boundary.

## Quick Start

```bash
npm install --global @edhutech/nerv
```

Nerv supports Node.js `>=22.14.0 <23` or `>=24.11.0 <25` and requires Git. The installed command is `nerv`; you do not need to clone this repository or install pnpm.

In the Git repository you want Nerv to govern, initialize and commit its tracked setup:

```bash
cd path/to/repository
nerv init
git add .agents/skills/nerv/SKILL.md .nerv-context/product.md .nerv-context/repo.md
git commit -m "Establish Nerv setup"
```

`AGENTS.md` and `CLAUDE.md` are discovery bridges. `nerv init` preserves developer-owned or modified bridge content, and they are not required canonical setup paths. Review and stage bridge changes separately only when you intend to commit them.

To remove Nerv from this repository without removing the global CLI:

```bash
nerv uninstall
```

Global package removal is separate: `npm uninstall -g @edhutech/nerv`. Repository uninstall refuses when local Nerv state cannot be inspected or unresolved Work exists, and does not stage or commit changes.

After setup, ask your compatible coding agent for the software change you actually want. Nerv is discovered automatically; the agent presents a governed Plan, you approve it, and execution continues automatically. When execution and validation finish, the agent stops and hands off `review`; after a PASS Review, request `close` to create the reviewed Git change.

## How Nerv Works

Nerv governs a Work Item, which contains one or more bounded Tasks. The workflow is deliberately small:

```text
  request -> Plan -> approve -> automatic execution -> review -> close
```

Planning and approval are agent-facing protocols, not commands you run yourself. The agent translates approval into deterministic materialization primitives, then stops after execution and validation for `review`; `nerv review <work-ref>` records the integrated result, and `nerv close <work-ref>` creates the reviewed Git change when you request it. Work refs are `W-` plus 16 uppercase UUID hex characters, not sequential numbers.

## Why Nerv

- Keep approved intent, validation evidence, and review outcome durable across agent sessions.
- Use compact Product and Repository Context instead of historical prompt dumps.
- Keep developers in control: approval comes before durable work, and agents never run as a Nerv dependency.
- Close one reviewed Work Item as one Git-safe atomic change.

## Agent Compatibility

Nerv's runtime is agent-, provider-, and host-agnostic. OpenCode, Codex, Cursor, and Claude Code can discover Nerv's instructions through their existing repository conventions; no host changes Nerv's runtime behavior.

## A Small Example

After setup, tell a compatible coding agent what to build:

> Add CSV export. Keep the scope to the export command, tests, and user documentation.

The agent inspects only relevant repository context, presents the bounded Plan, and waits for your approval. Execution continues automatically after approval. When validation finishes, the agent hands off `review`; request `close` only after the result passes.

## Detailed Documentation

Nerv's future dedicated documentation experience will be the home for detailed guides, concepts, workflow, CLI reference, context, compatibility, architecture, and troubleshooting. This repository intentionally keeps stable onboarding and open-source maintenance material close to the code. Until that experience is published, use `nerv --help` for the exact CLI contract and [GitHub Discussions](https://github.com/edhutech/nerv/discussions) for questions.

## What Nerv Is Not

Nerv is not an agent host, model router, memory store, vector database, code-intelligence system, sync service, or mandatory plugin. It governs bounded software work with durable local operational evidence.

## Contributing And Support

Report actionable bugs, feature requests, and agent-compatibility problems in [GitHub Issues](https://github.com/edhutech/nerv/issues). Use [GitHub Discussions](https://github.com/edhutech/nerv/discussions) for questions, ideas, and usage discussion. See [Contributing](CONTRIBUTING.md) for development and pull-request guidance.

## License

Apache-2.0
