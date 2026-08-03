import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import Database from "better-sqlite3";

export type IntakeRecord = {
  id: string;
  original_intent: string;
  content_hash: string;
  status: string;
  created_at: string;
  updated_at: string;
  markdown_path: string;
};
export type ProposalRecord = { id: string; intake_id: string; version: number; status: string; proposal_json: string; created_at: string; updated_at: string; markdown_path: string };
type Proposal = { rationale: string; context: string; units: Array<{ type: "standalone" | "new-build" | "existing-build"; title?: string; buildId?: string; tasks: Array<{ title: string; intent: string; outcome: string; scope: string; dependencies?: string[]; order?: number; risk?: string; runSize?: string }> }>; relationships?: Array<{ from: string; to: string; type: string }> };

function hash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function nextId(database: Database.Database): string {
  const row = database.prepare("SELECT id FROM intakes ORDER BY id DESC LIMIT 1").get() as { id: string } | undefined;
  const sequence = row ? Number(row.id.slice("INTAKE-".length)) + 1 : 1;
  return `INTAKE-${String(sequence).padStart(3, "0")}`;
}

export function readIntentInput(direct: string | undefined, inputPath: string | undefined): string {
  if (Boolean(direct) === Boolean(inputPath)) {
    throw new Error("Provide exactly one original Intent: an argument or --input <file>.");
  }
  const content = inputPath ? readFileSync(inputPath, "utf8") : direct!;
  if (content.length === 0) {
    throw new Error("Original Intent must not be empty.");
  }
  return content;
}

export function createIntake(databasePath: string, workspaceRoot: string, originalIntent: string): IntakeRecord {
  const database = new Database(databasePath);
  database.pragma("foreign_keys = ON");
  const id = nextId(database);
  const now = new Date().toISOString();
  const contentHash = hash(originalIntent);
  const directory = join(workspaceRoot, "agent", "intakes");
  const markdownPath = join(directory, `${id}.md`);
  const temporaryPath = `${markdownPath}.tmp`;
  mkdirSync(directory, { recursive: true });
  const markdown = `# ${id}: Intent Intake\n\n## Status\n\nCaptured\n\n## Original Intent\n\n${originalIntent}\n\n## Integrity\n\n- Algorithm: SHA-256\n- Representation: UTF-8 bytes of Original Intent exactly as captured\n- Hash: ${contentHash}\n\n## Record\n\n- Created: ${now}\n- SQLite record: ${id}\n- Artifact: ${markdownPath}\n`;
  try {
    writeFileSync(temporaryPath, markdown, "utf8");
    const record: IntakeRecord = { id, original_intent: originalIntent, content_hash: contentHash, status: "captured", created_at: now, updated_at: now, markdown_path: markdownPath };
    database.transaction(() => database.prepare(`INSERT INTO intakes (id, original_intent, content_hash, status, created_at, updated_at, markdown_path) VALUES (@id, @original_intent, @content_hash, @status, @created_at, @updated_at, @markdown_path)`).run(record))();
    try { renameSync(temporaryPath, markdownPath); } catch (error) {
      database.prepare("DELETE FROM intakes WHERE id = ?").run(id);
      throw error;
    }
    return record;
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    database.close();
  }
}

export function getIntake(databasePath: string, id: string): IntakeRecord | null {
  const database = new Database(databasePath, { readonly: true });
  try { return (database.prepare("SELECT * FROM intakes WHERE id = ?").get(id.toUpperCase()) as IntakeRecord | undefined) ?? null; } finally { database.close(); }
}

export function verifyIntake(record: IntakeRecord): { valid: boolean; message: string } {
  if (!existsSync(record.markdown_path)) return { valid: false, message: `Intake Markdown is missing: ${record.markdown_path}` };
  const valid = hash(record.original_intent) === record.content_hash && readFileSync(record.markdown_path, "utf8").includes(`Hash: ${record.content_hash}`);
  return { valid, message: valid ? "SQLite and Markdown integrity verified." : "Intake content or Markdown hash does not match SQLite." };
}

