import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";

import Database from "better-sqlite3";

import { openRepository, type ProductContextProposalRecord, type ProductSessionRecord } from "./repository.js";

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

export type ProductContextProposal = {
  schemaVersion: 1;
  assessment: {
    mode: "creation" | "evolution";
    confirmedFacts: ProposalObservation[];
    gaps: ProposalObservation[];
    contradictions: ProposalObservation[];
    assumptions: ProposalObservation[];
    pendingQuestions: ProposalObservation[];
  };
  changes: ProductContextChange[];
};

export type ProposalObservation = { id: string; statement: string; sources: string[] };
export type ProductContextChange = { document: string; action: "create" | "update"; summary: string; rationale: string; proposedContent: string };
const PRODUCT_CONTEXT_FILE_SET = new Set<string>(PRODUCT_FILES.map((file) => file.name));

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

export function createProductInputManifest(repoRoot: string, inputs: string[]): string {
  return JSON.stringify(inputs.map((input) => ({
    path: input,
    sha256: createHash("sha256").update(readFileSync(join(repoRoot, input))).digest("hex"),
  })));
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

## Required output

Return a JSON Product Context Proposal. Do not modify the nine canonical Markdown documents. Do not modify application code, dependencies, configuration, Git state, or any other repository file. Persist the returned JSON with \`nerv product propose ${session.id} --proposal proposal.json\`.

## Interview and safe evolution

First inspect the existing Product Context and identify only confirmed facts, missing information, conflicts, assumptions, and pending questions that block a useful update. Ask focused follow-up questions only when they are necessary; do not use a rigid questionnaire.

Treat existing confirmed content as authoritative. Do not overwrite it silently. Before replacing a confirmed decision, include the proposed replacement in \`changes\`; approval and application are separate future steps. Preserve historical or obsolete material through a proposed change to \`evolution.md\`.

Adapt temporary input material into a structured proposal. Do not copy it literally and do not treat input paths as permanent sources. Use schemaVersion 1 with assessment.mode (${session.mode}), five observation arrays (confirmedFacts, gaps, contradictions, assumptions, pendingQuestions), and changes. Each observation has a unique lowercase id, statement, and source paths. Each change names one canonical document, action (create or update), summary, rationale, and complete proposedContent. Keep the nine documents coherent: product, problem, users, scope, requirements, architecture, roadmap, decisions, and evolution must agree.

The proposal is durable and recoverable by ID but not approved or applied by this command.
`;
  const path = join(entrypointDir, "run.md");
  writeFileSync(path, content, "utf8");
  return path;
}

export function parseProductContextProposal(source: string, expectedMode: string): ProductContextProposal {
  let proposal: ProductContextProposal;
  try { proposal = JSON.parse(source) as ProductContextProposal; } catch { throw new Error("Product Context Proposal must be valid JSON."); }
  const assessment = proposal.assessment;
  if (proposal.schemaVersion !== 1 || !assessment || assessment.mode !== expectedMode || !Array.isArray(proposal.changes)) {
    throw new Error(`Product Context Proposal requires schemaVersion 1, assessment.mode ${expectedMode}, and changes.`);
  }
  const observationIds = new Set<string>();
  for (const key of ["confirmedFacts", "gaps", "contradictions", "assumptions", "pendingQuestions"] as const) {
    const observations = assessment[key];
    if (!Array.isArray(observations)) throw new Error(`Product Context Proposal assessment.${key} must be an array.`);
    for (const observation of observations) {
      if (!observation?.id?.match(/^[a-z0-9][a-z0-9-]*$/) || observationIds.has(observation.id) || !observation.statement?.trim() || !Array.isArray(observation.sources) || observation.sources.some((path) => typeof path !== "string" || !path.trim())) {
        throw new Error("Every assessment observation needs a unique lowercase id, statement, and source paths.");
      }
      observationIds.add(observation.id);
    }
  }
  const documents = new Set<string>();
  for (const change of proposal.changes) {
    if (!PRODUCT_CONTEXT_FILE_SET.has(change?.document) || documents.has(change.document) || !["create", "update"].includes(change.action) || !change.summary?.trim() || !change.rationale?.trim() || !change.proposedContent?.trim()) {
      throw new Error("Every change needs one unique Product Context document, create or update action, summary, rationale, and complete proposedContent.");
    }
    documents.add(change.document);
  }
  return proposal;
}

export function createProductContextProposal(databasePath: string, workspaceRoot: string, sessionId: string, source: string): ProductContextProposalRecord {
  const repository = openRepository(databasePath);
  try {
    const session = repository.getProductSession(sessionId.toUpperCase());
    if (!session) throw new Error(`Product Session ${sessionId.toUpperCase()} not found.`);
    if (session.status !== "active") throw new Error(`Product Session ${session.id} cannot receive a proposal from ${session.status}.`);
    const proposal = parseProductContextProposal(source, session.mode);
    const prior = repository.listProductContextProposals(session.id);
    const version = prior.length + 1;
    const record = repository.createProductContextProposal({
      id: `${session.id}-PROPOSAL-${String(version).padStart(3, "0")}`,
      session_id: session.id,
      version,
      status: "proposed",
      proposal_json: JSON.stringify(proposal, null, 2),
      input_manifest: session.input_manifest ?? "[]",
      markdown_path: join(workspaceRoot, "agent", "product", session.id, `proposal-${String(version).padStart(3, "0")}.md`),
    });
    mkdirSync(join(workspaceRoot, "agent", "product", session.id), { recursive: true });
    writeFileSync(record.markdown_path, renderProductContextProposal(record), "utf8");
    return record;
  } finally { repository.close(); }
}

export function getProductContextProposal(databasePath: string, proposalId: string): ProductContextProposalRecord | null {
  const repository = openRepository(databasePath);
  try { return repository.getProductContextProposal(proposalId.toUpperCase()); } finally { repository.close(); }
}

function renderProductContextProposal(record: ProductContextProposalRecord): string {
  return `# ${record.id}: Product Context Proposal\n\n## Status\n\n${record.status}\n\n## Product Session\n\n${record.session_id}\n\n## Version\n\n${record.version}\n\n## Temporary Input Trace\n\n\`\`\`json\n${record.input_manifest}\n\`\`\`\n\n## Proposal\n\n\`\`\`json\n${record.proposal_json}\n\`\`\`\n\n## Contract\n\nThis proposal is not approved and does not modify canonical Product Context.\n`;
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
