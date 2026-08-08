import Database from "better-sqlite3";

export type WorkStatus = "planned" | "active" | "review" | "rework" | "closed";
export type TaskStatus = "pending" | "active" | "done" | "blocked";
export type WorkItem = { id: string; title: string; status: WorkStatus; intent: string; goal: string; scope: string; acceptance_criteria: string; validation: string; validation_evidence: string | null; git_base_head: string | null; git_baseline_json: string | null; created_at: string; updated_at: string; closed_at: string | null; commit_hash: string | null };
export type Task = { id: string; work_item_id: string; title: string; status: TaskStatus; scope: string; acceptance_criteria: string; validation: string; validation_evidence: string | null; block_reason: string | null; attribution_json: string | null; created_at: string; updated_at: string };
export type Review = { id: number; work_item_id: string; outcome: "PASS" | "REWORK"; summary: string; findings: string | null; validation_evidence: string; created_at: string };
export type Checkpoint = { id: number; work_item_id: string; task_id: string | null; summary: string; files: string | null; decisions: string | null; unresolved_issue: string | null; next_step: string | null; created_at: string };
export type Knowledge = { id: number; type: "decision" | "architecture" | "discovery" | "pattern"; title: string; content: string; work_item_id: string | null; topic_key: string | null; created_at: string; updated_at: string };
export type Attribution = { paths: Array<{ path: string; state: "present" | "deleted"; hash: string | null }>; ambiguousBaselinePaths?: string[] };
const now = () => new Date().toISOString();

