import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

export const SCHEMA_VERSION = "1";
export const UNSUPPORTED_SCHEMA = "existing .nerv/nerv.db uses an unsupported generated schema; use a compatible/current Nerv version, or back up .nerv before intentionally discarding it";
const STATEMENTS = [
  "CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE work_items (id TEXT PRIMARY KEY, ref TEXT NOT NULL UNIQUE, title TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('active', 'review', 'rework', 'closed')), intent TEXT NOT NULL, goal TEXT NOT NULL, scope TEXT NOT NULL, expected_touchpoints TEXT NOT NULL, out_of_scope TEXT NOT NULL, acceptance_criteria TEXT NOT NULL, validation TEXT NOT NULL, validation_evidence TEXT, git_baseline_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, closed_at TEXT, commit_hash TEXT)",
  "CREATE UNIQUE INDEX one_open_work_item ON work_items((1)) WHERE status <> 'closed'",
  "CREATE TABLE tasks (id TEXT PRIMARY KEY, work_item_id TEXT NOT NULL REFERENCES work_items(id), position INTEGER NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'done')), objective TEXT NOT NULL, implementation_approach TEXT NOT NULL, expected_touchpoints TEXT NOT NULL, acceptance_criteria TEXT NOT NULL, validation TEXT NOT NULL, validation_evidence TEXT, attribution_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(work_item_id, position))",
  "CREATE TABLE work_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, work_item_id TEXT NOT NULL REFERENCES work_items(id), outcome TEXT NOT NULL CHECK(outcome IN ('PASS', 'REWORK')), summary TEXT NOT NULL, findings TEXT, remediation_json TEXT, validation_evidence TEXT NOT NULL, git_fingerprint_json TEXT, verification_evidence TEXT, created_at TEXT NOT NULL)",
  "CREATE TABLE checkpoints (id INTEGER PRIMARY KEY AUTOINCREMENT, work_item_id TEXT NOT NULL REFERENCES work_items(id), task_id TEXT REFERENCES tasks(id), summary TEXT NOT NULL, next_step TEXT, created_at TEXT NOT NULL)",
] as const;
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const SIGNATURE = new Map(STATEMENTS.map((sql) => {
  const match = /(?:TABLE|INDEX) (?:IF NOT EXISTS )?([a-z_]+)/i.exec(sql);
  return [match![1], normalize(sql)];
}));

export function initializeDatabase(databasePath: string, nextWorkNumber = 1): void {
  const database = new DatabaseSync(databasePath);
  try {
    database.exec("PRAGMA journal_mode = WAL");
    database.exec("PRAGMA foreign_keys = ON");
    const hasObjects = Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' LIMIT 1").get());
    if (hasObjects && !matchesSchema(database)) throw new Error(UNSUPPORTED_SCHEMA);
    if (!hasObjects) transaction(database, () => {
      for (const statement of STATEMENTS) database.exec(statement);
      const timestamp = new Date().toISOString();
      database.prepare("INSERT INTO metadata (key, value, updated_at) VALUES ('schema_version', ?, ?)").run(SCHEMA_VERSION, timestamp);
      database.prepare("INSERT INTO metadata (key, value, updated_at) VALUES ('next_work_number', ?, ?)").run(String(nextWorkNumber), timestamp);
    });
  } finally { database.close(); }
}

function transaction<T>(database: DatabaseSync, operation: () => T): T {
  database.exec("BEGIN");
  try {
    const result = operation();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function matchesSchema(database: DatabaseSync): boolean {
  try {
    const objects = database.prepare("SELECT name, sql FROM sqlite_master WHERE type IN ('table', 'index', 'view', 'trigger') AND name NOT LIKE 'sqlite_%'").all() as { name: string; sql: string | null }[];
    if (objects.length !== SIGNATURE.size || objects.some((object) => !SIGNATURE.has(object.name) || normalize(object.sql ?? "") !== SIGNATURE.get(object.name))) return false;
    const metadata = database.prepare("SELECT key, value FROM metadata").all() as { key: string; value: string }[];
    return metadata.every((entry) => entry.key === "schema_version" || entry.key === "next_work_number") && metadata.find((entry) => entry.key === "schema_version")?.value === SCHEMA_VERSION;
  } catch { return false; }
}

export function hasRequiredSchema(databasePath: string): boolean {
  try {
    if (!existsSync(databasePath)) return false;
    const database = new DatabaseSync(databasePath, { readOnly: true });
    try { return matchesSchema(database); } finally { database.close(); }
  } catch { return false; }
}
