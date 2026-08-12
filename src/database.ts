import Database from "better-sqlite3";

export const SCHEMA_VERSION = "1";
const REQUIRED_COLUMNS = {
  work_items: ["id", "ref", "title", "status", "intent", "goal", "scope", "expected_touchpoints", "out_of_scope", "acceptance_criteria", "validation", "validation_evidence", "git_baseline_json", "created_at", "updated_at", "closed_at", "commit_hash"],
  tasks: ["id", "work_item_id", "position", "title", "status", "objective", "implementation_approach", "expected_touchpoints", "acceptance_criteria", "validation", "validation_evidence", "attribution_json", "created_at", "updated_at"],
  checkpoints: ["id", "work_item_id", "task_id", "summary", "next_step", "created_at"],
} as const;
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS work_items (
    id TEXT PRIMARY KEY, ref TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'review', 'rework', 'closed')),
    intent TEXT NOT NULL, goal TEXT NOT NULL, scope TEXT NOT NULL,
    expected_touchpoints TEXT NOT NULL, out_of_scope TEXT NOT NULL,
    acceptance_criteria TEXT NOT NULL, validation TEXT NOT NULL,
    validation_evidence TEXT, git_baseline_json TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, closed_at TEXT, commit_hash TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS one_open_work_item ON work_items(status) WHERE status <> 'closed'`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, work_item_id TEXT NOT NULL REFERENCES work_items(id), position INTEGER NOT NULL,
    title TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'done')),
    objective TEXT NOT NULL, implementation_approach TEXT NOT NULL, expected_touchpoints TEXT NOT NULL,
    acceptance_criteria TEXT NOT NULL, validation TEXT NOT NULL,
    validation_evidence TEXT, attribution_json TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(work_item_id, position)
  )`,
  `CREATE TABLE IF NOT EXISTS work_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, work_item_id TEXT NOT NULL REFERENCES work_items(id),
    outcome TEXT NOT NULL CHECK(outcome IN ('PASS', 'REWORK')), summary TEXT NOT NULL,
    findings TEXT, validation_evidence TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT, work_item_id TEXT NOT NULL REFERENCES work_items(id),
    task_id TEXT REFERENCES tasks(id), summary TEXT NOT NULL, next_step TEXT, created_at TEXT NOT NULL
  )`,
] as const;

export function initializeDatabase(databasePath: string): void {
  const database = new Database(databasePath);
  try {
    database.pragma("journal_mode = WAL"); database.pragma("foreign_keys = ON");
    database.transaction(() => {
      const existing = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'metadata'").get();
      const version = existing ? (database.prepare("SELECT value FROM metadata WHERE key = 'schema_version'").get() as { value: string } | undefined)?.value : undefined;
      if (version && version !== SCHEMA_VERSION) throw new Error("existing .nerv/nerv.db uses an unsupported generated schema; remove .nerv and run `nerv init` again");
      for (const statement of STATEMENTS) database.exec(statement);
      database.prepare("INSERT INTO metadata (key, value, updated_at) VALUES ('schema_version', ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at").run(SCHEMA_VERSION, new Date().toISOString());
    })();
  } finally { database.close(); }
}

export function hasRequiredSchema(databasePath: string): boolean {
  try {
    const database = new Database(databasePath, { readonly: true, fileMustExist: true });
    try {
      const names = new Set((database.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'index')").all() as { name: string }[]).map((row) => row.name));
      const version = database.prepare("SELECT value FROM metadata WHERE key = 'schema_version'").get() as { value: string } | undefined;
      const columns = (table: keyof typeof REQUIRED_COLUMNS) => (database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((row) => row.name);
      const definition = (name: string) => (database.prepare("SELECT sql FROM sqlite_master WHERE name = ?").get(name) as { sql: string } | undefined)?.sql.replace(/\s+/g, " ") ?? "";
      return ["metadata", "work_items", "tasks", "work_reviews", "checkpoints", "one_open_work_item"].every((name) => names.has(name)) && version?.value === SCHEMA_VERSION && Object.entries(REQUIRED_COLUMNS).every(([table, required]) => JSON.stringify(columns(table as keyof typeof REQUIRED_COLUMNS)) === JSON.stringify(required)) && definition("work_items").includes("CHECK(status IN ('active', 'review', 'rework', 'closed'))") && definition("tasks").includes("CHECK(status IN ('pending', 'active', 'done'))") && definition("one_open_work_item") === "CREATE UNIQUE INDEX one_open_work_item ON work_items(status) WHERE status <> 'closed'";
    } finally { database.close(); }
  } catch { return false; }
}
