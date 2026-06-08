import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PRODUCT_FILES = [
  {
    name: "product.md",
    content: `# Product

## What is this product?

Describe the product in 1-2 sentences.

## Core value proposition

What problem does this product solve?

## Target users

Who uses this product?
`,
  },
  {
    name: "problem.md",
    content: `# Problem

## What problem are we solving?

Describe the core problem.

## Why does this problem matter?

Explain the impact.

## Current solutions

How do people solve this today?
`,
  },
  {
    name: "users.md",
    content: `# Users

## Primary user personas

Describe your main user types.

## User goals

What do users want to accomplish?

## User pain points

What frustrates users today?
`,
  },
  {
    name: "prd.md",
    content: `# Product Requirements

## MVP features

List the minimum features needed.

## Success metrics

How will you measure success?

## Out of scope

What is explicitly not in the MVP?
`,
  },
  {
    name: "roadmap.md",
    content: `# Roadmap

## Current priorities

What are you working on now?

## Next up

What's coming soon?

## Future ideas

What might you build later?
`,
  },
  {
    name: "scope.md",
    content: `# Scope

## In scope

What is included in the current work?

## Out of scope

What is explicitly excluded?

## Boundaries

What are the limits of the product?
`,
  },
  {
    name: "decisions.md",
    content: `# Decisions

## Decision log

Record important product and technical decisions here.

### Format

**Decision**: What was decided
**Date**: When
**Context**: Why
**Consequences**: What follows
`,
  },
  {
    name: "architecture.md",
    content: `# Architecture

## System overview

Describe the high-level architecture.

## Key components

List the main parts of the system.

## Data flow

How does data move through the system?
`,
  },
  {
    name: "evolution.md",
    content: `# Evolution

## Product evolution

Track how the product changes over time.

## Lessons learned

What have you learned?

## Pivots

What changed direction and why?
`,
  },
] as const;

export type ProductScaffoldResult = {
  created: string[];
  preserved: string[];
};

export function scaffoldProductContext(workspaceRoot: string): ProductScaffoldResult {
  const productDir = join(workspaceRoot, "product");

  mkdirSync(productDir, { recursive: true });

  const created: string[] = [];
  const preserved: string[] = [];

  for (const file of PRODUCT_FILES) {
    const filePath = join(productDir, file.name);

    if (existsSync(filePath)) {
      preserved.push(file.name);
    } else {
      writeFileSync(filePath, file.content, "utf8");
      created.push(file.name);
    }
  }

  return { created, preserved };
}
