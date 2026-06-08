import Database from "better-sqlite3";

const REQUIRED_TABLES = [
  "builds",
  "tasks",
  "runs",
  "checkpoints",
  "reviews",
  "decisions",
  "status_history",
  "metadata",
] as const;

const REQUIRED_COLUMNS: Record<(typeof REQUIRED_TABLES)[number], readonly string[]> = {
  builds: ["id", "title", "status", "created_at", "updated_at", "closed_at"],
  tasks: ["id", "build_id", "title", "status", "created_at", "updated_at", "closed_at"],
  runs: ["id", "task_id", "status", "created_at", "updated_at", "closed_at"],
  checkpoints: ["id", "run_id", "summary", "created_at"],
  reviews: ["id", "run_id", "outcome", "summary", "created_at"],
  decisions: ["id", "scope_type", "scope_id", "summary", "created_at"],
  status_history: ["id", "entity_type", "entity_id", "status", "created_at"],
  metadata: ["key", "value", "updated_at"],
};

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS builds (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    build_id TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT,
    FOREIGN KEY (build_id) REFERENCES builds(id)
  )`,
  `CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  )`,
  `CREATE TABLE IF NOT EXISTS checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES runs(id)
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    outcome TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES runs(id)
  )`,
  `CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope_type TEXT NOT NULL,
    scope_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
] as const;

export function initializeDatabase(databasePath: string): void {
  const database = openDatabase(databasePath);

  try {
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");

    const initialize = database.transaction(() => {
      for (const statement of SCHEMA_STATEMENTS) {
        database.exec(statement);
      }

      assertRequiredSchema(database);

      database
        .prepare(
          `INSERT OR IGNORE INTO metadata (key, value, updated_at)
           VALUES (@key, @value, @updatedAt)`,
        )
        .run({
          key: "schema_version",
          value: "1",
          updatedAt: new Date().toISOString(),
        });
    });

    initialize();
  } finally {
    database.close();
  }
}

export function hasRequiredSchema(databasePath: string): boolean {
  const database = openDatabase(databasePath, { readonly: true, fileMustExist: true });

  try {
    return hasRequiredSchemaInDatabase(database);
  } catch {
    return false;
  } finally {
    database.close();
  }
}

function assertRequiredSchema(database: Database.Database): void {
  if (!hasRequiredSchemaInDatabase(database)) {
    throw new Error("existing .nerv/nerv.db does not match the expected Nerv schema");
  }
}

function hasRequiredSchemaInDatabase(database: Database.Database): boolean {
  type SqliteTableRow = { name: string };
  const tableNameValues = new Set(
    (database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as SqliteTableRow[]).map(
      (row) => row.name,
    ),
  );

  for (const tableName of REQUIRED_TABLES) {
    if (!tableNameValues.has(tableName)) {
      return false;
    }

    if (!hasRequiredColumns(database, tableName)) {
      return false;
    }
  }

  return true;
}

function hasRequiredColumns(database: Database.Database, tableName: (typeof REQUIRED_TABLES)[number]): boolean {
  type SqliteColumnRow = { name: string };
  const columnNames = new Set(
    (database.prepare(`PRAGMA table_info(${tableName})`).all() as SqliteColumnRow[]).map((row) => row.name),
  );

  return REQUIRED_COLUMNS[tableName].every((columnName) => columnNames.has(columnName));
}

function openDatabase(databasePath: string, options?: Database.Options): Database.Database {
  return new Database(databasePath, options);
}
