import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import Database from "better-sqlite3";
import { createBuildFromIntent, syncBuildMarkdown } from "./build.js";
import { createTaskFromIntent } from "./task.js";
import { openRepository } from "./repository.js";
import { discoverContext } from "./context.js";

export type IntakeStatus = "captured" | "planning" | "changes_requested" | "approved" | "rejected" | "materialized";
export type ProposalStatus = "proposed" | "changes_requested" | "approved" | "rejected" | "superseded" | "materialized";
export type IntakeRecord = { id: string; original_intent: string; content_hash: string; status: IntakeStatus; approved_proposal_id: string | null; created_at: string; updated_at: string; markdown_path: string };
export type ProposalRecord = { id: string; intake_id: string; version: number; status: ProposalStatus; parent_proposal_id: string | null; content_hash: string; proposal_json: string; created_at: string; updated_at: string; markdown_path: string };
export type ProposalReviewRecord = { id: number; intake_id: string; proposal_id: string; decision: "changes_requested" | "rejected" | "approved"; superseding_proposal_id: string | null; created_at: string };
export type ProposalTask = { id: string; title: string; intent: string; outcome: string; scope: string; dependencies: string[]; order: number; risk: string; runSize: string };
export type ProposalUnit = { id: string; type: "standalone" | "new-build" | "existing-build"; title?: string; buildId?: string; justification: string; tasks: ProposalTask[] };
export type ProposalRelationship = { from: string; to: string; type: string; rationale: string };
export type Proposal = { schemaVersion: 1; rationale: string; context: string; units: ProposalUnit[]; relationships: ProposalRelationship[] };

function hash(content: string): string { return createHash("sha256").update(content, "utf8").digest("hex"); }

function atomicWrite(path: string, content: string): void {
  const temporaryPath = `${path}.tmp`;
  try { writeFileSync(temporaryPath, content, "utf8"); renameSync(temporaryPath, path); } finally { if (existsSync(temporaryPath)) unlinkSync(temporaryPath); }
}

function nextIntakeId(database: Database.Database): string {
  const rows = database.prepare("SELECT id FROM intakes").all() as { id: string }[];
  const sequence = rows.reduce((maximum, row) => Math.max(maximum, Number(row.id.slice("INTAKE-".length)) || 0), 0) + 1;
  return `INTAKE-${String(sequence).padStart(3, "0")}`;
}

function renderIntake(record: IntakeRecord, proposals: ProposalRecord[], reviews: ProposalReviewRecord[]): string {
  const history = reviews.length === 0 ? "- No proposal decisions recorded." : reviews.map((review) => `- ${review.created_at}: ${review.proposal_id} ${review.decision}${review.superseding_proposal_id ? `; superseded by ${review.superseding_proposal_id}` : ""}.`).join("\n");
  const versions = proposals.length === 0 ? "- No proposals recorded." : proposals.map((proposal) => `- ${proposal.id} v${proposal.version}: ${proposal.status}${proposal.parent_proposal_id ? `; follows ${proposal.parent_proposal_id}` : ""}.`).join("\n");
  return `# ${record.id}: Intent Intake\n\n## Status\n\n${record.status}\n\n## Original Intent\n\n${record.original_intent}\n\n## Integrity\n\n- Algorithm: SHA-256\n- Representation: UTF-8 bytes of Original Intent exactly as captured\n- Hash: ${record.content_hash}\n\n## Proposal Versions\n\n${versions}\n\n## Review History\n\n${history}\n\n## Approved Proposal\n\n${record.approved_proposal_id ?? "None"}\n\n## Record\n\n- Created: ${record.created_at}\n- SQLite record: ${record.id}\n- Artifact: ${record.markdown_path}\n`;
}

