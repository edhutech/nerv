import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync, renameSync, unlinkSync } from "node:fs";
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
export type ProductContextProposalReview = { id: number; session_id: string; proposal_id: string; decision: "changes_requested" | "rejected" | "approved"; superseding_proposal_id: string | null; created_at: string };
type ProductContextMaterialization = { id: string; session_id: string; proposal_id: string; status: "pending_markdown" | "complete"; plan_json: string; decision_replacement_confirmed_at: string | null; created_at: string; updated_at: string };
export type ProductSessionCheck = { name: string; status: "passed" | "failed"; detail: string };
export type ProductSessionState = { session: ProductSessionRecord; proposals: ProductContextProposalRecord[]; reviews: ProductContextProposalReview[]; materializations: ProductContextMaterialization[]; checks: ProductSessionCheck[] };
type ProductContextMaterializationPlan = {
  proposal: string;
  session: string;
  materializationId: string;
  documents: Array<{ document: string; action: "create" | "update"; previousContent: string | null; previousHash: string | null; proposedContent: string; proposedHash: string }>;
  replacedDecisions: string[];
  runs: "none";
};
const PRODUCT_CONTEXT_FILE_SET = new Set<string>(PRODUCT_FILES.map((file) => file.name));

function hash(content: string): string { return createHash("sha256").update(content, "utf8").digest("hex"); }

function atomicWrite(path: string, content: string): void {
  const temporaryPath = `${path}.tmp`;
  try { writeFileSync(temporaryPath, content, "utf8"); renameSync(temporaryPath, path); } finally { if (existsSync(temporaryPath)) unlinkSync(temporaryPath); }
}

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
    const previous = prior.at(-1);
    if (previous && previous.status !== "changes_requested") {
      throw new Error(`Product Session ${session.id} needs a changes-requested decision before a new proposal version.`);
    }
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

function renderProductContextProposalWithReviews(record: ProductContextProposalRecord, reviews: ProductContextProposalReview[]): string {
  const history = reviews.length === 0 ? "- No decisions recorded." : reviews.map((review) => `- ${review.created_at}: ${review.decision}${review.superseding_proposal_id ? `; superseded by ${review.superseding_proposal_id}` : ""}.`).join("\n");
  return renderProductContextProposal(record).replace("## Proposal", `## Review History\n\n${history}\n\n## Proposal`).replace("This proposal is not approved and does not modify canonical Product Context.", record.status === "approved" ? "This proposal is approved but is not applied until `nerv product apply` runs." : record.status === "applied" ? "This proposal has been applied through its durable materialization ledger." : "This proposal is not approved and does not modify canonical Product Context.");
}

function syncProductProposalMarkdown(database: Database.Database, sessionId: string): void {
  const proposals = database.prepare("SELECT * FROM product_context_proposals WHERE session_id = ? ORDER BY version").all(sessionId) as ProductContextProposalRecord[];
  const reviews = database.prepare("SELECT * FROM product_context_proposal_reviews WHERE session_id = ? ORDER BY id").all(sessionId) as ProductContextProposalReview[];
  for (const proposal of proposals) atomicWrite(proposal.markdown_path, renderProductContextProposalWithReviews(proposal, reviews.filter((review) => review.proposal_id === proposal.id)));
}

export function reviewProductContextProposal(databasePath: string, proposalId: string, action: "changes-requested" | "rejected" | "approved"): ProductContextProposalRecord {
  const database = new Database(databasePath); database.pragma("foreign_keys = ON");
  try {
    const proposal = database.prepare("SELECT * FROM product_context_proposals WHERE id = ?").get(proposalId.toUpperCase()) as ProductContextProposalRecord | undefined;
    if (!proposal) throw new Error(`Product Context Proposal ${proposalId.toUpperCase()} not found.`);
    if (proposal.status !== "proposed") throw new Error(`Product Context Proposal ${proposal.id} cannot transition from ${proposal.status}.`);
    const decision = action === "changes-requested" ? "changes_requested" : action;
    const now = new Date().toISOString();
    database.transaction(() => {
      database.prepare("UPDATE product_context_proposals SET status = ?, updated_at = ? WHERE id = ?").run(decision, now, proposal.id);
      database.prepare("INSERT INTO product_context_proposal_reviews (session_id, proposal_id, decision, superseding_proposal_id, created_at) VALUES (?, ?, ?, NULL, ?)").run(proposal.session_id, proposal.id, decision, now);
    })();
    syncProductProposalMarkdown(database, proposal.session_id);
    return { ...proposal, status: decision, updated_at: now };
  } finally { database.close(); }
}

