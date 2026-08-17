import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WorkItem, Task, Review, Checkpoint } from "./repository.js";

export function activePath(workspaceRoot: string, workRef: string) {
  return join(workspaceRoot, "agent", "active", `${workRef}.md`);
}
export function syncActiveContext(workspaceRoot: string, work: WorkItem, tasks: Task[], review: Review | null, checkpoint: Checkpoint | null): string {
  const active = tasks.find((task) => task.status === "active");
  const taskList = (status: string) => tasks.filter((task) => task.status === status).map((task) => `- Task ${task.position} - ${task.title}`).join("\n") || "- None";
  const activeDetails = active ? [`Task ${active.position} - ${active.title}`, `Objective:\n${active.objective}`, active.implementation_approach && `Implementation approach:\n${active.implementation_approach}`, active.expected_touchpoints && `Expected touchpoints:\n${active.expected_touchpoints}`, `Acceptance criteria:\n${active.acceptance_criteria}`, `Targeted validation:\n${active.validation}`].filter(Boolean).join("\n\n") : "None";
  const checkpointSection = checkpoint ? `\n\n## Checkpoint\n\n${checkpoint.summary}${checkpoint.next_step ? `\n\nNext step: ${checkpoint.next_step}` : ""}` : "";
  const next = nextOperation(work, tasks, review);
  const content = `# ${work.ref} - ${work.title}\n\nState: ${work.status}\n\n## Goal\n\n${work.goal}\n\n## Current Task\n\n${activeDetails}\n\n## Completed\n\n${taskList("done")}\n\n## Pending\n\n${taskList("pending")}${checkpointSection}\n\n## Next\n\n${next}\n`;
  const path = activePath(workspaceRoot, work.ref);
  writeFileSync(path, content, "utf8");
  return path;
}
export function removeActiveContext(workspaceRoot: string, workRef: string) {
  const path = activePath(workspaceRoot, workRef);
  if (existsSync(path)) {
    rmSync(path);
  }
}
export function nextOperation(work: WorkItem, tasks: Task[], review: Review | null): string {
  if (work.status === "closed") return "No further Nerv lifecycle operation is required.";
  if (work.status === "rework") return "nerv approve";
  const active = tasks.find((task) => task.status === "active");
  if (active) return `Continue with Task ${active.position}.`;
  const pending = tasks.find((task) => task.status === "pending");
  if (work.status === "active" && pending) return `Continue with Task ${pending.position}.`;
  if (work.status === "active") return `nerv review ${work.ref}`;
  if (work.status === "review" && review?.outcome === "PASS") return `Optional additional local or user inspection may happen first; required outcome verification was part of Review; then nerv close ${work.ref}.`;
  return `nerv review ${work.ref}`;
}
