import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export type WorkStatus = "active" | "review" | "rework" | "closed";
export type TaskStatus = "pending" | "active" | "done";
export type WorkItem = { id: string; ref: string; title: string; status: WorkStatus; intent: string; goal: string; scope: string; expected_touchpoints: string; out_of_scope: string; acceptance_criteria: string; validation: string; validation_evidence: string | null; git_baseline_json: string | null; created_at: string; updated_at: string; closed_at: string | null; commit_hash: string | null };
export type Task = { id: string; work_item_id: string; position: number; title: string; status: TaskStatus; objective: string; implementation_approach: string; expected_touchpoints: string; acceptance_criteria: string; validation: string; validation_evidence: string | null; attribution_json: string | null; created_at: string; updated_at: string };
export type PlanTask = Pick<Task, "title" | "objective" | "implementation_approach" | "expected_touchpoints" | "acceptance_criteria" | "validation">;
export type ApprovedPlan = Pick<WorkItem, "title" | "intent" | "goal" | "scope" | "expected_touchpoints" | "out_of_scope" | "acceptance_criteria" | "validation"> & { tasks: PlanTask[]; git_baseline_json: string };
export type Review = { id: number; work_item_id: string; outcome: "PASS" | "REWORK"; summary: string; findings: string | null; remediation_json: string | null; validation_evidence: string; git_fingerprint_json: string | null; verification_evidence: string | null; created_at: string };
export type Checkpoint = { id: number; work_item_id: string; task_id: string | null; summary: string; next_step: string | null; created_at: string };
export function workRef(id: string): string {
  return `W-${id.replaceAll("-", "").slice(0, 16).toUpperCase()}`;
}
export type Repository = {
  close(): void; getWork(reference: string): WorkItem | null; getTask(id: string): Task | null; materializePlan(plan: ApprovedPlan): WorkItem; materializeRework(workId: string): WorkItem; completeTask(taskId: string, evidence: string, attribution: string): Task; createReview(input: Omit<Review, "id" | "created_at">): Review; createCheckpoint(input: Omit<Checkpoint, "id" | "created_at">): Checkpoint; closeWork(workId: string, commitHash: string | null): WorkItem; listWork(): WorkItem[]; listTasks(workId: string): Task[]; getTaskAt(workId: string, position: number): Task | null; latestReview(workId: string): Review | null; latestCheckpoint(workId: string): Checkpoint | null; listCheckpoints(workId: string): Checkpoint[];
};
const now = () => new Date().toISOString();

