import Database from "better-sqlite3";

const REQUIRED_TABLES = [
  "builds",
  "tasks",
  "runs",
  "checkpoints",
  "reviews",
  "build_reviews",
  "build_audit_classifications",
  "build_closure_evidence",
  "build_outcomes",
  "build_review_outcomes",
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
  build_audit_classifications: ["id", "build_id", "audit_class", "rationale", "created_at"],
  build_closure_evidence: ["id", "build_id", "review_id", "outcome", "evidence", "created_at"],
  build_outcomes: ["id", "build_id", "proposal_task_ref", "outcome", "criterion", "created_at"],
  build_review_outcomes: ["id", "review_id", "build_outcome_id", "criterion", "executed_evidence", "coverage_classification", "residual_risk_decision", "status", "created_at"],
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
    integration TEXT,
    residual_risks TEXT,
    follow_up TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (build_id) REFERENCES builds(id)
  )`,
  `CREATE TABLE IF NOT EXISTS build_audit_classifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    build_id TEXT NOT NULL,
    audit_class TEXT NOT NULL,
    rationale TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(build_id),
    FOREIGN KEY (build_id) REFERENCES builds(id)
  )`,
  `CREATE TABLE IF NOT EXISTS build_closure_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    build_id TEXT NOT NULL,
    review_id INTEGER NOT NULL,
    outcome TEXT NOT NULL,
    evidence TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(review_id, outcome),
    FOREIGN KEY (build_id) REFERENCES builds(id),
    FOREIGN KEY (review_id) REFERENCES build_reviews(id)
  )`,
  `CREATE TABLE IF NOT EXISTS build_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    build_id TEXT NOT NULL,
    proposal_task_ref TEXT NOT NULL,
    outcome TEXT NOT NULL,
    criterion TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(build_id, proposal_task_ref),
    FOREIGN KEY (build_id) REFERENCES builds(id)
  )`,
  `CREATE TABLE IF NOT EXISTS build_review_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    build_outcome_id INTEGER NOT NULL,
    criterion TEXT NOT NULL,
    executed_evidence TEXT NOT NULL,
    coverage_classification TEXT NOT NULL,
    residual_risk_decision TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(review_id, build_outcome_id),
    FOREIGN KEY (review_id) REFERENCES build_reviews(id),
    FOREIGN KEY (build_outcome_id) REFERENCES build_outcomes(id)
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

const SCHEMA_VERSION = "13";

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

  if (!hasTable(database, "build_audit_classifications")) {
    database.exec(`CREATE TABLE build_audit_classifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, build_id TEXT NOT NULL, audit_class TEXT NOT NULL,
      rationale TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(build_id),
      FOREIGN KEY (build_id) REFERENCES builds(id)
    )`);
  }
  if (!hasTable(database, "build_closure_evidence")) {
    database.exec(`CREATE TABLE build_closure_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT, build_id TEXT NOT NULL, review_id INTEGER NOT NULL,
      outcome TEXT NOT NULL, evidence TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(review_id, outcome),
      FOREIGN KEY (build_id) REFERENCES builds(id), FOREIGN KEY (review_id) REFERENCES build_reviews(id)
    )`);
  }
  if (!hasTable(database, "build_outcomes")) {
    database.exec(`CREATE TABLE build_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, build_id TEXT NOT NULL, proposal_task_ref TEXT NOT NULL,
      outcome TEXT NOT NULL, criterion TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(build_id, proposal_task_ref),
      FOREIGN KEY (build_id) REFERENCES builds(id)
    )`);
  }
  if (!hasTable(database, "build_review_outcomes")) {
    database.exec(`CREATE TABLE build_review_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, review_id INTEGER NOT NULL, build_outcome_id INTEGER NOT NULL,
      criterion TEXT NOT NULL, executed_evidence TEXT NOT NULL, coverage_classification TEXT NOT NULL,
      residual_risk_decision TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL,
      UNIQUE(review_id, build_outcome_id), FOREIGN KEY (review_id) REFERENCES build_reviews(id),
      FOREIGN KEY (build_outcome_id) REFERENCES build_outcomes(id)
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

  if (getColumnNames(database, "builds").has("id")) {
    const createdAt = new Date().toISOString();
    const classifications = [
      ...Array.from({ length: 7 }, (_, index) => [`BUILD-${String(index + 5).padStart(3, "0")}`, "legacy_reviewed", "Reviewed before closure-matrix evidence was required."] as const),
      ...Array.from({ length: 3 }, (_, index) => [`BUILD-${String(index + 12).padStart(3, "0")}`, "retrospectively_nonconformant", "Closed before the closure-matrix evidence standard was adopted."] as const),
    ];
    const insertClassification = database.prepare(
      `INSERT OR IGNORE INTO build_audit_classifications (build_id, audit_class, rationale, created_at)
       SELECT @buildId, @auditClass, @rationale, @createdAt WHERE EXISTS (SELECT 1 FROM builds WHERE id = @buildId)`,
    );
    for (const [buildId, auditClass, rationale] of classifications) {
      insertClassification.run({ buildId, auditClass, rationale, createdAt });
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