export function openRepository(path: string): any {
  const db = new Database(path); db.pragma("journal_mode = WAL"); db.pragma("foreign_keys = ON");
  const nextId = db.transaction((prefix: "WORK" | "TASK") => {
    const key = `next_${prefix.toLowerCase()}_number`;
    const stored = db.prepare("SELECT value FROM metadata WHERE key = ?").get(key) as { value: string } | undefined;
    const table = prefix === "WORK" ? "work_items" : "tasks";
    const ids = db.prepare(`SELECT id FROM ${table}`).all() as { id: string }[];
    const max = ids.reduce((result, row) => Math.max(result, Number(row.id.slice(prefix.length + 1)) || 0), 0) + 1;
    const value = Math.max(Number(stored?.value) || 1, max);
    db.prepare(`INSERT INTO metadata (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).run(key, String(value + 1), now());
    return `${prefix}-${String(value).padStart(3, "0")}`;
  });
  const getWork = (id: string) => (db.prepare("SELECT * FROM work_items WHERE id = ?").get(id) as WorkItem | undefined) ?? null;
  const getTask = (id: string) => (db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined) ?? null;
  const updateWork = db.transaction((id: string, changes: Partial<WorkItem>) => {
    const current = getWork(id); if (!current) throw new Error(`Work Item ${id} not found.`);
    const value = { ...current, ...changes, id, updated_at: now() };
    db.prepare(`UPDATE work_items SET title=@title,status=@status,intent=@intent,goal=@goal,scope=@scope,acceptance_criteria=@acceptance_criteria,validation=@validation,validation_evidence=@validation_evidence,git_base_head=@git_base_head,git_baseline_json=@git_baseline_json,updated_at=@updated_at,closed_at=@closed_at,commit_hash=@commit_hash WHERE id=@id`).run(value);
  });
  const updateTask = db.transaction((id: string, changes: Partial<Task>) => {
    const current = getTask(id); if (!current) throw new Error(`Task ${id} not found.`);
    const value = { ...current, ...changes, id, updated_at: now() };
    db.prepare(`UPDATE tasks SET work_item_id=@work_item_id,title=@title,status=@status,scope=@scope,acceptance_criteria=@acceptance_criteria,validation=@validation,validation_evidence=@validation_evidence,block_reason=@block_reason,attribution_json=@attribution_json,updated_at=@updated_at WHERE id=@id`).run(value);
  });
  return {
    close: () => db.close(), nextId, getWork, getTask, updateWork, updateTask,
    listWork: () => db.prepare("SELECT * FROM work_items ORDER BY id").all() as WorkItem[],
    listTasks: (workId: string) => db.prepare("SELECT * FROM tasks WHERE work_item_id = ? ORDER BY id").all(workId) as Task[],
    createWork(input: Omit<WorkItem, "id" | "created_at" | "updated_at" | "closed_at" | "commit_hash" | "git_base_head" | "git_baseline_json" | "validation_evidence">) {
      const id = nextId("WORK"); const timestamp = now(); const item: WorkItem = { ...input, id, validation_evidence: null, git_base_head: null, git_baseline_json: null, created_at: timestamp, updated_at: timestamp, closed_at: null, commit_hash: null };
      db.prepare(`INSERT INTO work_items VALUES (@id,@title,@status,@intent,@goal,@scope,@acceptance_criteria,@validation,@validation_evidence,@git_base_head,@git_baseline_json,@created_at,@updated_at,@closed_at,@commit_hash)`).run(item); return item;
    },
    createTask(input: Omit<Task, "id" | "created_at" | "updated_at" | "validation_evidence" | "block_reason" | "attribution_json">) {
      if (!getWork(input.work_item_id)) throw new Error(`Work Item ${input.work_item_id} not found.`);
      const id = nextId("TASK"); const timestamp = now(); const task: Task = { ...input, id, validation_evidence: null, block_reason: null, attribution_json: null, created_at: timestamp, updated_at: timestamp };
      db.prepare(`INSERT INTO tasks VALUES (@id,@work_item_id,@title,@status,@scope,@acceptance_criteria,@validation,@validation_evidence,@block_reason,@attribution_json,@created_at,@updated_at)`).run(task); return task;
    },
    createReview(input: Omit<Review, "id" | "created_at">) { const timestamp = now(); const result = db.prepare("INSERT INTO work_reviews (work_item_id,outcome,summary,findings,validation_evidence,created_at) VALUES (?,?,?,?,?,?)").run(input.work_item_id,input.outcome,input.summary,input.findings,input.validation_evidence,timestamp); return db.prepare("SELECT * FROM work_reviews WHERE id=?").get(result.lastInsertRowid) as Review; },
    listReviews: (workId: string) => db.prepare("SELECT * FROM work_reviews WHERE work_item_id=? ORDER BY id").all(workId) as Review[],
    latestReview: (workId: string) => (db.prepare("SELECT * FROM work_reviews WHERE work_item_id=? ORDER BY id DESC LIMIT 1").get(workId) as Review | undefined) ?? null,
    createCheckpoint(input: Omit<Checkpoint, "id" | "created_at">) { const timestamp = now(); const result = db.prepare("INSERT INTO checkpoints (work_item_id,task_id,summary,files,decisions,unresolved_issue,next_step,created_at) VALUES (?,?,?,?,?,?,?,?)").run(input.work_item_id,input.task_id,input.summary,input.files,input.decisions,input.unresolved_issue,input.next_step,timestamp); return db.prepare("SELECT * FROM checkpoints WHERE id=?").get(result.lastInsertRowid) as Checkpoint; },
    latestCheckpoint: (workId: string) => (db.prepare("SELECT * FROM checkpoints WHERE work_item_id=? ORDER BY id DESC LIMIT 1").get(workId) as Checkpoint | undefined) ?? null,
    createKnowledge(input: Omit<Knowledge, "id" | "created_at" | "updated_at">) { const timestamp = now(); const result = db.prepare("INSERT INTO knowledge (type,title,content,work_item_id,topic_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run(input.type,input.title,input.content,input.work_item_id,input.topic_key,timestamp,timestamp); return db.prepare("SELECT * FROM knowledge WHERE id=?").get(result.lastInsertRowid) as Knowledge; },
    searchKnowledge(query: string) { return db.prepare("SELECT knowledge.* FROM knowledge_fts JOIN knowledge ON knowledge.id=knowledge_fts.rowid WHERE knowledge_fts MATCH ? ORDER BY rank LIMIT 10").all(query) as Knowledge[]; },
    getKnowledge: (id: number) => (db.prepare("SELECT * FROM knowledge WHERE id=?").get(id) as Knowledge | undefined) ?? null,
    getMetadata: (key: string) => (db.prepare("SELECT value FROM metadata WHERE key=?").get(key) as { value: string } | undefined)?.value ?? null,
    setMetadata: (key: string, value: string) => db.prepare("INSERT INTO metadata (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").run(key,value,now()),
  };
}