function parseProposal(text: string): Proposal {
  let proposal: Proposal;
  try { proposal = JSON.parse(text) as Proposal; } catch { throw new Error("Proposal must be valid JSON."); }
  if (!proposal.rationale?.trim() || !proposal.context?.trim() || !Array.isArray(proposal.units) || proposal.units.length === 0) throw new Error("Proposal requires rationale, context, and at least one unit.");
  for (const unit of proposal.units) {
    if (!['standalone', 'new-build', 'existing-build'].includes(unit.type) || !Array.isArray(unit.tasks) || unit.tasks.length === 0) throw new Error("Every proposal unit needs a valid type and at least one task.");
    if (unit.type === 'standalone' && unit.tasks.length !== 1) throw new Error("A standalone unit must contain exactly one task.");
    if (unit.type === 'new-build' && !unit.title?.trim()) throw new Error("A new-build unit requires a title.");
    if (unit.type === 'existing-build' && !unit.buildId?.match(/^BUILD-\d+$/)) throw new Error("An existing-build unit requires a BUILD-### buildId.");
    for (const task of unit.tasks) if (!task.title?.trim() || !task.intent?.trim() || !task.outcome?.trim() || !task.scope?.trim()) throw new Error("Every proposed task requires title, intent, outcome, and scope.");
  }
  return proposal;
}

export function createProposal(databasePath: string, workspaceRoot: string, intakeId: string, source: string): ProposalRecord {
  const proposal = parseProposal(source); const database = new Database(databasePath); database.pragma("foreign_keys = ON");
  try {
    const intake = database.prepare("SELECT id FROM intakes WHERE id = ?").get(intakeId.toUpperCase()); if (!intake) throw new Error(`Intake ${intakeId.toUpperCase()} not found.`);
    for (const unit of proposal.units.filter((item) => item.type === 'existing-build')) if (!database.prepare("SELECT id FROM builds WHERE id = ?").get(unit.buildId)) throw new Error(`Build ${unit.buildId} not found.`);
    const version = (database.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM intake_proposals WHERE intake_id = ?").get(intakeId.toUpperCase()) as { version: number }).version + 1;
    const id = `${intakeId.toUpperCase()}-PROPOSAL-${String(version).padStart(3, '0')}`; const now = new Date().toISOString(); const directory = join(workspaceRoot, 'agent', 'intakes', intakeId.toUpperCase()); mkdirSync(directory, { recursive: true }); const markdown_path = join(directory, `proposal-${String(version).padStart(3, '0')}.md`);
    const record: ProposalRecord = { id, intake_id: intakeId.toUpperCase(), version, status: 'proposed', proposal_json: JSON.stringify(proposal, null, 2), created_at: now, updated_at: now, markdown_path };
    writeFileSync(markdown_path, `# ${id}\n\n## Status\n\nProposed\n\n## Intake\n\n${record.intake_id}\n\n## Version\n\n${version}\n\n## Proposal\n\n\`\`\`json\n${record.proposal_json}\n\`\`\`\n`, 'utf8');
    database.prepare("INSERT INTO intake_proposals (id,intake_id,version,status,proposal_json,created_at,updated_at,markdown_path) VALUES (@id,@intake_id,@version,@status,@proposal_json,@created_at,@updated_at,@markdown_path)").run(record); return record;
  } finally { database.close(); }
}

export function getProposal(databasePath: string, id: string): ProposalRecord | null { const database = new Database(databasePath, { readonly: true }); try { return (database.prepare("SELECT * FROM intake_proposals WHERE id = ?").get(id.toUpperCase()) as ProposalRecord | undefined) ?? null; } finally { database.close(); } }
export function createPlanningEntrypoint(workspaceRoot: string, intake: IntakeRecord): string { const path = join(workspaceRoot, 'agent', 'intakes', intake.id, 'planning.md'); mkdirSync(join(workspaceRoot, 'agent', 'intakes', intake.id), { recursive: true }); writeFileSync(path, `# Planning entrypoint for ${intake.id}\n\nRead \`${intake.markdown_path}\` and return a JSON proposal to \`nerv intake propose ${intake.id} --input proposal.json\`. Nerv calls no agents or APIs. The JSON must contain rationale, context, units, and optional relationships. Units are standalone (one task), new-build (title plus tasks), or existing-build (buildId plus tasks). Each task needs title, intent, outcome, scope, optional dependencies, order, risk, and runSize.\n`, 'utf8'); return path; }