function renderProposal(record: ProposalRecord, reviews: ProposalReviewRecord[]): string {
  const history = reviews.length === 0 ? "- No decisions recorded." : reviews.map((review) => `- ${review.created_at}: ${review.decision}${review.superseding_proposal_id ? `; superseded by ${review.superseding_proposal_id}` : ""}.`).join("\n");
  return `# ${record.id}\n\n## Status\n\n${record.status}\n\n## Intake\n\n${record.intake_id}\n\n## Version\n\n${record.version}\n\n## Previous Version\n\n${record.parent_proposal_id ?? "None"}\n\n## Integrity\n\n- Algorithm: SHA-256\n- Representation: UTF-8 bytes of canonical Proposal JSON\n- Hash: ${record.content_hash}\n\n## Review History\n\n${history}\n\n## Proposal\n\n\`\`\`json\n${record.proposal_json}\n\`\`\`\n`;
}

function listReviews(database: Database.Database, intakeId: string): ProposalReviewRecord[] { return database.prepare("SELECT * FROM intake_proposal_reviews WHERE intake_id = ? ORDER BY id").all(intakeId) as ProposalReviewRecord[]; }
function syncIntakeMarkdown(database: Database.Database, record: IntakeRecord): void {
  const proposals = database.prepare("SELECT * FROM intake_proposals WHERE intake_id = ? ORDER BY version").all(record.id) as ProposalRecord[];
  const reviews = listReviews(database, record.id);
  atomicWrite(record.markdown_path, renderIntake(record, proposals, reviews));
  for (const proposal of proposals) atomicWrite(proposal.markdown_path, renderProposal(proposal, reviews.filter((review) => review.proposal_id === proposal.id)));
}

export function readIntentInput(direct: string | undefined, inputPath: string | undefined): string {
  if (Boolean(direct) === Boolean(inputPath)) throw new Error("Provide exactly one original Intent: an argument or --input <file>.");
  const content = inputPath ? readFileSync(inputPath, "utf8") : direct!;
  if (content.length === 0) throw new Error("Original Intent must not be empty.");
  return content;
}

export function createIntake(databasePath: string, workspaceRoot: string, originalIntent: string): IntakeRecord {
  const database = new Database(databasePath); database.pragma("foreign_keys = ON");
  try {
    const id = nextIntakeId(database); const now = new Date().toISOString(); const markdownPath = join(workspaceRoot, "agent", "intakes", `${id}.md`);
    mkdirSync(join(workspaceRoot, "agent", "intakes"), { recursive: true });
    const record: IntakeRecord = { id, original_intent: originalIntent, content_hash: hash(originalIntent), status: "captured", approved_proposal_id: null, created_at: now, updated_at: now, markdown_path: markdownPath };
    database.transaction(() => database.prepare("INSERT INTO intakes (id, original_intent, content_hash, status, approved_proposal_id, created_at, updated_at, markdown_path) VALUES (@id, @original_intent, @content_hash, @status, @approved_proposal_id, @created_at, @updated_at, @markdown_path)").run(record))();
    try { syncIntakeMarkdown(database, record); } catch (error) { database.prepare("DELETE FROM intakes WHERE id = ?").run(id); throw error; }
    return record;
  } finally { database.close(); }
}

export function getIntake(databasePath: string, id: string): IntakeRecord | null { const database = new Database(databasePath, { readonly: true }); try { return (database.prepare("SELECT * FROM intakes WHERE id = ?").get(id.toUpperCase()) as IntakeRecord | undefined) ?? null; } finally { database.close(); } }

export function verifyIntake(record: IntakeRecord): { valid: boolean; message: string } {
  if (!existsSync(record.markdown_path)) return { valid: false, message: `Intake Markdown is missing: ${record.markdown_path}` };
  const markdown = readFileSync(record.markdown_path, "utf8");
  const expected = `## Original Intent\n\n${record.original_intent}\n\n## Integrity`;
  const valid = hash(record.original_intent) === record.content_hash && markdown.includes(expected) && markdown.includes(`Hash: ${record.content_hash}`);
  return { valid, message: valid ? "SQLite and Markdown integrity verified." : "Intake content or Markdown does not match SQLite." };
}

