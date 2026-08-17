# Contributing

Thanks for improving Nerv. Keep contributions focused on the local-first, agent-agnostic work harness described in the [README](README.md).

## Before You Start

- Use [GitHub Issues](https://github.com/edhutech/nerv/issues) for actionable bugs, feature requests, and agent compatibility problems.
- Use [GitHub Discussions](https://github.com/edhutech/nerv/discussions) for questions, ideas, and open-ended usage discussion.
- For a security issue, follow [SECURITY.md](SECURITY.md) rather than opening a public Issue.

For substantial changes, describe the problem and intended boundary before implementation. Nerv itself is governed through its published skill and canonical context.

## Development

Nerv uses Node.js 22 or 24 and pnpm.

```bash
pnpm install --frozen-lockfile
pnpm validate
pnpm test:package
```

`pnpm validate` builds, type-checks, and runs the focused regression suite. `pnpm test:package` verifies the npm tarball in an isolated installation.

Keep TypeScript imports compatible with NodeNext, use `.js` specifiers for local TypeScript imports, and do not edit generated `dist/` or local `.nerv/` state.

## Pull Requests

- Keep the change scoped and explain its user-facing effect.
- Add or update focused tests when behavior changes.
- Run the relevant validation before requesting review.
- Use a Conventional Commit subject; scopes are optional.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
