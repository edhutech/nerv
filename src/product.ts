import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

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

const INPUT_EXTENSIONS = new Set([".md", ".txt", ".json", ".yaml", ".yml", ".csv"]);

export function discoverProductInputs(repoRoot: string, inputs: string[]): string[] {
  const discovered: string[] = [];
  for (const input of inputs) {
    const path = resolve(process.cwd(), input);
    const relativePath = relative(repoRoot, path);
    if (!relativePath || relativePath.startsWith("..") || relativePath.split(sep).includes(".nerv")) {
      throw new Error(`Input path is not allowed: ${input}. Inputs must be files or folders inside the repository and outside .nerv/.`);
    }
    if (!existsSync(path)) {
      throw new Error(`Input path does not exist: ${input}.`);
    }
    collectInputFiles(path, repoRoot, discovered);
  }
  const unique = [...new Set(discovered)].sort();
  if (inputs.length > 0 && unique.length === 0) {
    throw new Error("No compatible input files were found.");
  }
  return unique;
}

function collectInputFiles(path: string, repoRoot: string, discovered: string[]): void {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) {
      collectInputFiles(join(path, entry), repoRoot, discovered);
    }
    return;
  }
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
  if (!INPUT_EXTENSIONS.has(extension)) {
    throw new Error(`Input file is not compatible: ${relative(repoRoot, path)}. Allowed extensions: ${[...INPUT_EXTENSIONS].join(", ")}.`);
  }
  discovered.push(relative(repoRoot, path));
}

export function generateProductEntrypoint(workspaceRoot: string, session: ProductSessionRecord, inputs: string[]): string {
  const productDir = join(workspaceRoot, "product");
  const entrypointDir = join(workspaceRoot, "agent", "product");
  mkdirSync(entrypointDir, { recursive: true });
  const repoContext = existsSync(join(workspaceRoot, "repo", "development.md")) ? "- `../../repo/development.md`" : "- No Repo Context is available yet.";
  const inputList = inputs.length > 0 ? inputs.map((input) => `- \`${join("..", "..", "..", input)}\``).join("\n") : "- No input files were supplied. Interview the user only for information needed to complete the Product Context.";
  const content = `# Product Session ${session.id}

## Purpose

Prepare Product Context only. Nerv does not invoke models or APIs. Give this file to any external coding agent that can read repository files.

## Session

- Mode: ${session.mode}
- State: ${session.status}

## Read

- \`../../product/product.md\`
- \`../../product/problem.md\`
- \`../../product/users.md\`
- \`../../product/prd.md\`
- \`../../product/roadmap.md\`
- \`../../product/scope.md\`
- \`../../product/decisions.md\`
- \`../../product/architecture.md\`
- \`../../product/evolution.md\`
${repoContext}

## Temporary input material

${inputList}

## Allowed changes

Modify only the nine Markdown documents in \`.nerv/product/\`. Do not modify application code, dependencies, configuration, Git state, or files outside \`.nerv/product/\`.

## Interview and safe evolution

First inspect the existing Product Context and identify only missing information, conflicts, and assumptions that block a useful update. Ask focused follow-up questions only when they are necessary; do not use a rigid questionnaire.

Treat existing confirmed content as authoritative. Do not overwrite it silently. Before replacing a confirmed decision, show the proposed replacement and obtain explicit user confirmation. Record new decisions and replacements in \`decisions.md\`, preserve historical or obsolete material in \`evolution.md\`, and keep pending questions and assumptions visibly distinguished from confirmed facts in the document where they matter.

Adapt temporary input material into the appropriate templates. Do not copy it literally and do not treat input paths as permanent sources. Keep the nine documents coherent: product, problem, users, scope, requirements, architecture, roadmap, decisions, and evolution must agree.

Before Git is used, show the Product Context diff to the user for review.
`;
  const path = join(entrypointDir, "run.md");
  writeFileSync(path, content, "utf8");
  return path;
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
