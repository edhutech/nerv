import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WorkItem, Task, Review, Checkpoint } from "./repository.js";

export function activePath(workspaceRoot: string, workRef: string) { return join(workspaceRoot, "agent", "active", `${workRef}.md`); }
function reviewFindings(findings: string | null) {
  if (!findings) return "No findings.";
  try {
    const parsed = JSON.parse(findings) as Array<{ severity: string; finding: string; accepted_as_residual_risk?: boolean }>;
    if (!Array.isArray(parsed)) return findings;
    return parsed.map((finding) => `- ${finding.severity.toUpperCase()}${finding.accepted_as_residual_risk ? " (accepted residual risk)" : ""} — ${finding.finding}`).join("\n") || "No findings.";
  } catch { return findings; }
}
export function syncActiveContext(workspaceRoot: string, work: WorkItem, tasks: Task[], review: Review | null, checkpoint: Checkpoint | null): string {
  const taskList = (status: string) => tasks.filter((task) => task.status === status).map((task) => `- Task ${task.position}: ${task.title}`).join("\n") || "- None";
  const taskDetails = (task: Task) => `### Task ${task.position}: ${task.title}\n\nObjective: ${task.objective}\n\nImplementation approach: ${task.implementation_approach}\n\nExpected touchpoints: ${task.expected_touchpoints}\n\nAcceptance criteria: ${task.acceptance_criteria}\n\nTargeted validation: ${task.validation}`;
  const pendingDetails = tasks.filter((task) => task.status === "pending").map(taskDetails).join("\n\n") || "None";
  const active = tasks.find((task) => task.status === "active");
  const next = nextOperation(work, tasks, review);
  const content = `# ${work.ref}: ${work.title}\n\n## State\n\n${work.status}\n\n## Intent\n\n${work.intent}\n\n## Goal\n\n${work.goal}\n\n## Scope\n\n${work.scope}\n\n## Expected Touchpoints\n\n${work.expected_touchpoints}\n\n## Out Of Scope\n\n${work.out_of_scope}\n\n## Acceptance Criteria\n\n${work.acceptance_criteria}\n\n## Full Validation\n\n${work.validation}\n\n## Completed Tasks\n\n${taskList("done")}\n\n## Pending Tasks\n\n${pendingDetails}\n\n## Active Task\n\n${active ? taskDetails(active) : "None"}\n\n## Latest Review\n\n${review ? `${review.outcome}: ${review.summary}\n\n${reviewFindings(review.findings)}` : "None"}\n\n## Latest Checkpoint\n\n${checkpoint ? `${checkpoint.summary}\n\nCheckpoint next step: ${checkpoint.next_step ?? "Not recorded."}` : "None"}\n\n## Recommended Next Operation\n\n${next}\n`;
  const path = activePath(workspaceRoot, work.ref); writeFileSync(path, content, "utf8"); return path;
}
export function removeActiveContext(workspaceRoot: string, workRef: string) { const path = activePath(workspaceRoot, workRef); if (existsSync(path)) rmSync(path); }
export function nextOperation(work: WorkItem, tasks: Task[], review: Review | null): string {
  if (work.status === "closed") return "No further Nerv lifecycle operation is required.";
  if (work.status === "rework") return "nerv approve";
  const active = tasks.find((task) => task.status === "active");
  if (active) return `Continue with Task ${active.position}.`;
  const pending = tasks.find((task) => task.status === "pending");
  if (work.status === "active" && pending) return `Continue with Task ${pending.position}.`;
  if (work.status === "active") return `nerv review ${work.ref}`;
  if (work.status === "review" && review?.outcome === "PASS") return `Optional user or external verification may happen first; then nerv close ${work.ref}.`;
  return `nerv review ${work.ref}`;
}