export function parseProposal(text: string): Proposal {
  let proposal: Proposal; try { proposal = JSON.parse(text) as Proposal; } catch { throw new Error("Proposal must be valid JSON."); }
  if (proposal.schemaVersion !== 1 || !proposal.rationale?.trim() || !proposal.context?.trim() || !Array.isArray(proposal.units) || proposal.units.length === 0 || !Array.isArray(proposal.relationships)) throw new Error("Proposal requires schemaVersion 1, rationale, context, units, and relationships.");
  const unitIds = new Set<string>(); const taskIds = new Set<string>(); const orders = new Set<number>();
  for (const unit of proposal.units) {
    if (!unit.id?.match(/^unit-[a-z0-9-]+$/) || unitIds.has(unit.id)) throw new Error("Every proposal unit requires a unique unit-... id.");
    unitIds.add(unit.id);
    if (!["standalone", "new-build", "existing-build"].includes(unit.type) || !Array.isArray(unit.tasks) || unit.tasks.length === 0) throw new Error("Every proposal unit needs a valid type and at least one task.");
    if (unit.type === "standalone" && unit.tasks.length !== 1) throw new Error("A standalone unit must contain exactly one task.");
    if (unit.type === "new-build" && !unit.title?.trim()) throw new Error("A new-build unit requires a title.");
    if (unit.type === "existing-build" && !unit.buildId?.match(/^BUILD-\d+$/)) throw new Error("An existing-build unit requires a BUILD-### buildId.");
    if (!unit.justification?.trim()) throw new Error("Every proposal unit requires planning justification.");
    for (const task of unit.tasks) {
      if (!task.id?.match(/^task-[a-z0-9-]+$/) || taskIds.has(task.id) || !task.title?.trim() || !task.intent?.trim() || !task.outcome?.trim() || !task.scope?.trim() || !task.risk?.trim() || !task.runSize?.trim() || !Number.isSafeInteger(task.order) || task.order < 1 || orders.has(task.order) || !Array.isArray(task.dependencies)) throw new Error("Every proposed task requires unique task-... id, title, intent, outcome, scope, risk, runSize, dependencies, and a unique positive order.");
      taskIds.add(task.id); orders.add(task.order);
    }
  }
  for (const unit of proposal.units) for (const task of unit.tasks) for (const dependency of task.dependencies) if (!taskIds.has(dependency) || dependency === task.id) throw new Error(`Task ${task.id} has an invalid dependency.`);
  const relationships = new Set<string>();
  for (const relationship of proposal.relationships) { if (!unitIds.has(relationship.from) || !unitIds.has(relationship.to) || relationship.from === relationship.to || !relationship.type?.trim() || !relationship.rationale?.trim() || relationships.has(`${relationship.from}:${relationship.to}:${relationship.type}`)) throw new Error("Relationships must link distinct known units with type and rationale."); relationships.add(`${relationship.from}:${relationship.to}:${relationship.type}`); }
  return proposal;
}