export function productContextProposalStatus(databasePath: string, sessionId: string): { proposals: ProductContextProposalRecord[]; reviews: ProductContextProposalReview[]; materializations: ProductContextMaterialization[] } {
  const database = new Database(databasePath, { readonly: true });
  try {
    const normalized = sessionId.toUpperCase();
    const session = database.prepare("SELECT id FROM product_sessions WHERE id = ?").get(normalized);
    if (!session) throw new Error(`Product Session ${normalized} not found.`);
    return {
      proposals: database.prepare("SELECT * FROM product_context_proposals WHERE session_id = ? ORDER BY version").all(normalized) as ProductContextProposalRecord[],
      reviews: database.prepare("SELECT * FROM product_context_proposal_reviews WHERE session_id = ? ORDER BY id").all(normalized) as ProductContextProposalReview[],
      materializations: database.prepare("SELECT * FROM product_context_materializations WHERE session_id = ? ORDER BY created_at").all(normalized) as ProductContextMaterialization[],
    };
  } finally { database.close(); }
}

function productSessionState(database: Database.Database, workspaceRoot: string, session: ProductSessionRecord): ProductSessionState {
  const proposals = database.prepare("SELECT * FROM product_context_proposals WHERE session_id = ? ORDER BY version").all(session.id) as ProductContextProposalRecord[];
  const reviews = database.prepare("SELECT * FROM product_context_proposal_reviews WHERE session_id = ? ORDER BY id").all(session.id) as ProductContextProposalReview[];
  const materializations = database.prepare("SELECT * FROM product_context_materializations WHERE session_id = ? ORDER BY created_at").all(session.id) as ProductContextMaterialization[];
  const checks: ProductSessionCheck[] = [];
  const productDir = join(workspaceRoot, "product");
  const missing = PRODUCT_FILES.map((file) => file.name).filter((file) => !existsSync(join(productDir, file)));
  const placeholders = PRODUCT_FILES.map((file) => file.name).filter((file) => existsSync(join(productDir, file)) && /describe the|list the minimum|record important/i.test(readFileSync(join(productDir, file), "utf8")));
  checks.push({ name: "Canonical documents", status: missing.length === 0 ? "passed" : "failed", detail: missing.length === 0 ? "9/9 present" : `missing ${missing.join(", ")}` });
  checks.push({ name: "Placeholder content", status: placeholders.length === 0 ? "passed" : "failed", detail: placeholders.length === 0 ? "none" : placeholders.join(", ") });

  const pending = proposals.filter((proposal) => ["proposed", "changes_requested", "approved", "applying"].includes(proposal.status));
  checks.push({ name: "Proposal decisions", status: pending.length === 0 ? "passed" : "failed", detail: pending.length === 0 ? "no pending decisions" : `pending ${pending.map((proposal) => proposal.id).join(", ")}` });
  const applied = proposals.filter((proposal) => proposal.status === "applied");
  checks.push({ name: "Applied proposal", status: applied.length > 0 ? "passed" : "failed", detail: applied.length > 0 ? applied.map((proposal) => proposal.id).join(", ") : "no applied proposal; historical sessions must be resumed with an approved proposal" });

  const proposalArtifacts = proposals.filter((proposal) => !existsSync(proposal.markdown_path) || readFileSync(proposal.markdown_path, "utf8") !== renderProductContextProposalWithReviews(proposal, reviews.filter((review) => review.proposal_id === proposal.id)));
  checks.push({ name: "Proposal Markdown", status: proposalArtifacts.length === 0 ? "passed" : "failed", detail: proposalArtifacts.length === 0 ? "SQLite and proposal artifacts agree" : `missing or stale ${proposalArtifacts.map((proposal) => proposal.id).join(", ")}` });

  const materializationErrors: string[] = [];
  for (const proposal of applied) {
    const materialization = materializations.find((item) => item.proposal_id === proposal.id);
    if (!materialization || materialization.status !== "complete") { materializationErrors.push(`${proposal.id} is not completely applied`); continue; }
    try {
      const plan = JSON.parse(materialization.plan_json) as ProductContextMaterializationPlan;
      for (const document of plan.documents) {
        const path = join(productDir, document.document);
        if (!existsSync(path) || readFileSync(path, "utf8") !== document.proposedContent) materializationErrors.push(`${proposal.id} does not match ${document.document}`);
      }
    } catch { materializationErrors.push(`${proposal.id} has an invalid materialization plan`); }
  }
  for (const materialization of materializations.filter((item) => item.status !== "complete")) materializationErrors.push(`${materialization.proposal_id} apply is ${materialization.status}`);
  checks.push({ name: "Applied Markdown", status: materializationErrors.length === 0 ? "passed" : "failed", detail: materializationErrors.length === 0 ? "SQLite materializations match canonical documents" : materializationErrors.join("; ") });

  const decisionsPath = join(productDir, "decisions.md");
  const markdownDecisions = existsSync(decisionsPath) ? parseDecisions(readFileSync(decisionsPath, "utf8")).map((decision) => decision.summary) : [];
  const sqliteDecisions = (database.prepare("SELECT summary FROM decisions WHERE scope_type = 'product' AND scope_id = 'decisions.md' ORDER BY id").all() as ParsedDecision[]).map((decision) => decision.summary);
  checks.push({ name: "Decision index", status: JSON.stringify(markdownDecisions) === JSON.stringify(sqliteDecisions) ? "passed" : "failed", detail: JSON.stringify(markdownDecisions) === JSON.stringify(sqliteDecisions) ? "SQLite matches decisions.md" : "SQLite decisions do not match decisions.md" });
  return { session, proposals, reviews, materializations, checks };
}

