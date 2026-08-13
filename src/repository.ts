import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

export type WorkStatus = "active" | "review" | "rework" | "closed";
export type TaskStatus = "pending" | "active" | "done";
export type WorkItem = { id: string; ref: string; title: string; status: WorkStatus; intent: string; goal: string; scope: string; expected_touchpoints: string; out_of_scope: string; acceptance_criteria: string; validation: string; validation_evidence: string | null; git_baseline_json: string | null; created_at: string; updated_at: string; closed_at: string | null; commit_hash: string | null };
export type Task = { id: string; work_item_id: string; position: number; title: string; status: TaskStatus; objective: string; implementation_approach: string; expected_touchpoints: string; acceptance_criteria: string; validation: string; validation_evidence: string | null; attribution_json: string | null; created_at: string; updated_at: string };
export type PlanTask = Pick<Task, "title" | "objective" | "implementation_approach" | "expected_touchpoints" | "acceptance_criteria" | "validation">;
export type ApprovedPlan = Pick<WorkItem, "title" | "intent" | "goal" | "scope" | "expected_touchpoints" | "out_of_scope" | "acceptance_criteria" | "validation"> & { tasks: PlanTask[]; git_baseline_json: string };
export type Review = { id: number; work_item_id: string; outcome: "PASS" | "REWORK"; summary: string; findings: string | null; validation_evidence: string; git_fingerprint_json: string | null; verification_evidence: string | null; created_at: string };
export type Checkpoint = { id: number; work_item_id: string; task_id: string | null; summary: string; next_step: string | null; created_at: string };
const now = () => new Date().toISOString();

