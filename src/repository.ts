import Database from "better-sqlite3";

export type IdType = "BUILD" | "TASK" | "RUN";

const COUNTER_KEYS: Record<IdType, string> = {
  BUILD: "next_build_number",
  TASK: "next_task_number",
  RUN: "next_run_number",
};

const ID_TABLES: Record<IdType, string> = {
  BUILD: "builds",
  TASK: "tasks",
  RUN: "runs",
};

const ID_WIDTH = 3;

export type Repository = {
  close(): void;
  getNextId(type: IdType): string;
  getMetadata(key: string): string | null;
  setMetadata(key: string, value: string): void;
};

export function openRepository(databasePath: string): Repository {
  const database = new Database(databasePath);

  try {
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
  } catch (error) {
    database.close();
    throw error;
  }

  const getMetadataStmt = database.prepare(
    `SELECT value FROM metadata WHERE key = ?`,
  );
  const setMetadataStmt = database.prepare(
    `INSERT INTO metadata (key, value, updated_at)
     VALUES (@key, @value, @updatedAt)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );

  const getNextId = database.transaction((type: IdType): string => {
    const counterKey = COUNTER_KEYS[type];
    const row = getMetadataStmt.get(counterKey) as { value: string } | undefined;
    const metadataCounter = row ? parseCounter(row.value) : 1;
    const existingCounter = getNextCounterFromRows(database, type);
    const current = Math.max(metadataCounter, existingCounter);
    const next = current + 1;
    const updatedAt = new Date().toISOString();

    setMetadataStmt.run({ key: counterKey, value: String(next), updatedAt });

    return formatId(type, current);
  });

  return {
    close() {
      database.close();
    },
    getNextId(type: IdType): string {
      return getNextId(type);
    },
    getMetadata(key: string): string | null {
      const row = getMetadataStmt.get(key) as { value: string } | undefined;
      return row ? row.value : null;
    },
    setMetadata(key: string, value: string): void {
      const updatedAt = new Date().toISOString();
      setMetadataStmt.run({ key, value, updatedAt });
    },
  };
}

function formatId(type: IdType, sequence: number): string {
  return `${type}-${String(sequence).padStart(ID_WIDTH, "0")}`;
}

function parseCounter(value: string): number {
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function getNextCounterFromRows(database: Database.Database, type: IdType): number {
  const rows = database.prepare(`SELECT id FROM ${ID_TABLES[type]} WHERE id LIKE ?`).all(`${type}-%`) as { id: string }[];
  const maxExisting = rows.reduce((max, row) => {
    const sequence = parseIdSequence(type, row.id);
    return sequence === null ? max : Math.max(max, sequence);
  }, 0);

  return maxExisting + 1;
}

function parseIdSequence(type: IdType, id: string): number | null {
  const prefix = `${type}-`;

  if (!id.startsWith(prefix)) {
    return null;
  }

  const sequence = Number(id.slice(prefix.length));

  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    return null;
  }

  return sequence;
}