export function openRepository(path: string): Repository {
  return createRepository(new DatabaseSync(path));
}
function createRepository(db: DatabaseSync): Repository {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  const prepare = (sql: string) => {
    const statement = db.prepare(sql);
    statement.setAllowBareNamedParameters(true);
    return statement;
  };
  const transaction = <T>(operation: () => T): T => {
    db.exec("BEGIN");
    try {
      const result = operation();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  const getWork = (idOrRef: string) => (prepare("SELECT * FROM work_items WHERE id = ? OR ref = ?").get(idOrRef, idOrRef) as WorkItem | undefined) ?? null;
  const getTask = (id: string) => (prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined) ?? null;
  const listTasks = (workId: string) => prepare("SELECT * FROM tasks WHERE work_item_id = ? ORDER BY position").all(workId) as Task[];
  const setWork = (item: WorkItem, changes: Partial<WorkItem>) => {
    return prepare("UPDATE work_items SET status=@status,validation_evidence=@validation_evidence,updated_at=@updated_at,closed_at=@closed_at,commit_hash=@commit_hash WHERE id=@id").run({
      id: item.id,
      status: changes.status ?? item.status,
      validation_evidence: changes.validation_evidence ?? item.validation_evidence,
      updated_at: now(),
      closed_at: changes.closed_at ?? item.closed_at,
      commit_hash: changes.commit_hash ?? item.commit_hash,
    });
  };
  const insertTasks = (workId: string, first: number, tasks: PlanTask[], timestamp: string) => {
    const insert = prepare("INSERT INTO tasks VALUES (@id,@work_item_id,@position,@title,@status,@objective,@implementation_approach,@expected_touchpoints,@acceptance_criteria,@validation,@validation_evidence,@attribution_json,@created_at,@updated_at)");
    tasks.forEach((input, index) => insert.run({
      ...input,
      id: randomUUID(),
      work_item_id: workId,
      position: first + index,
       status: index === 0 ? "active" : "pending",
      validation_evidence: null,
      attribution_json: null,
      created_at: timestamp,
      updated_at: timestamp,
    }));
  };
  const materializePlan = (plan: ApprovedPlan) => transaction(() => {
    if (!plan.tasks.length) throw new Error("An approved Work plan requires at least one Task.");
    if (prepare("SELECT 1 FROM work_items WHERE status <> 'closed'").get()) {
      throw new Error("Another Work Item is already open.");
    }
    const timestamp = now();
    const { tasks, ...approved } = plan;
    const id = randomUUID();
    const item: WorkItem = {
      ...approved,
      id,
      ref: workRef(id),
      status: "active",
      validation_evidence: null,
      created_at: timestamp,
      updated_at: timestamp,
      closed_at: null,
      commit_hash: null,
    };
    prepare("INSERT INTO work_items VALUES (@id,@ref,@title,@status,@intent,@goal,@scope,@expected_touchpoints,@out_of_scope,@acceptance_criteria,@validation,@validation_evidence,@git_baseline_json,@created_at,@updated_at,@closed_at,@commit_hash)").run(item);
    insertTasks(item.id, 1, tasks, timestamp);
    return item;
  });
  const materializeRework = (workId: string) => transaction(() => {
    const item = getWork(workId);
    const review = item ? prepare("SELECT * FROM work_reviews WHERE work_item_id=? ORDER BY id DESC LIMIT 1").get(item.id) as Review | undefined : undefined;
    if (!item || item.status !== "rework" || review?.outcome !== "REWORK" || !review.remediation_json) {
      throw new Error("Approved remediation requires a persisted REWORK proposal.");
    }
    let tasks: PlanTask[];
    try {
      tasks = JSON.parse(review.remediation_json) as PlanTask[];
    } catch {
      throw new Error("Persisted REWORK proposal is invalid.");
    }
    if (!Array.isArray(tasks) || !tasks.length) {
      throw new Error("Persisted REWORK proposal is invalid.");
    }
    const first = (prepare("SELECT COALESCE(MAX(position), 0) AS position FROM tasks WHERE work_item_id = ?").get(item.id) as { position: number }).position + 1;
    insertTasks(item.id, first, tasks, now());
    setWork(item, { status: "active" });
    return getWork(item.id)!;
  });
  const completeTask = (taskId: string, evidence: string, attribution: string) => transaction(() => {
    const entry = getTask(taskId);
    const item = entry ? getWork(entry.work_item_id) : null;
    if (!entry || !item || item.status !== "active" || entry.status !== "active") {
      throw new Error("Only an active Task may be completed.");
    }
    prepare("UPDATE tasks SET status='done', validation_evidence=?, attribution_json=?, updated_at=? WHERE id=?").run(evidence, attribution, now(), entry.id);
    const next = listTasks(item.id).find((task) => task.status === "pending");
    if (next) prepare("UPDATE tasks SET status='active', updated_at=? WHERE id=?").run(now(), next.id);
    return getTask(entry.id)!;
  });
  const createReview = (input: Omit<Review, "id" | "created_at">) => transaction(() => { const item = getWork(input.work_item_id); const previous = item ? prepare("SELECT * FROM work_reviews WHERE work_item_id=? ORDER BY id DESC LIMIT 1").get(item.id) as Review | undefined : undefined; const activeReview = item?.status === "active" && listTasks(item.id).every((task) => task.status === "done"); const verificationDowngrade = item?.status === "review" && previous?.outcome === "PASS" && input.outcome === "REWORK" && Boolean(input.verification_evidence?.trim()); if (!item || (!activeReview && !verificationDowngrade)) throw new Error("Work Review requires an active Work Item with all Tasks done, or PASS verification evidence for a REWORK downgrade."); const result = prepare("INSERT INTO work_reviews (work_item_id,outcome,summary,findings,remediation_json,validation_evidence,git_fingerprint_json,verification_evidence,created_at) VALUES (?,?,?,?,?,?,?,?,?)").run(input.work_item_id, input.outcome, input.summary, input.findings, input.remediation_json, input.validation_evidence, input.git_fingerprint_json, input.verification_evidence, now()); setWork(item, { status: input.outcome === "PASS" ? "review" : "rework", validation_evidence: input.validation_evidence }); return prepare("SELECT * FROM work_reviews WHERE id=?").get(result.lastInsertRowid) as Review; });
  const createCheckpoint = (input: Omit<Checkpoint, "id" | "created_at">) => transaction(() => { const item = getWork(input.work_item_id); const task = input.task_id ? getTask(input.task_id) : null; if (!item || item.status !== "active" || (input.task_id && (!task || task.work_item_id !== item.id || task.status !== "active"))) throw new Error("Checkpoint requires an active Work and, when supplied, its active Task."); const result = prepare("INSERT INTO checkpoints (work_item_id,task_id,summary,next_step,created_at) VALUES (?,?,?,?,?)").run(item.id, input.task_id, input.summary, input.next_step, now()); return prepare("SELECT * FROM checkpoints WHERE id=?").get(result.lastInsertRowid) as Checkpoint; });
  const closeWork = (workId: string, commitHash: string | null) => transaction(() => {
    const item = getWork(workId);
    const latest = item ? prepare("SELECT outcome FROM work_reviews WHERE work_item_id=? ORDER BY id DESC LIMIT 1").get(item.id) as { outcome: string } | undefined : undefined;
    if (!item || item.status !== "review" || !item.validation_evidence || latest?.outcome !== "PASS" || listTasks(item.id).some((task) => task.status !== "done")) {
      throw new Error(`Work Item ${item?.ref ?? workId} is not ready to close.`);
    }
    setWork(item, { status: "closed", closed_at: now(), commit_hash: commitHash });
    return getWork(item.id)!;
  });
  return { close: () => db.close(), getWork, getTask, materializePlan, materializeRework, completeTask, createReview, createCheckpoint, closeWork, listWork: () => prepare("SELECT * FROM work_items ORDER BY ref").all() as WorkItem[], listTasks, getTaskAt: (workId: string, position: number) => (prepare("SELECT * FROM tasks WHERE work_item_id = ? AND position = ?").get(workId, position) as Task | undefined) ?? null, latestReview: (workId: string) => (prepare("SELECT * FROM work_reviews WHERE work_item_id=? ORDER BY id DESC LIMIT 1").get(workId) as Review | undefined) ?? null, latestCheckpoint: (workId: string) => (prepare("SELECT * FROM checkpoints WHERE work_item_id=? ORDER BY id DESC LIMIT 1").get(workId) as Checkpoint | undefined) ?? null, listCheckpoints: (workId: string) => prepare("SELECT * FROM checkpoints WHERE work_item_id=? ORDER BY id").all(workId) as Checkpoint[] };
}