export function openRepository(path: string): any {
  const db = new Database(path); db.pragma("journal_mode = WAL"); db.pragma("foreign_keys = ON");
  const getWork = (idOrRef: string) => (db.prepare("SELECT * FROM work_items WHERE id = ? OR ref = ?").get(idOrRef, idOrRef) as WorkItem | undefined) ?? null;
  const getTask = (id: string) => (db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined) ?? null;
  const listTasks = (workId: string) => db.prepare("SELECT * FROM tasks WHERE work_item_id = ? ORDER BY position").all(workId) as Task[];
  const nextWorkRef = () => { const stored = db.prepare("SELECT value FROM metadata WHERE key = 'next_work_number'").get() as { value: string } | undefined; const value = Number(stored?.value) || 1; db.prepare("INSERT INTO metadata (key,value,updated_at) VALUES ('next_work_number',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").run(String(value + 1), now()); return `WORK-${String(value).padStart(3, "0")}`; };
  const setWork = (item: WorkItem, changes: Partial<WorkItem>) => db.prepare("UPDATE work_items SET status=@status,validation_evidence=@validation_evidence,updated_at=@updated_at,closed_at=@closed_at,commit_hash=@commit_hash WHERE id=@id").run({ ...item, ...changes, updated_at: now() });
  const materializePlan = db.transaction((plan: ApprovedPlan) => {
    if (!plan.tasks.length) throw new Error("An approved Work plan requires at least one Task.");
    if (db.prepare("SELECT 1 FROM work_items WHERE status <> 'closed'").get()) throw new Error("Another Work Item is already open.");
    const timestamp = now(); const item: WorkItem = { ...plan, id: randomUUID(), ref: nextWorkRef(), status: "active", validation_evidence: null, created_at: timestamp, updated_at: timestamp, closed_at: null, commit_hash: null };
    db.prepare("INSERT INTO work_items VALUES (@id,@ref,@title,@status,@intent,@goal,@scope,@expected_touchpoints,@out_of_scope,@acceptance_criteria,@validation,@validation_evidence,@git_baseline_json,@created_at,@updated_at,@closed_at,@commit_hash)").run(item);
    const insert = db.prepare("INSERT INTO tasks VALUES (@id,@work_item_id,@position,@title,@status,@objective,@implementation_approach,@expected_touchpoints,@acceptance_criteria,@validation,@validation_evidence,@attribution_json,@created_at,@updated_at)");
    plan.tasks.forEach((input, index) => insert.run({ ...input, id: randomUUID(), work_item_id: item.id, position: index + 1, status: "pending", validation_evidence: null, attribution_json: null, created_at: timestamp, updated_at: timestamp }));
    return item;
  });
  const materializeRework = db.transaction((workId: string, tasks: PlanTask[]) => {
    const item = getWork(workId); if (!item || item.status !== "rework") throw new Error("Approved remediation requires a Work Item in rework.");
    if (!tasks.length) throw new Error("Approved remediation requires at least one Task.");
    const timestamp = now(); const first = (db.prepare("SELECT COALESCE(MAX(position), 0) AS position FROM tasks WHERE work_item_id = ?").get(item.id) as { position: number }).position + 1;
    const insert = db.prepare("INSERT INTO tasks VALUES (@id,@work_item_id,@position,@title,@status,@objective,@implementation_approach,@expected_touchpoints,@acceptance_criteria,@validation,@validation_evidence,@attribution_json,@created_at,@updated_at)");
    tasks.forEach((input, index) => insert.run({ ...input, id: randomUUID(), work_item_id: item.id, position: first + index, status: "pending", validation_evidence: null, attribution_json: null, created_at: timestamp, updated_at: timestamp }));
    setWork(item, { status: "active" }); return getWork(item.id)!;
  });
  const startTask = db.transaction((workId: string, position: number) => {
    const item = getWork(workId); const tasks = item ? listTasks(item.id) : []; const entry = tasks.find((task) => task.position === position); const earliest = tasks.find((task) => task.status === "pending");
    if (!item || item.status !== "active" || !entry || entry.status !== "pending" || !earliest || earliest.id !== entry.id || tasks.some((task) => task.status === "active")) throw new Error(`Task ${position} cannot start.`);
    db.prepare("UPDATE tasks SET status='active', updated_at=? WHERE id=?").run(now(), entry.id); return getTask(entry.id)!;
  });
  const completeTask = db.transaction((taskId: string, evidence: string, attribution: string) => {
    const entry = getTask(taskId); const item = entry ? getWork(entry.work_item_id) : null;
    if (!entry || !item || item.status !== "active" || entry.status !== "active") throw new Error("Only an active Task may be completed.");
    db.prepare("UPDATE tasks SET status='done', validation_evidence=?, attribution_json=?, updated_at=? WHERE id=?").run(evidence, attribution, now(), entry.id); return getTask(entry.id)!;
  });
  const createReview = db.transaction((input: Omit<Review, "id" | "created_at">) => {
    const item = getWork(input.work_item_id); const previous = item ? db.prepare("SELECT * FROM work_reviews WHERE work_item_id=? ORDER BY id DESC LIMIT 1").get(item.id) as Review | undefined : undefined;
    const activeReview = item?.status === "active" && listTasks(item.id).every((task) => task.status === "done");
    const verificationDowngrade = item?.status === "review" && previous?.outcome === "PASS" && input.outcome === "REWORK" && Boolean(input.verification_evidence?.trim());
    if (!item || (!activeReview && !verificationDowngrade)) throw new Error("Work Review requires an active Work Item with all Tasks done, or PASS verification evidence for a REWORK downgrade.");
    const result = db.prepare("INSERT INTO work_reviews (work_item_id,outcome,summary,findings,validation_evidence,git_fingerprint_json,verification_evidence,created_at) VALUES (?,?,?,?,?,?,?,?)").run(input.work_item_id, input.outcome, input.summary, input.findings, input.validation_evidence, input.git_fingerprint_json, input.verification_evidence, now());
    setWork(item, { status: input.outcome === "PASS" ? "review" : "rework", validation_evidence: input.validation_evidence });
    return db.prepare("SELECT * FROM work_reviews WHERE id=?").get(result.lastInsertRowid) as Review;
  });
  const createCheckpoint = db.transaction((input: Omit<Checkpoint, "id" | "created_at">) => {
    const item = getWork(input.work_item_id); const task = input.task_id ? getTask(input.task_id) : null;
    if (!item || item.status !== "active" || (input.task_id && (!task || task.work_item_id !== item.id || task.status !== "active"))) throw new Error("Checkpoint requires an active Work and, when supplied, its active Task.");
    const result = db.prepare("INSERT INTO checkpoints (work_item_id,task_id,summary,next_step,created_at) VALUES (?,?,?,?,?)").run(item.id, input.task_id, input.summary, input.next_step, now());
    return db.prepare("SELECT * FROM checkpoints WHERE id=?").get(result.lastInsertRowid) as Checkpoint;
  });
  const closeWork = db.transaction((workId: string, commitHash: string | null) => {
    const item = getWork(workId); const latest = item ? db.prepare("SELECT outcome FROM work_reviews WHERE work_item_id=? ORDER BY id DESC LIMIT 1").get(item.id) as { outcome: string } | undefined : undefined; if (!item || item.status !== "review" || !item.validation_evidence || latest?.outcome !== "PASS" || listTasks(item.id).some((task) => task.status !== "done")) throw new Error(`Work Item ${item?.ref ?? workId} is not ready to close.`);
    setWork(item, { status: "closed", closed_at: now(), commit_hash: commitHash }); return getWork(item.id)!;
  });
  return { close: () => db.close(), getWork, getTask, materializePlan, materializeRework, startTask, completeTask, createReview, createCheckpoint, closeWork, listWork: () => db.prepare("SELECT * FROM work_items ORDER BY ref").all() as WorkItem[], listTasks, getTaskAt: (workId: string, position: number) => (db.prepare("SELECT * FROM tasks WHERE work_item_id = ? AND position = ?").get(workId, position) as Task | undefined) ?? null, listReviews: (workId: string) => db.prepare("SELECT * FROM work_reviews WHERE work_item_id=? ORDER BY id").all(workId) as Review[], latestReview: (workId: string) => (db.prepare("SELECT * FROM work_reviews WHERE work_item_id=? ORDER BY id DESC LIMIT 1").get(workId) as Review | undefined) ?? null, latestCheckpoint: (workId: string) => (db.prepare("SELECT * FROM checkpoints WHERE work_item_id=? ORDER BY id DESC LIMIT 1").get(workId) as Checkpoint | undefined) ?? null, getMetadata: (key: string) => (db.prepare("SELECT value FROM metadata WHERE key=?").get(key) as { value: string } | undefined)?.value ?? null, setMetadata: (key: string, value: string) => db.prepare("INSERT INTO metadata (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").run(key, value, now()) };
}
