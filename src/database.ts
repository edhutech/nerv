import Database from "better-sqlite3";

const SCHEMA_VERSION = "3";
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS work_items (
    id TEXT PRIMARY KEY, ref TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('planned', 'active', 'review', 'rework', 'closed')),
    intent TEXT NOT NULL, goal TEXT NOT NULL, scope TEXT NOT NULL, acceptance_criteria TEXT NOT NULL,
    validation TEXT NOT NULL, validation_evidence TEXT, git_base_head TEXT, git_baseline_json TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, closed_at TEXT, commit_hash TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, work_item_id TEXT NOT NULL REFERENCES work_items(id), position INTEGER NOT NULL,
    title TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'done', 'blocked')),
    scope TEXT NOT NULL, acceptance_criteria TEXT NOT NULL, validation TEXT NOT NULL,
    validation_evidence TEXT, block_reason TEXT, attribution_json TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(work_item_id, position)
  )`,
  `CREATE TABLE IF NOT EXISTS work_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, work_item_id TEXT NOT NULL REFERENCES work_items(id),
    outcome TEXT NOT NULL CHECK(outcome IN ('PASS', 'REWORK')), summary TEXT NOT NULL,
    findings TEXT, validation_evidence TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT, work_item_id TEXT NOT NULL REFERENCES work_items(id),
    task_id TEXT REFERENCES tasks(id), summary TEXT NOT NULL, files TEXT, decisions TEXT,
    unresolved_issue TEXT, next_step TEXT, created_at TEXT NOT NULL
  )`,
] as const;

export function initializeDatabase(databasePath: string): void {
  const database = new Database(databasePath);
  try {
    database.pragma("journal_mode = WAL"); database.pragma("foreign_keys = ON");
    database.transaction(() => {
      const existing = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'metadata'").get();
      const version = existing ? (database.prepare("SELECT value FROM metadata WHERE key = 'schema_version'").get() as { value: string } | undefined)?.value : undefined;
      if (version === "2") {
        database.exec("DROP TRIGGER IF EXISTS knowledge_ai; DROP TRIGGER IF EXISTS knowledge_ad; DROP TRIGGER IF EXISTS knowledge_au; DROP TABLE IF EXISTS knowledge_fts; DROP TABLE IF EXISTS knowledge;");
      } else if (version && version !== SCHEMA_VERSION) throw new Error("existing .nerv/nerv.db is not a compatible Nerv database; remove generated .nerv state and run `nerv init` again");
      for (const statement of STATEMENTS) database.exec(statement);
      database.prepare(`INSERT INTO metadata (key, value, updated_at) VALUES ('schema_version', ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).run(SCHEMA_VERSION, new Date().toISOString());
    })();
  } finally { database.close(); }
}
export function hasRequiredSchema(databasePath: string): boolean {
  try {
    const database = new Database(databasePath, { readonly: true, fileMustExist: true });
    try {
      const names = new Set((database.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view')").all() as { name: string }[]).map((row) => row.name));
      const version = database.prepare("SELECT value FROM metadata WHERE key = 'schema_version'").get() as { value: string } | undefined;
       return ["metadata", "work_items", "tasks", "work_reviews", "checkpoints"].every((name) => names.has(name)) && version?.value === SCHEMA_VERSION;
    } finally { database.close(); }
  } catch { return false; }
}
export function canUpgradeKnowledgeSchema(databasePath: string): boolean {
  try {
    const database = new Database(databasePath, { readonly: true, fileMustExist: true });
    try { return (database.prepare("SELECT value FROM metadata WHERE key = 'schema_version'").get() as { value: string } | undefined)?.value === "2"; } finally { database.close(); }
  } catch { return false; }
}
