import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

import Database from "better-sqlite3";

import { openRepository, type ProductSessionRecord } from "./repository.js";

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

export type ProductSessionStartResult = {
  session: ProductSessionRecord;
  resumed: boolean;
};

export function startProductSession(databasePath: string, hasExistingContext: boolean): ProductSessionStartResult {
  const repository = openRepository(databasePath);

  try {
    const currentId = repository.getCurrentProductSessionId();
    const current = currentId ? repository.getProductSession(currentId) : null;
    if (current?.status === "active") {
      return { session: current, resumed: true };
    }

    const session = repository.createProductSession({
      id: repository.getNextId("PRODUCT"),
      mode: hasExistingContext ? "evolution" : "creation",
    });
    repository.setCurrentProductSessionId(session.id);
    return { session, resumed: false };
  } finally {
    repository.close();
  }
}

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

export function persistProductMetadata(databasePath: string, created: string[], preserved: string[]): void {
  const repository = openRepository(databasePath);

  try {
    const now = new Date().toISOString();
    const totalFiles = created.length + preserved.length;

    repository.setMetadata("product_context_updated_at", now);
    repository.setMetadata("product_context_file_count", String(totalFiles));
    repository.setMetadata("product_context_created_count", String(created.length));
    repository.setMetadata("product_context_preserved_count", String(preserved.length));
  } finally {
    repository.close();
  }
}

export type ParsedDecision = {
  summary: string;
};

export function parseDecisionsFromFile(decisionsFilePath: string): ParsedDecision[] {
  if (!existsSync(decisionsFilePath)) {
    return [];
  }

  try {
    const content = readFileSync(decisionsFilePath, "utf8");
    const decisions: ParsedDecision[] = [];

    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("### ") && trimmed.length > 4) {
        const summary = trimmed.slice(4).trim();
        if (summary.length > 0 && summary !== "Format") {
          decisions.push({ summary });
        }
      }
    }

    return decisions;
  } catch {
    return [];
  }
}

export function persistDecisions(databasePath: string, decisionsFilePath: string): number {
  const decisions = parseDecisionsFromFile(decisionsFilePath);
  const database = new Database(databasePath);

  try {
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");

    const insertStmt = database.prepare(
      `INSERT INTO decisions (scope_type, scope_id, summary, created_at)
       VALUES (@scopeType, @scopeId, @summary, @createdAt)`,
    );

    const deleteStmt = database.prepare(
      `DELETE FROM decisions WHERE scope_type = ? AND scope_id = ?`,
    );

    const now = new Date().toISOString();

    const transaction = database.transaction(() => {
      deleteStmt.run("product", "decisions.md");

      for (const decision of decisions) {
        insertStmt.run({
          scopeType: "product",
          scopeId: "decisions.md",
          summary: decision.summary,
          createdAt: now,
        });
      }
    });

    transaction();

    return decisions.length;
  } finally {
    database.close();
  }
}

export type EvolutionEntry = {
  taskId: string;
  taskTitle: string;
  buildId: string | null;
  runId: string;
  commitHash: string | null;
  closedAt: string;
};

export function appendProductEvolution(workspaceRoot: string, entry: EvolutionEntry): string | null {
  const evolutionPath = join(workspaceRoot, "product", "evolution.md");

  if (!existsSync(evolutionPath)) {
    return null;
  }

  const date = entry.closedAt.split("T")[0];
  const commitInfo = entry.commitHash ? ` (commit: ${entry.commitHash.substring(0, 7)})` : "";
  const buildInfo = entry.buildId ? ` from ${entry.buildId}` : "";

  const evolutionEntry = `

### ${date}: Closed ${entry.taskId}${commitInfo}

**Task**: ${entry.taskTitle}
**Build**: ${entry.buildId ?? "None"}
**Run**: ${entry.runId}

Completed${buildInfo}. Task closed on ${date}.
`;

  appendFileSync(evolutionPath, evolutionEntry, "utf8");

  return evolutionPath;
}
