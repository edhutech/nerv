import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WorkItem, Task, Review, Checkpoint } from "./repository.js";

export function activePath(workspaceRoot: string, workRef: string) { return join(workspaceRoot, "agent", "active", `${workRef}.md`); }
export function syncActiveContext(workspaceRoot: string, work: WorkItem, tasks: Task[], review: Review | null, checkpoint: Checkpoint | null): string {
  const taskList = (status: string) => tasks.filter((task) => task.status === status).map((task) => `- Task ${task.position}: ${task.title}`).join("\n") || "- None";
  const taskDetails = (task: Task) => `### Task ${task.position}: ${task.title}\n\nScope: ${task.scope}\n\nAcceptance criteria: ${task.acceptance_criteria}\n\nTargeted validation: ${task.validation}`;
  const pendingDetails = tasks.filter((task) => task.status === "pending").map(taskDetails).join("\n\n") || "None";
  const active = tasks.find((task) => task.status === "active");
  const next = nextOperation(work, tasks, review);
  const content = `# ${work.ref}: ${work.title}\n\n## State\n\n${work.status}\n\n## Goal\n\n${work.goal}\n\n## Scope\n\n${work.scope}\n\n## Acceptance Criteria\n\n${work.acceptance_criteria}\n\n## Full Validation\n\n${work.validation}\n\n## Completed Tasks\n\n${taskList("done")}\n\n## Pending Tasks\n\n${pendingDetails}\n\n## Active Task\n\n${active ? taskDetails(active) : "None"}\n\n## Latest Review\n\n${review ? `${review.outcome}: ${review.summary}\n\n${review.findings ?? "No findings."}` : "None"}\n\n## Latest Checkpoint\n\n${checkpoint ? `${checkpoint.summary}\n\nNext: ${checkpoint.next_step ?? "Not recorded."}` : "None"}\n\n## Next\n\n${next}\n`;
  const path = activePath(workspaceRoot, work.ref); writeFileSync(path, content, "utf8"); return path;
}
export function removeActiveContext(workspaceRoot: string, workRef: string) { const path = activePath(workspaceRoot, workRef); if (existsSync(path)) rmSync(path); }
export function nextOperation(work: WorkItem, tasks: Task[], review: Review | null): string {
  if (work.status === "closed") return "No further lifecycle operation.";
  if (tasks.some((task) => task.status === "blocked")) return `Resolve blocked work, then materialize approved remediation with the external workflow.`;
  if (work.status === "planned") return "Use the external planning workflow to approve and materialize Tasks, then activate the Work Item.";
  if (work.status === "active" && tasks.some((task) => task.status === "pending")) return "Start the next pending Task.";
  if (work.status === "active" && tasks.some((task) => task.status === "active")) return "Complete or block the active Task.";
  if (work.status === "active") return "Record full validation evidence and move the Work Item to review.";
  if (work.status === "review" && review?.outcome === "PASS") return "Close the Work Item.";
  if (work.status === "rework") return "Use the external planning workflow to approve remediation Tasks.";
  return "Record a Work Review.";
}
