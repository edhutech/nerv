import Database from "better-sqlite3";

export type IdType = "BUILD" | "TASK" | "RUN" | "PRODUCT";

const COUNTER_KEYS: Record<IdType, string> = {
  BUILD: "next_build_number",
  TASK: "next_task_number",
  RUN: "next_run_number",
  PRODUCT: "next_product_session_number",
};

const ID_TABLES: Record<IdType, string> = {
  BUILD: "builds",
  TASK: "tasks",
  RUN: "runs",
  PRODUCT: "product_sessions",
};

const ID_WIDTH = 3;

export type BuildRecord = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  intent: string | null;
  goal: string | null;
  user_value: string | null;
  scope: string | null;
  out_of_scope: string | null;
  acceptance_criteria: string | null;
  validation: string | null;
  risks: string | null;
  generated_markdown_path: string | null;
};

export type TaskRecord = {
  id: string;
  build_id: string | null;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  intent: string | null;
  scope: string | null;
  out_of_scope: string | null;
  acceptance_criteria: string | null;
  validation: string | null;
  risks: string | null;
  generated_markdown_path: string | null;
};

export type RunRecord = {
  id: string;
  task_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type CheckpointRecord = {
  id: number;
  run_id: string;
  summary: string;
  created_at: string;
};

export type ReviewRecord = {
  id: number;
  run_id: string;
  outcome: string;
  summary: string;
  created_at: string;
};

export type BuildReviewRecord = {
  id: number;
  build_id: string;
  outcome: string;
  summary: string;
  created_at: string;
};

export type CloseRecord = {
  run_id: string;
  commit_hash: string | null;
  closed_at: string;
};

export type ProductSessionRecord = {
  id: string;
  status: string;
  mode: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  input_manifest: string | null;
};

export type ProductContextProposalRecord = {
  id: string;
  session_id: string;
  version: number;
  status: string;
  proposal_json: string;
  input_manifest: string;
  created_at: string;
  updated_at: string;
  markdown_path: string;
};

export type CreateBuildInput = {
  id: string;
  title: string;
  status?: string;
  intent?: string;
  goal?: string;
  user_value?: string;
  scope?: string;
  out_of_scope?: string;
  acceptance_criteria?: string;
  validation?: string;
  risks?: string;
  generated_markdown_path?: string;
};

export type CreateTaskInput = {
  id: string;
  build_id?: string | null;
  title: string;
  status?: string;
  intent?: string;
  scope?: string;
  out_of_scope?: string;
  acceptance_criteria?: string;
  validation?: string;
  risks?: string;
  generated_markdown_path?: string;
};

export type CreateRunInput = {
  id: string;
  task_id: string;
  status?: string;
};

export type CreateCheckpointInput = {
  run_id: string;
  summary: string;
};

export type CreateReviewInput = {
  run_id: string;
  outcome: string;
  summary: string;
};

export type CreateBuildReviewInput = {
  build_id: string;
  outcome: string;
  summary: string;
};

export type CreateCloseInput = {
  run_id: string;
  commit_hash?: string | null;
};

export type Repository = {
  close(): void;
  getNextId(type: IdType): string;
  getMetadata(key: string): string | null;
  setMetadata(key: string, value: string): void;
  createBuild(input: CreateBuildInput): BuildRecord;
  getBuild(id: string): BuildRecord | null;
  listBuilds(): BuildRecord[];
  searchBuilds(query: string): BuildRecord[];
  getBuildTaskCount(buildId: string): number;
  getBuildClosedTaskCount(buildId: string): number;
  getBuildOpenTaskCount(buildId: string): number;
  updateBuild(id: string, updates: Partial<Omit<BuildRecord, "id" | "created_at">>): void;
  createTask(input: CreateTaskInput): TaskRecord;
  getTask(id: string): TaskRecord | null;
  listTasks(): TaskRecord[];
  searchTasks(query: string): TaskRecord[];
  selectTaskForRun(query: string): TaskRecord;
  listTasksByBuild(buildId: string): TaskRecord[];
  updateTask(id: string, updates: Partial<Omit<TaskRecord, "id" | "created_at">>): void;
  createRun(input: CreateRunInput): RunRecord;
  getRun(id: string): RunRecord | null;
  listRuns(): RunRecord[];
  updateRun(id: string, updates: Partial<Omit<RunRecord, "id" | "created_at">>): void;
  createCheckpoint(input: CreateCheckpointInput): CheckpointRecord;
  listCheckpoints(runId: string): CheckpointRecord[];
  createReview(input: CreateReviewInput): ReviewRecord;
  listReviews(runId: string): ReviewRecord[];
  hasPassedReview(runId: string): boolean;
  createBuildReview(input: CreateBuildReviewInput): BuildReviewRecord;
  listBuildReviews(buildId: string): BuildReviewRecord[];
  hasPassedBuildReview(buildId: string): boolean;
  createCloseRecord(input: CreateCloseInput): CloseRecord;
  getCloseRecord(runId: string): CloseRecord | null;
  getCurrentRunId(): string | null;
  setCurrentRunId(runId: string): void;
  createProductSession(input: { id: string; mode: string; input_manifest?: string | null }): ProductSessionRecord;
  getProductSession(id: string): ProductSessionRecord | null;
  updateProductSession(id: string, updates: Partial<Pick<ProductSessionRecord, "status" | "input_manifest" | "closed_at">>): void;
  getCurrentProductSessionId(): string | null;
  setCurrentProductSessionId(sessionId: string): void;
  createProductContextProposal(input: Omit<ProductContextProposalRecord, "created_at" | "updated_at">): ProductContextProposalRecord;
  getProductContextProposal(id: string): ProductContextProposalRecord | null;
  listProductContextProposals(sessionId: string): ProductContextProposalRecord[];
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

  const createBuildStmt = database.prepare(
    `INSERT INTO builds (id, title, status, created_at, updated_at, closed_at, intent, goal, user_value, scope, out_of_scope, acceptance_criteria, validation, risks, generated_markdown_path)
     VALUES (@id, @title, @status, @createdAt, @updatedAt, @closedAt, @intent, @goal, @userValue, @scope, @outOfScope, @acceptanceCriteria, @validation, @risks, @generatedMarkdownPath)`,
  );

  const getBuildStmt = database.prepare(
    `SELECT * FROM builds WHERE id = ?`,
  );

  const listBuildsStmt = database.prepare(
    `SELECT * FROM builds ORDER BY id DESC`,
  );

  const searchBuildsByIdStmt = database.prepare(
    `SELECT * FROM builds WHERE id = ?`,
  );

  const searchBuildsByTextStmt = database.prepare(
    `SELECT * FROM builds WHERE title LIKE ? OR intent LIKE ? ORDER BY id DESC`,
  );

  const getBuildTaskCountStmt = database.prepare(
    `SELECT COUNT(*) as count FROM tasks WHERE build_id = ?`,
  );

  const getBuildClosedTaskCountStmt = database.prepare(
    `SELECT COUNT(*) as count FROM tasks WHERE build_id = ? AND status = 'closed'`,
  );

  const getBuildOpenTaskCountStmt = database.prepare(
    `SELECT COUNT(*) as count FROM tasks WHERE build_id = ? AND status != 'closed'`,
  );

  const updateBuildStmt = database.prepare(
    `UPDATE builds SET title = @title, status = @status, updated_at = @updatedAt, closed_at = @closedAt, intent = @intent, goal = @goal, user_value = @userValue, scope = @scope, out_of_scope = @outOfScope, acceptance_criteria = @acceptanceCriteria, validation = @validation, risks = @risks, generated_markdown_path = @generatedMarkdownPath WHERE id = @id`,
  );

  const createTaskStmt = database.prepare(
    `INSERT INTO tasks (id, build_id, title, status, created_at, updated_at, closed_at, intent, scope, out_of_scope, acceptance_criteria, validation, risks, generated_markdown_path)
     VALUES (@id, @buildId, @title, @status, @createdAt, @updatedAt, @closedAt, @intent, @scope, @outOfScope, @acceptanceCriteria, @validation, @risks, @generatedMarkdownPath)`,
  );

  const getTaskStmt = database.prepare(
    `SELECT * FROM tasks WHERE id = ?`,
  );

  const listTasksStmt = database.prepare(
    `SELECT * FROM tasks ORDER BY id DESC`,
  );

  const searchTasksByIdStmt = database.prepare(
    `SELECT * FROM tasks WHERE id = ?`,
  );

  const searchTasksByTextStmt = database.prepare(
    `SELECT * FROM tasks WHERE title LIKE ? OR intent LIKE ? ORDER BY id DESC`,
  );

  const listTasksByBuildStmt = database.prepare(
    `SELECT * FROM tasks WHERE build_id = ? ORDER BY id ASC`,
  );

  const updateTaskStmt = database.prepare(
    `UPDATE tasks SET build_id = @buildId, title = @title, status = @status, updated_at = @updatedAt, closed_at = @closedAt, intent = @intent, scope = @scope, out_of_scope = @outOfScope, acceptance_criteria = @acceptanceCriteria, validation = @validation, risks = @risks, generated_markdown_path = @generatedMarkdownPath WHERE id = @id`,
  );

  const createRunStmt = database.prepare(
    `INSERT INTO runs (id, task_id, status, created_at, updated_at, closed_at)
     VALUES (@id, @taskId, @status, @createdAt, @updatedAt, @closedAt)`,
  );

  const getRunStmt = database.prepare(
    `SELECT * FROM runs WHERE id = ?`,
  );

  const listRunsStmt = database.prepare(
    `SELECT * FROM runs ORDER BY id DESC`,
  );

  const createCheckpointStmt = database.prepare(
    `INSERT INTO checkpoints (run_id, summary, created_at)
     VALUES (@runId, @summary, @createdAt)`,
  );

  const getCheckpointStmt = database.prepare(
    `SELECT * FROM checkpoints WHERE id = ?`,
  );

  const listCheckpointsStmt = database.prepare(
    `SELECT * FROM checkpoints WHERE run_id = ? ORDER BY id ASC`,
  );

  const createReviewStmt = database.prepare(
    `INSERT INTO reviews (run_id, outcome, summary, created_at)
     VALUES (@runId, @outcome, @summary, @createdAt)`,
  );

  const getReviewStmt = database.prepare(
    `SELECT * FROM reviews WHERE id = ?`,
  );

  const listReviewsStmt = database.prepare(
    `SELECT * FROM reviews WHERE run_id = ? ORDER BY id ASC`,
  );
  const createBuildReviewStmt = database.prepare(
    `INSERT INTO build_reviews (build_id, outcome, summary, created_at)
     VALUES (@buildId, @outcome, @summary, @createdAt)`,
  );
  const getBuildReviewStmt = database.prepare(`SELECT * FROM build_reviews WHERE id = ?`);
  const listBuildReviewsStmt = database.prepare(`SELECT * FROM build_reviews WHERE build_id = ? ORDER BY id ASC`);

  const createBuild = database.transaction((input: CreateBuildInput): BuildRecord => {
    const now = new Date().toISOString();
    const record: BuildRecord = {
      id: input.id,
      title: input.title,
      status: input.status ?? "proposed",
      created_at: now,
      updated_at: now,
      closed_at: null,
      intent: input.intent ?? null,
      goal: input.goal ?? null,
      user_value: input.user_value ?? null,
      scope: input.scope ?? null,
      out_of_scope: input.out_of_scope ?? null,
      acceptance_criteria: input.acceptance_criteria ?? null,
      validation: input.validation ?? null,
      risks: input.risks ?? null,
      generated_markdown_path: input.generated_markdown_path ?? null,
    };

    createBuildStmt.run({
      id: record.id,
      title: record.title,
      status: record.status,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      closedAt: record.closed_at,
      intent: record.intent,
      goal: record.goal,
      userValue: record.user_value,
      scope: record.scope,
      outOfScope: record.out_of_scope,
      acceptanceCriteria: record.acceptance_criteria,
      validation: record.validation,
      risks: record.risks,
      generatedMarkdownPath: record.generated_markdown_path,
    });

    return record;
  });

  const getBuild = (id: string): BuildRecord | null => {
    const row = getBuildStmt.get(id) as BuildRecord | undefined;
    return row ?? null;
  };

  const listBuilds = (): BuildRecord[] => {
    return listBuildsStmt.all() as BuildRecord[];
  };

  const searchBuilds = (query: string): BuildRecord[] => {
    const trimmed = query.trim();

    if (!trimmed) {
      return listBuilds();
    }

    // Check if it's an exact ID match
    if (trimmed.startsWith("BUILD-")) {
      const exact = searchBuildsByIdStmt.get(trimmed) as BuildRecord | undefined;
      if (exact) {
        return [exact];
      }
    }

    // Search by text in title or intent
    const pattern = `%${trimmed}%`;
    return searchBuildsByTextStmt.all(pattern, pattern) as BuildRecord[];
  };

  const getBuildTaskCount = (buildId: string): number => {
    const row = getBuildTaskCountStmt.get(buildId) as { count: number } | undefined;
    return row?.count ?? 0;
  };

  const getBuildClosedTaskCount = (buildId: string): number => {
    const row = getBuildClosedTaskCountStmt.get(buildId) as { count: number } | undefined;
    return row?.count ?? 0;
  };

  const getBuildOpenTaskCount = (buildId: string): number => {
    const row = getBuildOpenTaskCountStmt.get(buildId) as { count: number } | undefined;
    return row?.count ?? 0;
  };

  const updateBuild = database.transaction((id: string, updates: Partial<Omit<BuildRecord, "id" | "created_at">>): void => {
    const existing = getBuild(id);
    if (!existing) {
      throw new Error(`Build ${id} not found`);
    }

    const now = new Date().toISOString();
    const updated: BuildRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: now,
    };

    updateBuildStmt.run({
      id: updated.id,
      title: updated.title,
      status: updated.status,
      updatedAt: updated.updated_at,
      closedAt: updated.closed_at,
      intent: updated.intent,
      goal: updated.goal,
      userValue: updated.user_value,
      scope: updated.scope,
      outOfScope: updated.out_of_scope,
      acceptanceCriteria: updated.acceptance_criteria,
      validation: updated.validation,
      risks: updated.risks,
      generatedMarkdownPath: updated.generated_markdown_path,
    });
  });

  const createTask = database.transaction((input: CreateTaskInput): TaskRecord => {
    const now = new Date().toISOString();
    const record: TaskRecord = {
      id: input.id,
      build_id: input.build_id ?? null,
      title: input.title,
      status: input.status ?? "proposed",
      created_at: now,
      updated_at: now,
      closed_at: null,
      intent: input.intent ?? null,
      scope: input.scope ?? null,
      out_of_scope: input.out_of_scope ?? null,
      acceptance_criteria: input.acceptance_criteria ?? null,
      validation: input.validation ?? null,
      risks: input.risks ?? null,
      generated_markdown_path: input.generated_markdown_path ?? null,
    };

    createTaskStmt.run({
      id: record.id,
      buildId: record.build_id,
      title: record.title,
      status: record.status,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      closedAt: record.closed_at,
      intent: record.intent,
      scope: record.scope,
      outOfScope: record.out_of_scope,
      acceptanceCriteria: record.acceptance_criteria,
      validation: record.validation,
      risks: record.risks,
      generatedMarkdownPath: record.generated_markdown_path,
    });

    return record;
  });

  const getTask = (id: string): TaskRecord | null => {
    const row = getTaskStmt.get(id) as TaskRecord | undefined;
    return row ?? null;
  };

  const listTasks = (): TaskRecord[] => {
    return listTasksStmt.all() as TaskRecord[];
  };

  const searchTasks = (query: string): TaskRecord[] => {
    const trimmed = query.trim();

    if (!trimmed) {
      return listTasks();
    }

    // Check if it's an exact ID match
    if (trimmed.startsWith("TASK-")) {
      const exact = searchTasksByIdStmt.get(trimmed) as TaskRecord | undefined;
      if (exact) {
        return [exact];
      }
    }

    // Search by text in title or intent
    const pattern = `%${trimmed}%`;
    return searchTasksByTextStmt.all(pattern, pattern) as TaskRecord[];
  };

  const selectTaskForRun = (query: string): TaskRecord => {
    const trimmed = query.trim();

    if (!trimmed) {
      throw new Error("Task query is required.");
    }

    if (/^TASK-\d+$/i.test(trimmed)) {
      const task = getTask(trimmed.toUpperCase());
      if (!task) {
        throw new Error(`No task found matching "${trimmed}".`);
      }

      return task;
    }

    const tasks = searchTasks(trimmed);

    if (tasks.length === 0) {
      throw new Error(`No task found matching "${trimmed}".`);
    }

    if (tasks.length > 1) {
      const matches = tasks.map((task) => `${task.id}: ${task.title}`).join("\n");
      throw new Error(`Task query "${trimmed}" is ambiguous. Matching tasks:\n${matches}`);
    }

    return tasks[0];
  };

  const listTasksByBuild = (buildId: string): TaskRecord[] => {
    return listTasksByBuildStmt.all(buildId) as TaskRecord[];
  };

  const updateTask = database.transaction((id: string, updates: Partial<Omit<TaskRecord, "id" | "created_at">>): void => {
    const existing = getTask(id);
    if (!existing) {
      throw new Error(`Task ${id} not found`);
    }

    const now = new Date().toISOString();
    const updated: TaskRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: now,
    };

    updateTaskStmt.run({
      id: updated.id,
      buildId: updated.build_id,
      title: updated.title,
      status: updated.status,
      updatedAt: updated.updated_at,
      closedAt: updated.closed_at,
      intent: updated.intent,
      scope: updated.scope,
      outOfScope: updated.out_of_scope,
      acceptanceCriteria: updated.acceptance_criteria,
      validation: updated.validation,
      risks: updated.risks,
      generatedMarkdownPath: updated.generated_markdown_path,
    });
  });

  const createRun = database.transaction((input: CreateRunInput): RunRecord => {
    const now = new Date().toISOString();
    const record: RunRecord = {
      id: input.id,
      task_id: input.task_id,
      status: input.status ?? "active",
      created_at: now,
      updated_at: now,
      closed_at: null,
    };

    createRunStmt.run({
      id: record.id,
      taskId: record.task_id,
      status: record.status,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      closedAt: record.closed_at,
    });

    return record;
  });

  const getRun = (id: string): RunRecord | null => {
    const row = getRunStmt.get(id) as RunRecord | undefined;
    return row ?? null;
  };

  const listRuns = (): RunRecord[] => {
    return listRunsStmt.all() as RunRecord[];
  };

  const updateRunStmt = database.prepare(
    `UPDATE runs SET task_id = @taskId, status = @status, updated_at = @updatedAt, closed_at = @closedAt WHERE id = @id`,
  );

  const updateRun = database.transaction((id: string, updates: Partial<Omit<RunRecord, "id" | "created_at">>): void => {
    const existing = getRun(id);
    if (!existing) {
      throw new Error(`Run ${id} not found`);
    }

    const now = new Date().toISOString();
    const updated: RunRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: now,
    };

    updateRunStmt.run({
      id: updated.id,
      taskId: updated.task_id,
      status: updated.status,
      updatedAt: updated.updated_at,
      closedAt: updated.closed_at,
    });
  });

  const createCheckpoint = database.transaction((input: CreateCheckpointInput): CheckpointRecord => {
    const now = new Date().toISOString();
    const result = createCheckpointStmt.run({
      runId: input.run_id,
      summary: input.summary,
      createdAt: now,
    });

    return getCheckpointStmt.get(result.lastInsertRowid) as CheckpointRecord;
  });

  const listCheckpoints = (runId: string): CheckpointRecord[] => {
    return listCheckpointsStmt.all(runId) as CheckpointRecord[];
  };

  const createReview = database.transaction((input: CreateReviewInput): ReviewRecord => {
    const now = new Date().toISOString();
    const result = createReviewStmt.run({
      runId: input.run_id,
      outcome: input.outcome,
      summary: input.summary,
      createdAt: now,
    });

    return getReviewStmt.get(result.lastInsertRowid) as ReviewRecord;
  });

  const listReviews = (runId: string): ReviewRecord[] => {
    return listReviewsStmt.all(runId) as ReviewRecord[];
  };

  const hasPassedReview = (runId: string): boolean => {
    const reviews = listReviews(runId);
    return reviews.some((review) => review.outcome === "passed");
  };

  const createBuildReview = database.transaction((input: CreateBuildReviewInput): BuildReviewRecord => {
    const result = createBuildReviewStmt.run({
      buildId: input.build_id,
      outcome: input.outcome,
      summary: input.summary,
      createdAt: new Date().toISOString(),
    });
    return getBuildReviewStmt.get(result.lastInsertRowid) as BuildReviewRecord;
  });

  const listBuildReviews = (buildId: string): BuildReviewRecord[] => {
    return listBuildReviewsStmt.all(buildId) as BuildReviewRecord[];
  };

  const hasPassedBuildReview = (buildId: string): boolean => {
    const reviews = listBuildReviews(buildId);
    if (reviews.length === 0) return false;
    const latestReview = reviews[reviews.length - 1];
    return latestReview.outcome === "passed";
  };

  const createCloseRecordStmt = database.prepare(
    `INSERT OR REPLACE INTO close_records (run_id, commit_hash, closed_at)
     VALUES (@runId, @commitHash, @closedAt)`,
  );

  const createProductSessionStmt = database.prepare(
    `INSERT INTO product_sessions (id, status, mode, created_at, updated_at, closed_at, input_manifest)
     VALUES (@id, @status, @mode, @createdAt, @updatedAt, @closedAt, @inputManifest)`,
  );
  const getProductSessionStmt = database.prepare("SELECT * FROM product_sessions WHERE id = ?");
  const updateProductSessionStmt = database.prepare(
    `UPDATE product_sessions SET status = @status, updated_at = @updatedAt, closed_at = @closedAt, input_manifest = @inputManifest WHERE id = @id`,
  );
  const createProductContextProposalStmt = database.prepare(
    `INSERT INTO product_context_proposals (id, session_id, version, status, proposal_json, input_manifest, created_at, updated_at, markdown_path)
     VALUES (@id, @sessionId, @version, @status, @proposalJson, @inputManifest, @createdAt, @updatedAt, @markdownPath)`,
  );
  const getProductContextProposalStmt = database.prepare("SELECT * FROM product_context_proposals WHERE id = ?");
  const listProductContextProposalsStmt = database.prepare("SELECT * FROM product_context_proposals WHERE session_id = ? ORDER BY version");

  const getCloseRecordStmt = database.prepare(
    `SELECT * FROM close_records WHERE run_id = ?`,
  );

  const createCloseRecord = database.transaction((input: CreateCloseInput): CloseRecord => {
    const now = new Date().toISOString();
    const record: CloseRecord = {
      run_id: input.run_id,
      commit_hash: input.commit_hash ?? null,
      closed_at: now,
    };

    createCloseRecordStmt.run({
      runId: record.run_id,
      commitHash: record.commit_hash,
      closedAt: record.closed_at,
    });

    return record;
  });

  const getCloseRecord = (runId: string): CloseRecord | null => {
    const row = getCloseRecordStmt.get(runId) as CloseRecord | undefined;
    return row ?? null;
  };

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
    createBuild,
    getBuild,
    listBuilds,
    searchBuilds,
    getBuildTaskCount,
    getBuildClosedTaskCount,
    getBuildOpenTaskCount,
    updateBuild,
    createTask,
    getTask,
    listTasks,
    searchTasks,
    selectTaskForRun,
    listTasksByBuild,
    updateTask,
    createRun,
    getRun,
    listRuns,
    updateRun,
    createCheckpoint,
    listCheckpoints,
    createReview,
    listReviews,
    hasPassedReview,
    createBuildReview,
    listBuildReviews,
    hasPassedBuildReview,
    createCloseRecord,
    getCloseRecord,
    getCurrentRunId(): string | null {
      return this.getMetadata("current_run_id");
    },
    setCurrentRunId(runId: string): void {
      this.setMetadata("current_run_id", runId);
    },
    createProductSession(input: { id: string; mode: string; input_manifest?: string | null }): ProductSessionRecord {
      const now = new Date().toISOString();
      const record: ProductSessionRecord = {
        id: input.id,
        status: "active",
        mode: input.mode,
        created_at: now,
        updated_at: now,
        closed_at: null,
        input_manifest: input.input_manifest ?? null,
      };
      createProductSessionStmt.run({
        id: record.id,
        status: record.status,
        mode: record.mode,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        closedAt: record.closed_at,
        inputManifest: record.input_manifest,
      });
      return record;
    },
    getProductSession(id: string): ProductSessionRecord | null {
      return (getProductSessionStmt.get(id) as ProductSessionRecord | undefined) ?? null;
    },
    updateProductSession(id: string, updates: Partial<Pick<ProductSessionRecord, "status" | "input_manifest" | "closed_at">>): void {
      const existing = this.getProductSession(id);
      if (!existing) {
        throw new Error(`Product Session ${id} not found.`);
      }
      updateProductSessionStmt.run({
        id,
        status: updates.status ?? existing.status,
        updatedAt: new Date().toISOString(),
        closedAt: updates.closed_at ?? existing.closed_at,
        inputManifest: updates.input_manifest ?? existing.input_manifest,
      });
    },
    getCurrentProductSessionId(): string | null {
      return this.getMetadata("current_product_session_id");
    },
    setCurrentProductSessionId(sessionId: string): void {
      this.setMetadata("current_product_session_id", sessionId);
    },
    createProductContextProposal: database.transaction((input: Omit<ProductContextProposalRecord, "created_at" | "updated_at">): ProductContextProposalRecord => {
      const now = new Date().toISOString();
      const record: ProductContextProposalRecord = { ...input, created_at: now, updated_at: now };
      createProductContextProposalStmt.run({ id: record.id, sessionId: record.session_id, version: record.version, status: record.status, proposalJson: record.proposal_json, inputManifest: record.input_manifest, createdAt: now, updatedAt: now, markdownPath: record.markdown_path });
      return record;
    }),
    getProductContextProposal(id: string): ProductContextProposalRecord | null {
      return (getProductContextProposalStmt.get(id) as ProductContextProposalRecord | undefined) ?? null;
    },
    listProductContextProposals(sessionId: string): ProductContextProposalRecord[] {
      return listProductContextProposalsStmt.all(sessionId) as ProductContextProposalRecord[];
    },
  };
}

function formatId(type: IdType, sequence: number): string {
  const prefix = type === "PRODUCT" ? "PRODUCT" : type;
  return `${prefix}-${String(sequence).padStart(ID_WIDTH, "0")}`;
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
