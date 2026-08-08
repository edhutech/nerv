import Database from "better-sqlite3";

const SCHEMA_VERSION = "1";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS work_items (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('planned', 'active', 'review', 'rework', 'closed')),
    intent TEXT NOT NULL, goal TEXT NOT NULL, scope TEXT NOT NULL, acceptance_criteria TEXT NOT NULL,
    validation TEXT NOT NULL, validation_evidence TEXT, git_base_head TEXT, git_baseline_json TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, closed_at TEXT, commit_hash TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, work_item_id TEXT NOT NULL REFERENCES work_items(id), title TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'done', 'blocked')),
    scope TEXT NOT NULL, acceptance_criteria TEXT NOT NULL, validation TEXT NOT NULL,
    validation_evidence TEXT, block_reason TEXT, attribution_json TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
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
  `CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL CHECK(type IN ('decision', 'architecture', 'discovery', 'pattern')),
    title TEXT NOT NULL, content TEXT NOT NULL, work_item_id TEXT REFERENCES work_items(id),
    topic_key TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(title, content, content='knowledge', content_rowid='id')`,
  `CREATE TRIGGER IF NOT EXISTS knowledge_ai AFTER INSERT ON knowledge BEGIN
    INSERT INTO knowledge_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
  END`,
  `CREATE TRIGGER IF NOT EXISTS knowledge_ad AFTER DELETE ON knowledge BEGIN
    INSERT INTO knowledge_fts(knowledge_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
  END`,
  `CREATE TRIGGER IF NOT EXISTS knowledge_au AFTER UPDATE ON knowledge BEGIN
    INSERT INTO knowledge_fts(knowledge_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
    INSERT INTO knowledge_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
  END`,
] as const;

export function initializeDatabase(databasePath: string): void {
  const database = new Database(databasePath);
  try {
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    database.transaction(() => {
      for (const statement of STATEMENTS) database.exec(statement);
      database.prepare(`INSERT INTO metadata (key, value, updated_at) VALUES ('schema_version', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(SCHEMA_VERSION, new Date().toISOString());
    })();
  } finally { database.close(); }
}

export function hasRequiredSchema(databasePath: string): boolean {
  try {
    const database = new Database(databasePath, { readonly: true, fileMustExist: true });
    try {
      const names = new Set((database.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view')").all() as { name: string }[]).map((row) => row.name));
      const version = database.prepare("SELECT value FROM metadata WHERE key = 'schema_version'").get() as { value: string } | undefined;
      return ["metadata", "work_items", "tasks", "work_reviews", "checkpoints", "knowledge", "knowledge_fts"].every((name) => names.has(name)) && version?.value === SCHEMA_VERSION;
    } finally { database.close(); }
  } catch { return false; }
}
