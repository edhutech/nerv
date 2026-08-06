import Database from "better-sqlite3";

const REQUIRED_TABLES = [
  "builds",
  "tasks",
  "runs",
  "checkpoints",
  "reviews",
  "build_reviews",
  "close_records",
  "decisions",
  "status_history",
  "metadata",
  "product_sessions",
  "product_context_proposals",
  "product_context_proposal_reviews",
  "product_context_materializations",
  "intakes",
  "intake_proposals",
  "intake_proposal_reviews",
  "intake_materializations",
  "intake_materialization_items",
] as const;

const REQUIRED_COLUMNS: Record<(typeof REQUIRED_TABLES)[number], readonly string[]> = {
  builds: [
    "id",
    "title",
    "status",
    "created_at",
    "updated_at",
    "closed_at",
    "intent",
    "goal",
    "user_value",
    "scope",
    "out_of_scope",
    "acceptance_criteria",
    "validation",
    "risks",
    "generated_markdown_path",
  ],
  tasks: [
    "id",
    "build_id",
    "title",
    "status",
    "created_at",
    "updated_at",
    "closed_at",
    "intent",
    "scope",
    "out_of_scope",
    "acceptance_criteria",
    "validation",
    "risks",
    "generated_markdown_path",
  ],
  runs: ["id", "task_id", "status", "created_at", "updated_at", "closed_at"],
  checkpoints: ["id", "run_id", "summary", "created_at"],
  reviews: ["id", "run_id", "outcome", "summary", "validation", "evidence", "created_at"],
  build_reviews: ["id", "build_id", "outcome", "summary", "validation", "evidence", "integration", "residual_risks", "follow_up", "created_at"],
  close_records: ["run_id", "commit_hash", "closed_at"],
  decisions: ["id", "scope_type", "scope_id", "summary", "created_at"],
  status_history: ["id", "entity_type", "entity_id", "status", "created_at"],
  metadata: ["key", "value", "updated_at"],
  product_sessions: ["id", "status", "mode", "created_at", "updated_at", "closed_at", "input_manifest"],
  product_context_proposals: ["id", "session_id", "version", "status", "proposal_json", "input_manifest", "created_at", "updated_at", "markdown_path"],
  product_context_proposal_reviews: ["id", "session_id", "proposal_id", "decision", "superseding_proposal_id", "created_at"],
  product_context_materializations: ["id", "session_id", "proposal_id", "status", "plan_json", "decision_replacement_confirmed_at", "created_at", "updated_at"],
  intakes: ["id", "original_intent", "content_hash", "status", "approved_proposal_id", "created_at", "updated_at", "markdown_path"],
  intake_proposals: ["id", "intake_id", "version", "status", "parent_proposal_id", "content_hash", "proposal_json", "created_at", "updated_at", "markdown_path"],
  intake_proposal_reviews: ["id", "intake_id", "proposal_id", "decision", "superseding_proposal_id", "created_at"],
  intake_materializations: ["id", "intake_id", "proposal_id", "status", "plan_json", "created_at", "updated_at"],
  intake_materialization_items: ["materialization_id", "unit_id", "task_ref", "build_id", "task_id", "metadata_json"],
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
    closed_at TEXT,
    intent TEXT,
    goal TEXT,
    user_value TEXT,
    scope TEXT,
    out_of_scope TEXT,
    acceptance_criteria TEXT,
    validation TEXT,
    risks TEXT,
    generated_markdown_path TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    build_id TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT,
    intent TEXT,
    scope TEXT,
    out_of_scope TEXT,
    acceptance_criteria TEXT,
    validation TEXT,
    risks TEXT,
    generated_markdown_path TEXT,
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
    validation TEXT NOT NULL DEFAULT 'not_run',
    evidence TEXT,
    integration TEXT,
    residual_risks TEXT,
    follow_up TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES runs(id)
  )`,
  `CREATE TABLE IF NOT EXISTS build_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    build_id TEXT NOT NULL,
    outcome TEXT NOT NULL,
    summary TEXT NOT NULL,
    validation TEXT NOT NULL DEFAULT 'not_run',
    evidence TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (build_id) REFERENCES builds(id)
  )`,
  `CREATE TABLE IF NOT EXISTS close_records (
    run_id TEXT PRIMARY KEY,
    commit_hash TEXT,
    closed_at TEXT NOT NULL,
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
  `CREATE TABLE IF NOT EXISTS product_sessions (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    mode TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT,
    input_manifest TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS product_context_proposals (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL,
    proposal_json TEXT NOT NULL,
    input_manifest TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    markdown_path TEXT NOT NULL,
    UNIQUE(session_id, version),
    FOREIGN KEY (session_id) REFERENCES product_sessions(id)
  )`,
  `CREATE TABLE IF NOT EXISTS product_context_proposal_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    proposal_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    superseding_proposal_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES product_sessions(id),
    FOREIGN KEY (proposal_id) REFERENCES product_context_proposals(id)
  )`,
  `CREATE TABLE IF NOT EXISTS product_context_materializations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    proposal_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    plan_json TEXT NOT NULL,
    decision_replacement_confirmed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES product_sessions(id),
    FOREIGN KEY (proposal_id) REFERENCES product_context_proposals(id)
  )`,
  `CREATE TABLE IF NOT EXISTS intakes (
    id TEXT PRIMARY KEY,
    original_intent TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    approved_proposal_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    markdown_path TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS intake_proposals (
    id TEXT PRIMARY KEY, intake_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL,
    parent_proposal_id TEXT, content_hash TEXT NOT NULL, proposal_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, markdown_path TEXT NOT NULL,
    UNIQUE(intake_id, version), FOREIGN KEY (intake_id) REFERENCES intakes(id)
  )`,
  `CREATE TABLE IF NOT EXISTS intake_proposal_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, intake_id TEXT NOT NULL, proposal_id TEXT NOT NULL,
    decision TEXT NOT NULL, superseding_proposal_id TEXT, created_at TEXT NOT NULL,
    FOREIGN KEY (intake_id) REFERENCES intakes(id), FOREIGN KEY (proposal_id) REFERENCES intake_proposals(id)
  )`,
  `CREATE TABLE IF NOT EXISTS intake_materializations (
    id TEXT PRIMARY KEY, intake_id TEXT NOT NULL, proposal_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL,
    plan_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (intake_id) REFERENCES intakes(id), FOREIGN KEY (proposal_id) REFERENCES intake_proposals(id)
  )`,
  `CREATE TABLE IF NOT EXISTS intake_materialization_items (
    materialization_id TEXT NOT NULL, unit_id TEXT NOT NULL, task_ref TEXT NOT NULL, build_id TEXT,
    task_id TEXT NOT NULL, metadata_json TEXT NOT NULL, PRIMARY KEY (materialization_id, task_ref),
    FOREIGN KEY (materialization_id) REFERENCES intake_materializations(id), FOREIGN KEY (build_id) REFERENCES builds(id), FOREIGN KEY (task_id) REFERENCES tasks(id)
  )`,
] as const;

