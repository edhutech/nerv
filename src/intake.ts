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