export function getCurrentProductSessionState(databasePath: string, workspaceRoot: string): ProductSessionState | null {
  const database = new Database(databasePath, { readonly: true });
  try {
    const id = database.prepare("SELECT value FROM metadata WHERE key = 'current_product_session_id'").get() as { value: string } | undefined;
    if (!id?.value) return null;
    const session = database.prepare("SELECT * FROM product_sessions WHERE id = ?").get(id.value) as ProductSessionRecord | undefined;
    if (!session) throw new Error(`Current Product Session ${id.value} not found.`);
    return productSessionState(database, workspaceRoot, session);
  } finally { database.close(); }
}

export function reviewCurrentProductSession(databasePath: string, workspaceRoot: string): ProductSessionState {
  const state = getCurrentProductSessionState(databasePath, workspaceRoot);
  if (!state || state.session.status !== "active") throw new Error("No active Product Session to review.");
  const failed = state.checks.filter((check) => check.status === "failed");
  if (failed.length > 0) throw new Error(`Product Context review failed. ${failed.map((check) => `${check.name}: ${check.detail}.`).join(" ")}`);
  const repository = openRepository(databasePath);
  try { repository.updateProductSession(state.session.id, { status: "reviewed" }); } finally { repository.close(); }
  return { ...state, session: { ...state.session, status: "reviewed" } };
}

export function closeCurrentProductSession(databasePath: string, workspaceRoot: string): ProductSessionRecord {
  const state = getCurrentProductSessionState(databasePath, workspaceRoot);
  if (!state || state.session.status !== "reviewed") throw new Error("Product Session must pass `nerv product review` before close.");
  const failed = state.checks.filter((check) => check.status === "failed");
  if (failed.length > 0) throw new Error(`Product Session ${state.session.id} is no longer coherent. ${failed.map((check) => `${check.name}: ${check.detail}.`).join(" ")}`);
  const repository = openRepository(databasePath);
  try {
    const closedAt = new Date().toISOString();
    repository.updateProductSession(state.session.id, { status: "closed", closed_at: closedAt });
    repository.setCurrentProductSessionId("");
    return { ...state.session, status: "closed", closed_at: closedAt };
  } finally { repository.close(); }
}

function confirmedDecisionSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const matches = [...content.matchAll(/^###\s+(.+)\n([\s\S]*?)(?=^###\s+|(?![\s\S]))/gm)];
  for (const match of matches) {
    const summary = match[1].trim();
    if (summary !== "Format" && /\*\*Status\*\*:\s*Accepted\b/i.test(match[2])) sections.set(summary, match[0]);
  }
  return sections;
}

function createProductContextMaterializationPlan(workspaceRoot: string, record: ProductContextProposalRecord, proposal: ProductContextProposal): ProductContextMaterializationPlan {
  const productDir = join(workspaceRoot, "product");
  const documents = proposal.changes.map((change) => {
    const path = join(productDir, change.document);
    const exists = existsSync(path);
    if ((change.action === "create" && exists) || (change.action === "update" && !exists)) throw new Error(`Product Context change for ${change.document} requires ${change.action === "create" ? "a missing" : "an existing"} canonical document.`);
    const previousContent = exists ? readFileSync(path, "utf8") : null;
    return { document: change.document, action: change.action, previousContent, previousHash: previousContent === null ? null : hash(previousContent), proposedContent: change.proposedContent, proposedHash: hash(change.proposedContent) };
  });
  const decisionChange = documents.find((change) => change.document === "decisions.md");
  const replacedDecisions = decisionChange?.previousContent ? [...confirmedDecisionSections(decisionChange.previousContent).keys()].filter((summary) => !confirmedDecisionSections(decisionChange.proposedContent).has(summary)) : [];
  if (replacedDecisions.length > 0) {
    const evolution = documents.find((change) => change.document === "evolution.md");
    const originalDecisions = confirmedDecisionSections(decisionChange!.previousContent!);
    if (!evolution || replacedDecisions.some((summary) => !evolution.proposedContent.includes(originalDecisions.get(summary)!))) throw new Error("Replacing confirmed decisions requires an evolution.md change that preserves every replaced decision.");
  }
  return { proposal: record.id, session: record.session_id, materializationId: `${record.id}-MATERIALIZATION`, documents, replacedDecisions, runs: "none" };
}

function writeProductContextMaterialization(workspaceRoot: string, plan: ProductContextMaterializationPlan): void {
  for (const document of plan.documents) {
    const path = join(workspaceRoot, "product", document.document);
    const current = existsSync(path) ? readFileSync(path, "utf8") : null;
    if (current === document.proposedContent) continue;
    if ((current === null ? null : hash(current)) !== document.previousHash) throw new Error(`Canonical Product Context changed while ${plan.proposal} was pending: ${document.document}. Resolve the conflict before retrying.`);
    atomicWrite(path, document.proposedContent);
  }
}

export function applyProductContextProposal(databasePath: string, workspaceRoot: string, proposalId: string, confirmDecisionReplacement: boolean): string[] {
  const database = new Database(databasePath); database.pragma("foreign_keys = ON");
  try {
    const record = database.prepare("SELECT * FROM product_context_proposals WHERE id = ?").get(proposalId.toUpperCase()) as ProductContextProposalRecord | undefined;
    if (!record) throw new Error(`Product Context Proposal ${proposalId.toUpperCase()} not found.`);
    let materialization = database.prepare("SELECT * FROM product_context_materializations WHERE proposal_id = ?").get(record.id) as ProductContextMaterialization | undefined;
    if (!materialization && record.status !== "approved") throw new Error(`Product Context Proposal ${record.id} must be explicitly approved before apply.`);
    let plan: ProductContextMaterializationPlan;
    if (!materialization) {
      const session = database.prepare("SELECT * FROM product_sessions WHERE id = ?").get(record.session_id) as ProductSessionRecord | undefined;
      if (!session) throw new Error(`Product Session ${record.session_id} not found.`);
      plan = createProductContextMaterializationPlan(workspaceRoot, record, parseProductContextProposal(record.proposal_json, session.mode));
      if (plan.replacedDecisions.length > 0 && !confirmDecisionReplacement) throw new Error(`Product Context Proposal ${record.id} replaces confirmed decisions (${plan.replacedDecisions.join(", ")}). Re-run with --confirm-decision-replacement after human confirmation.`);
      const now = new Date().toISOString();
      database.transaction(() => {
        database.prepare("INSERT INTO product_context_materializations (id, session_id, proposal_id, status, plan_json, decision_replacement_confirmed_at, created_at, updated_at) VALUES (?, ?, ?, 'pending_markdown', ?, ?, ?, ?)").run(plan.materializationId, record.session_id, record.id, JSON.stringify(plan), plan.replacedDecisions.length > 0 ? now : null, now, now);
        database.prepare("UPDATE product_context_proposals SET status = 'applying', updated_at = ? WHERE id = ?").run(now, record.id);
        const decisions = plan.documents.find((document) => document.document === "decisions.md");
        if (decisions) {
          database.prepare("DELETE FROM decisions WHERE scope_type = 'product' AND scope_id = 'decisions.md'").run();
          const insert = database.prepare("INSERT INTO decisions (scope_type, scope_id, summary, created_at) VALUES ('product', 'decisions.md', ?, ?)");
          for (const decision of parseDecisions(decisions.proposedContent)) insert.run(decision.summary, now);
        }
      })();
      materialization = { id: plan.materializationId, session_id: record.session_id, proposal_id: record.id, status: "pending_markdown", plan_json: JSON.stringify(plan), decision_replacement_confirmed_at: plan.replacedDecisions.length > 0 ? now : null, created_at: now, updated_at: now };
    } else plan = JSON.parse(materialization.plan_json) as ProductContextMaterializationPlan;
    if (materialization.status !== "complete") {
      writeProductContextMaterialization(workspaceRoot, plan);
      const now = new Date().toISOString();
      database.transaction(() => {
        database.prepare("UPDATE product_context_materializations SET status = 'complete', updated_at = ? WHERE id = ?").run(now, materialization!.id);
        database.prepare("UPDATE product_context_proposals SET status = 'applied', updated_at = ? WHERE id = ?").run(now, record.id);
      })();
      syncProductProposalMarkdown(database, record.session_id);
    }
    return [JSON.stringify(plan, null, 2)];
  } finally { database.close(); }
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
    return parseDecisions(readFileSync(decisionsFilePath, "utf8"));
  } catch {
    return [];
  }
}

function parseDecisions(content: string): ParsedDecision[] {
  return content.split("\n").flatMap((line) => {
    const trimmed = line.trim();
    const summary = trimmed.startsWith("### ") ? trimmed.slice(4).trim() : "";
    return summary && summary !== "Format" ? [{ summary }] : [];
  });
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