const SCHEMA_VERSION = "10";

const MIGRATED_COLUMNS: Partial<Record<(typeof REQUIRED_TABLES)[number], readonly string[]>> = {
  builds: [
    "intent",
    "goal",
    "user_value",
    "scope",
    "out_of_scope",
    "acceptance_criteria",
    "validation",
    "risks",
    "generated_markdown_path",
  ],
  tasks: [
    "intent",
    "scope",
    "out_of_scope",
    "acceptance_criteria",
    "validation",
    "risks",
    "generated_markdown_path",
  ],
  reviews: ["validation", "evidence"],
  build_reviews: ["validation", "evidence", "integration", "residual_risks", "follow_up"],
  // Product Context lifecycle columns were introduced after the initial session tables.
  // They are additive so existing local workspaces remain usable.
  product_sessions: ["input_manifest"],
  product_context_proposals: ["input_manifest"],
  product_context_materializations: ["decision_replacement_confirmed_at"],
  intakes: ["approved_proposal_id"],
  intake_proposals: ["parent_proposal_id", "content_hash"],
};

export function initializeDatabase(databasePath: string): void {
  const database = openDatabase(databasePath);

  try {
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");

    const initialize = database.transaction(() => {
      for (const statement of SCHEMA_STATEMENTS) {
        database.exec(statement);
      }

      migrateSchema(database);
      assertRequiredSchema(database);
      setSchemaVersion(database);
    });

    initialize();
  } finally {
    database.close();
  }
}