export function createProposal(databasePath: string, workspaceRoot: string, intakeId: string, source: string): ProposalRecord {
  const proposal = parseProposal(source); const database = new Database(databasePath); database.pragma("foreign_keys = ON");
  try {
    const intake = database.prepare("SELECT * FROM intakes WHERE id = ?").get(intakeId.toUpperCase()) as IntakeRecord | undefined;
    if (!intake) throw new Error(`Intake ${intakeId.toUpperCase()} not found.`);
    if (["approved", "materialized", "rejected"].includes(intake.status)) throw new Error(`Intake ${intake.id} cannot receive a new proposal from ${intake.status}.`);
    for (const unit of proposal.units.filter((item) => item.type === "existing-build")) if (!database.prepare("SELECT id FROM builds WHERE id = ?").get(unit.buildId)) throw new Error(`Build ${unit.buildId} not found.`);
    const previous = database.prepare("SELECT * FROM intake_proposals WHERE intake_id = ? ORDER BY version DESC LIMIT 1").get(intake.id) as ProposalRecord | undefined;
    if (previous && previous.status !== "changes_requested") throw new Error(`Intake ${intake.id} needs a changes-requested decision before a new proposal version.`);
    const version = (previous?.version ?? 0) + 1; const id = `${intake.id}-PROPOSAL-${String(version).padStart(3, "0")}`; const now = new Date().toISOString();
    const directory = join(workspaceRoot, "agent", "intakes", intake.id); mkdirSync(directory, { recursive: true });
    const canonicalJson = JSON.stringify(proposal, null, 2);
    const record: ProposalRecord = { id, intake_id: intake.id, version, status: "proposed", parent_proposal_id: previous?.id ?? null, content_hash: hash(canonicalJson), proposal_json: canonicalJson, created_at: now, updated_at: now, markdown_path: join(directory, `proposal-${String(version).padStart(3, "0")}.md`) };
    database.transaction(() => { database.prepare("INSERT INTO intake_proposals (id, intake_id, version, status, parent_proposal_id, content_hash, proposal_json, created_at, updated_at, markdown_path) VALUES (@id, @intake_id, @version, @status, @parent_proposal_id, @content_hash, @proposal_json, @created_at, @updated_at, @markdown_path)").run(record); if (previous) database.prepare("UPDATE intake_proposal_reviews SET superseding_proposal_id = ? WHERE proposal_id = ? AND decision = 'changes_requested'").run(id, previous.id); database.prepare("UPDATE intakes SET status = 'planning', updated_at = ? WHERE id = ?").run(now, intake.id); })();
    syncIntakeMarkdown(database, { ...intake, status: "planning", updated_at: now });
    return record;
  } finally { database.close(); }
}

export function getProposal(databasePath: string, id: string): ProposalRecord | null { const database = new Database(databasePath, { readonly: true }); try { return (database.prepare("SELECT * FROM intake_proposals WHERE id = ?").get(id.toUpperCase()) as ProposalRecord | undefined) ?? null; } finally { database.close(); } }

export function reviewProposal(databasePath: string, proposalId: string, action: "changes-requested" | "rejected" | "approved"): ProposalRecord {
  const database = new Database(databasePath); database.pragma("foreign_keys = ON");
  try {
    const proposal = database.prepare("SELECT * FROM intake_proposals WHERE id = ?").get(proposalId.toUpperCase()) as ProposalRecord | undefined;
    if (!proposal) throw new Error(`Proposal ${proposalId.toUpperCase()} not found.`);
    if (proposal.status !== "proposed") throw new Error(`Proposal ${proposal.id} cannot transition from ${proposal.status}.`);
    const intake = database.prepare("SELECT * FROM intakes WHERE id = ?").get(proposal.intake_id) as IntakeRecord;
    const now = new Date().toISOString();
    database.transaction(() => {
      database.prepare("UPDATE intake_proposals SET status = ?, updated_at = ? WHERE id = ?").run(action === "changes-requested" ? "changes_requested" : action, now, proposal.id);
      database.prepare("INSERT INTO intake_proposal_reviews (intake_id, proposal_id, decision, superseding_proposal_id, created_at) VALUES (?, ?, ?, NULL, ?)").run(proposal.intake_id, proposal.id, action, now);
      database.prepare("UPDATE intakes SET status = ?, approved_proposal_id = ?, updated_at = ? WHERE id = ?").run(action === "changes-requested" ? "changes_requested" : action, action === "approved" ? proposal.id : null, now, proposal.intake_id);
    })();
    const updated = { ...proposal, status: action === "changes-requested" ? "changes_requested" : action, updated_at: now } as ProposalRecord;
    const intakeStatus: IntakeStatus = action === "changes-requested" ? "changes_requested" : action;
    syncIntakeMarkdown(database, { ...intake, status: intakeStatus, approved_proposal_id: action === "approved" ? proposal.id : null, updated_at: now });
    return updated;
  } finally { database.close(); }
}

export function intakeStatus(databasePath: string, intakeId: string): { intake: IntakeRecord; proposals: ProposalRecord[]; reviews: ProposalReviewRecord[] } {
  const database = new Database(databasePath, { readonly: true }); try { const intake = database.prepare("SELECT * FROM intakes WHERE id = ?").get(intakeId.toUpperCase()) as IntakeRecord | undefined; if (!intake) throw new Error(`Intake ${intakeId.toUpperCase()} not found.`); return { intake, proposals: database.prepare("SELECT * FROM intake_proposals WHERE intake_id = ? ORDER BY version").all(intake.id) as ProposalRecord[], reviews: listReviews(database, intake.id) }; } finally { database.close(); }
}

export function applyProposal(databasePath: string, workspaceRoot: string, proposalId: string, dryRun: boolean): string[] {
  const proposalRecord = getProposal(databasePath, proposalId); if (!proposalRecord) throw new Error(`Proposal ${proposalId.toUpperCase()} not found.`);
  if (proposalRecord.status !== "approved") throw new Error(`Proposal ${proposalRecord.id} is not explicitly approved.`);
  const proposal = JSON.parse(proposalRecord.proposal_json) as Proposal; const summary = proposal.units.flatMap((unit) => unit.tasks.map((task) => `${unit.type}${unit.buildId ? `:${unit.buildId}` : unit.title ? `:${unit.title}` : ""} -> ${task.title}`));
  if (dryRun) return summary;
  const repository = openRepository(databasePath);
  try {
    for (const unit of proposal.units) { let buildId: string | undefined = unit.type === "existing-build" ? unit.buildId : undefined; if (unit.type === "new-build") buildId = createBuildFromIntent(databasePath, workspaceRoot, unit.title!).build.id; for (const task of unit.tasks) createTaskFromIntent(databasePath, workspaceRoot, task.intent, { force: true, buildId }); if (buildId && unit.type === "new-build") { const build = repository.getBuild(buildId)!; syncBuildMarkdown(workspaceRoot, build, repository.listTasksByBuild(buildId)); } }
    const now = new Date().toISOString(); repository.setMetadata(`intake_apply:${proposalRecord.id}`, JSON.stringify(summary)); const database = new Database(databasePath); try { database.prepare("UPDATE intakes SET status = 'materialized', updated_at = ? WHERE id = ?").run(now, proposalRecord.intake_id); database.prepare("UPDATE intake_proposals SET status = 'materialized', updated_at = ? WHERE id = ?").run(now, proposalRecord.id); } finally { database.close(); } return summary;
  } finally { repository.close(); }
}

export function createPlanningEntrypoint(workspaceRoot: string, intake: IntakeRecord): string { const path = join(workspaceRoot, "agent", "intakes", intake.id, "planning.md"); const context = discoverContext(workspaceRoot, join(workspaceRoot, "nerv.db")); mkdirSync(join(workspaceRoot, "agent", "intakes", intake.id), { recursive: true }); atomicWrite(path, `# Portable planning package for ${intake.id}\n\nGive this package to any external agent. Nerv does not call models, providers, SDKs, or APIs. The agent returns JSON; it does not need an active Run, Product Session, or remembered conversation.\n\n## Read\n\n- \`../${intake.id}.md\` (immutable original Intent)\n${context.productContext.available ? "- `../../../product/` (available Product Context)" : "- Product Context is not available."}\n${context.repoContext.available ? "- `../../../repo/development.md` (available Repo Context)" : "- Repo Context is not available."}\n\n## Submit\n\n\`nerv intake propose ${intake.id} --input proposal.json\`\n\n## Proposal JSON schema\n\n\`schemaVersion\` must be \`1\`. Include non-empty \`rationale\`, \`context\`, \`units\`, and \`relationships\`. Every unit has a unique \`unit-...\` id, \`justification\`, and type: \`standalone\` (exactly one Task), \`new-build\` (title plus Tasks), or \`existing-build\` (a real \`buildId\` plus Tasks). Every Task has a unique \`task-...\` id, title, intent, outcome, scope, dependencies, unique positive order, risk, and runSize. Relationships link two unit IDs with type and rationale.\n\nUse \`nerv intake proposal <PROPOSAL-ID>\`, \`nerv intake review <PROPOSAL-ID> --action approved\`, and \`nerv intake apply <PROPOSAL-ID> --dry-run\` after submission.\n`); return path; }