export function hasRequiredSchema(databasePath: string): boolean {
  const database = openDatabase(databasePath, { fileMustExist: true });

  try {
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");

    migrateSchema(database);

    if (hasRequiredSchemaInDatabase(database)) {
      setSchemaVersion(database);
      return true;
    }

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

function migrateSchema(database: Database.Database): void {
  if (!hasTable(database, "build_reviews")) {
    database.exec(`CREATE TABLE build_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      build_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      summary TEXT NOT NULL,
      validation TEXT NOT NULL DEFAULT 'not_run',
      evidence TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (build_id) REFERENCES builds(id)
    )`);
  }

  if (!hasTable(database, "close_records")) {
    database.exec(`CREATE TABLE IF NOT EXISTS close_records (
      run_id TEXT PRIMARY KEY,
      commit_hash TEXT,
      closed_at TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    )`);
  }

  if (!hasTable(database, "product_sessions")) {
    database.exec(`CREATE TABLE product_sessions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      mode TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      closed_at TEXT,
      input_manifest TEXT
    )`);
  }
  if (!hasTable(database, "product_context_proposals")) {
    database.exec(`CREATE TABLE product_context_proposals (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL,
      proposal_json TEXT NOT NULL, input_manifest TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      markdown_path TEXT NOT NULL, UNIQUE(session_id, version),
      FOREIGN KEY (session_id) REFERENCES product_sessions(id)
    )`);
  }
  if (!hasTable(database, "product_context_proposal_reviews")) {
    database.exec(`CREATE TABLE product_context_proposal_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, proposal_id TEXT NOT NULL,
      decision TEXT NOT NULL, superseding_proposal_id TEXT, created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES product_sessions(id), FOREIGN KEY (proposal_id) REFERENCES product_context_proposals(id)
    )`);
  }
  if (!hasTable(database, "product_context_materializations")) {
    database.exec(`CREATE TABLE product_context_materializations (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, proposal_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL,
      plan_json TEXT NOT NULL, decision_replacement_confirmed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES product_sessions(id), FOREIGN KEY (proposal_id) REFERENCES product_context_proposals(id)
    )`);
  }

  if (!hasTable(database, "intakes")) {
    database.exec(`CREATE TABLE intakes (
      id TEXT PRIMARY KEY,
      original_intent TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      markdown_path TEXT NOT NULL
    )`);
  }
  if (!hasTable(database, "intake_proposals")) {
    database.exec(`CREATE TABLE intake_proposals (
      id TEXT PRIMARY KEY, intake_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL,
      parent_proposal_id TEXT, content_hash TEXT NOT NULL DEFAULT '', proposal_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, markdown_path TEXT NOT NULL,
      UNIQUE(intake_id, version), FOREIGN KEY (intake_id) REFERENCES intakes(id)
    )`);
  }
  if (!hasTable(database, "intake_proposal_reviews")) {
    database.exec(`CREATE TABLE intake_proposal_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT, intake_id TEXT NOT NULL, proposal_id TEXT NOT NULL,
      decision TEXT NOT NULL, superseding_proposal_id TEXT, created_at TEXT NOT NULL,
      FOREIGN KEY (intake_id) REFERENCES intakes(id), FOREIGN KEY (proposal_id) REFERENCES intake_proposals(id)
    )`);
  }
  if (!hasTable(database, "intake_materializations")) {
    database.exec(`CREATE TABLE intake_materializations (id TEXT PRIMARY KEY, intake_id TEXT NOT NULL, proposal_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL, plan_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (intake_id) REFERENCES intakes(id), FOREIGN KEY (proposal_id) REFERENCES intake_proposals(id))`);
  }
  if (!hasTable(database, "intake_materialization_items")) {
    database.exec(`CREATE TABLE intake_materialization_items (materialization_id TEXT NOT NULL, unit_id TEXT NOT NULL, task_ref TEXT NOT NULL, build_id TEXT, task_id TEXT NOT NULL, metadata_json TEXT NOT NULL, PRIMARY KEY (materialization_id, task_ref), FOREIGN KEY (materialization_id) REFERENCES intake_materializations(id), FOREIGN KEY (build_id) REFERENCES builds(id), FOREIGN KEY (task_id) REFERENCES tasks(id))`);
  }

  for (const [tableName, columnNames] of Object.entries(MIGRATED_COLUMNS)) {
    if (!hasTable(database, tableName)) {
      continue;
    }

    const existingColumnNames = getColumnNames(database, tableName);

    for (const columnName of columnNames) {
      if (!existingColumnNames.has(columnName)) {
        database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} TEXT`);
      }
    }
  }
}

function setSchemaVersion(database: Database.Database): void {
  database
    .prepare(
      `INSERT INTO metadata (key, value, updated_at)
       VALUES (@key, @value, @updatedAt)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run({
      key: "schema_version",
      value: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    });
}

function hasTable(database: Database.Database, tableName: string): boolean {
  const row = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
  return row !== undefined;
}

function getColumnNames(database: Database.Database, tableName: string): Set<string> {
  type SqliteColumnRow = { name: string };
  return new Set((database.prepare(`PRAGMA table_info(${tableName})`).all() as SqliteColumnRow[]).map((row) => row.name));
}

function openDatabase(databasePath: string, options?: Database.Options): Database.Database {
  return new Database(databasePath, options);
}
