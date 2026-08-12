#!/usr/bin/env node
import { Command } from "commander";
import { createRequire } from "node:module";
import { getWorkspaceStatus, ensureWorkspace } from "./workspace.js";
import { openRepository, type ApprovedPlan, type Attribution, type Task, type WorkItem } from "./repository.js";
import { scaffoldProductContext, writeProductContext } from "./product.js";
import { generateRepoContext, scaffoldSharedRepoContext } from "./repo-context.js";
import { discoverContext } from "./context.js";
import { nextOperation, removeActiveContext, syncActiveContext } from "./work.js";
import { cachedPaths, captureBaseline, changedPaths, commit, fileState, stage, stagedDiff, validatePath, type GitBaseline } from "./git.js";

const packageVersion = (createRequire(import.meta.url)("../package.json") as { version: string }).version;
const program = new Command().name("nerv").description("Local-first Agent Work Harness.").version(packageVersion);
type Details = { intent: string; goal: string; scope: string; expectedTouchpoints: string; outOfScope: string; acceptanceCriteria: string; validation: string };
type Workspace = { repoRoot: string; workspaceRoot: string; databasePath: string };
type FindingSeverity = "critical" | "high" | "medium" | "low";
type ReviewFinding = { severity: FindingSeverity; finding: string; accepted_as_residual_risk?: boolean };
function action(handler: () => void) { try { handler(); } catch (error) { program.error(error instanceof Error ? error.message : String(error), { exitCode: 1, code: "NERV_OPERATION_FAILED" }); } }
function required(options: Record<string, string>, key: keyof Details) { const value = options[key]?.trim(); if (!value) throw new Error(`--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required.`); return value; }
function approvedPlan(value: string): ApprovedPlan {
  let plan: unknown; try { plan = JSON.parse(value); } catch { throw new Error("--plan must be valid JSON."); }
  if (!plan || typeof plan !== "object") throw new Error("--plan must be an approved Work plan object.");
  const input = plan as Record<string, unknown>; const workFields = ["title", "intent", "goal", "scope", "expected_touchpoints", "out_of_scope", "acceptance_criteria", "validation"] as const; const taskFields = ["title", "objective", "implementation_approach", "expected_touchpoints", "acceptance_criteria", "validation"] as const;
  for (const field of workFields) if (!(typeof input[field] === "string" && input[field].trim())) throw new Error(`Approved Work plan requires ${field}.`);
  if (!Array.isArray(input.tasks) || !input.tasks.length) throw new Error("Approved Work plan requires at least one Task.");
  for (const task of input.tasks) { if (!task || typeof task !== "object") throw new Error("Each approved Task must be an object."); for (const field of taskFields) if (!(typeof (task as Record<string, unknown>)[field] === "string" && String((task as Record<string, unknown>)[field]).trim())) throw new Error(`Each approved Task requires ${field}.`); }
  return input as unknown as ApprovedPlan;
}
function reviewFindings(value?: string): ReviewFinding[] {
  if (!value?.trim()) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("--findings must be a JSON array of severity-labeled findings."); }
  if (!Array.isArray(parsed) || !parsed.length) throw new Error("--findings must be a non-empty JSON array when supplied.");
  return parsed.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("Each Review finding must be an object.");
    const finding = entry as Record<string, unknown>;
    if (!(typeof finding.finding === "string" && finding.finding.trim()) || !(["critical", "high", "medium", "low"] as string[]).includes(String(finding.severity))) throw new Error("Each Review finding requires a severity of critical, high, medium, or low and non-empty finding text.");
    if (finding.accepted_as_residual_risk !== undefined && typeof finding.accepted_as_residual_risk !== "boolean") throw new Error("accepted_as_residual_risk must be boolean when supplied.");
    if (finding.accepted_as_residual_risk && finding.severity !== "medium") throw new Error("Only medium findings may be accepted as residual risk.");
    return { severity: finding.severity as FindingSeverity, finding: finding.finding.trim(), ...(finding.accepted_as_residual_risk ? { accepted_as_residual_risk: true } : {}) };
  });
}
function blocksPass(finding: ReviewFinding) { return finding.severity === "critical" || finding.severity === "high" || (finding.severity === "medium" && !finding.accepted_as_residual_risk); }
function formatFindings(findings: ReviewFinding[], heading: string) { return findings.length ? `${heading}:\n${findings.map((finding) => `- ${finding.severity.toUpperCase()}${finding.accepted_as_residual_risk ? " (accepted residual risk)" : ""} — ${finding.finding}`).join("\n")}` : ""; }
function recoveredFindings(value: string | null) { if (!value) return "none"; try { return formatFindings(reviewFindings(value), ""); } catch { return value; } }
function workspace(): Workspace { const status = getWorkspaceStatus(process.cwd()); if (!status.initialized || !status.repoRoot || !status.workspaceRoot || !status.databasePath) throw new Error("Nerv is not initialized in this repo. Execute `nerv init` first."); return { repoRoot: status.repoRoot, workspaceRoot: status.workspaceRoot, databasePath: status.databasePath }; }
function work(repo: any, reference: string): WorkItem { const item = repo.getWork(reference); if (!item) throw new Error(`Work Item ${reference.toUpperCase()} not found.`); return item; }
function sync(status: Workspace, item: WorkItem) { const repo = openRepository(status.databasePath); try { return syncActiveContext(status.workspaceRoot, item, repo.listTasks(item.id), repo.latestReview(item.id), repo.latestCheckpoint(item.id)); } finally { repo.close(); } }
function recommendedNext(status: Workspace, item: WorkItem) { const repo = openRepository(status.databasePath); try { return nextOperation(item, repo.listTasks(item.id), repo.latestReview(item.id)); } finally { repo.close(); } }
function taskAt(repo: any, item: WorkItem, position: string): Task { const task = repo.getTaskAt(item.id, Number(position)); if (!task || !Number.isInteger(Number(position)) || Number(position) < 1) throw new Error(`Task ${position} not found in ${item.ref}.`); return task; }

program.command("init").action(() => action(() => { const status = getWorkspaceStatus(process.cwd()); if (!status.repoRoot) throw new Error("nerv init must be run inside a Git repository."); const existed = status.initialized; const result = ensureWorkspace(status.repoRoot); console.log(existed ? `Nerv is already initialized in ${status.repoRoot}.` : `Initialized Nerv in ${status.repoRoot}.`); if (result.contextSync.legacy.length) console.log(`Legacy shared context preserved: ${result.contextSync.legacy.join(", ")}. Consolidate confirmed current truth into .nerv-context/product.md and .nerv-context/repo.md.`); if (result.skillSync.message) console.log(result.skillSync.message); }));
const product = program.command("product").description("Scaffold and update shared Product Context.");
product.action(() => action(() => { const status = workspace(); const result = scaffoldProductContext(status.repoRoot); const repo = openRepository(status.databasePath); try { repo.setMetadata("product_context_updated_at", new Date().toISOString()); } finally { repo.close(); } console.log(`Product Context: ${result.created.includes("product.md") ? "created" : "preserved"}.`); if (result.legacy.length) console.log(`Legacy shared context preserved: ${result.legacy.join(", ")}.`); }));
product.command("write").argument("<document>").requiredOption("--content <content>").action((document: string, options: { content: string }) => action(() => { const status = workspace(); writeProductContext(status.repoRoot, document, options.content); console.log(`Updated Product Context: ${document}`); }));
const repoCommand = program.command("repo").description("Generate local repository observations or scaffold shared facts.");
repoCommand.action(() => action(() => { const status = workspace(); console.log(`Generated ${generateRepoContext(status.repoRoot, status.workspaceRoot)}`); }));
repoCommand.command("scaffold").action(() => action(() => { const status = workspace(); console.log(`Shared Repo Context: ${scaffoldSharedRepoContext(status.repoRoot)}`); }));

const workCommand = program.command("work").description("Deterministic Work Item persistence primitives.");
workCommand.command("materialize").requiredOption("--plan <json>").action((options: { plan: string }) => action(() => { const status = workspace(); const plan = approvedPlan(options.plan); const repo = openRepository(status.databasePath); let item: WorkItem; try { item = repo.materializePlan({ ...plan, git_baseline_json: JSON.stringify(captureBaseline(status.repoRoot)) }); } finally { repo.close(); } console.log(`Materialized ${item!.ref}: ${item!.title}\nStable ID: ${item!.id}\nContext: ${sync(status, item!)}`); console.log(`Recommended next operation: ${recommendedNext(status, item!)}`); }));
workCommand.command("materialize-rework").argument("<workRef>").requiredOption("--tasks <json>").action((reference: string, options: { tasks: string }) => action(() => { const status = workspace(); let tasks: unknown; try { tasks = JSON.parse(options.tasks); } catch { throw new Error("--tasks must be valid JSON."); } const plan = approvedPlan(JSON.stringify({ title: "approved", intent: "approved", goal: "approved", scope: "approved", expected_touchpoints: "approved", out_of_scope: "approved", acceptance_criteria: "approved", validation: "approved", tasks })); const repo = openRepository(status.databasePath); let item: WorkItem; try { item = repo.materializeRework(work(repo, reference).id, plan.tasks); } finally { repo.close(); } sync(status, item!); console.log(`Materialized remediation Tasks in ${item!.ref}.\nRecommended next operation: ${recommendedNext(status, item!)}`); }));
workCommand.command("status").argument("<workRef>").action((reference: string) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); try { const item = work(repo, reference); const tasks = repo.listTasks(item.id) as Task[]; const review = repo.latestReview(item.id); console.log(`${item.ref}: ${item.title}\nStable ID: ${item.id}\nState: ${item.status}\nTasks: ${tasks.filter((task) => task.status === "done").length}/${tasks.length} done\nLatest review: ${review?.outcome ?? "none"}\nRecommended next operation: ${nextOperation(item, tasks, review)}`); } finally { repo.close(); } }));
workCommand.command("list").action(() => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); try { const items = repo.listWork(); console.log(items.length ? items.map((item: WorkItem) => `${item.ref}: ${item.title} [${item.status}]`).join("\n") : "No Work Items."); } finally { repo.close(); } }));
workCommand.command("show").argument("<workRef>").action((reference: string) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); try { const item = work(repo, reference); const tasks = repo.listTasks(item.id) as Task[]; const review = repo.latestReview(item.id); const checkpoint = repo.latestCheckpoint(item.id); const checkpointTask = checkpoint?.task_id ? repo.getTask(checkpoint.task_id) as Task | null : null; const details = tasks.map((task) => `Task ${task.position}: ${task.title} [${task.status}]\nObjective: ${task.objective}\nImplementation approach: ${task.implementation_approach}\nExpected touchpoints: ${task.expected_touchpoints}\nAcceptance criteria: ${task.acceptance_criteria}\nTargeted validation: ${task.validation}\nCompletion validation evidence: ${task.validation_evidence ?? "none"}\nAttribution: ${task.attribution_json ?? "none"}`).join("\n\n") || "None"; const reviewDetails = review ? `ID: ${review.id}\nOutcome: ${review.outcome}\nSummary: ${review.summary}\nFindings: ${recoveredFindings(review.findings)}\nValidation evidence: ${review.validation_evidence}\nCreated at: ${review.created_at}` : "none"; const checkpointDetails = checkpoint ? `ID: ${checkpoint.id}\nTask: ${checkpointTask ? `Task ${checkpointTask.position}: ${checkpointTask.title}` : "none"}\nSummary: ${checkpoint.summary}\nNext step: ${checkpoint.next_step ?? "none"}\nCreated at: ${checkpoint.created_at}` : "none"; console.log(`${item.ref}: ${item.title}\nStable ID: ${item.id}\nState: ${item.status}\nIntent: ${item.intent}\nGoal: ${item.goal}\nScope: ${item.scope}\nExpected touchpoints: ${item.expected_touchpoints}\nOut of scope: ${item.out_of_scope}\nAcceptance criteria: ${item.acceptance_criteria}\nFull validation: ${item.validation}\n\nTasks:\n${details}\n\nLatest review:\n${reviewDetails}\nLatest checkpoint:\n${checkpointDetails}`); } finally { repo.close(); } }));
const task = workCommand.command("task").description("Task operations scoped to a Work Item.");
task.command("start").argument("<workRef>").argument("<position>").action((reference: string, position: string) => action(() => transitionTask(reference, position)));
task.command("done").argument("<workRef>").argument("<position>").requiredOption("--evidence <evidence>").requiredOption("--files <paths...>").action((reference: string, position: string, options: { evidence: string; files: string[] }) => action(() => completeTask(reference, position, options)));

program.command("review").argument("<workRef>").requiredOption("--outcome <PASS|REWORK>").requiredOption("--summary <summary>").requiredOption("--validation-evidence <evidence>").option("--findings <json>").option("--remediation-title <title>").option("--remediation-objective <objective>").option("--remediation-approach <approach>").option("--remediation-touchpoints <touchpoints>").option("--remediation-acceptance-criteria <criteria>").option("--remediation-validation <validation>").action((reference: string, options: { outcome: string; summary: string; validationEvidence: string; findings?: string; remediationTitle?: string; remediationObjective?: string; remediationApproach?: string; remediationTouchpoints?: string; remediationAcceptanceCriteria?: string; remediationValidation?: string }) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); let item: WorkItem; let outcome: "PASS" | "REWORK"; let findings: ReviewFinding[]; try { item = work(repo, reference); outcome = options.outcome.toUpperCase() as "PASS" | "REWORK"; if (!(["PASS", "REWORK"] as string[]).includes(outcome)) throw new Error("Review outcome must be PASS or REWORK."); findings = reviewFindings(options.findings); const blockers = findings.filter(blocksPass); const remediation = [options.remediationTitle, options.remediationObjective, options.remediationApproach, options.remediationAcceptanceCriteria, options.remediationValidation]; if (outcome === "REWORK" && (!blockers.length || remediation.some((value) => !value?.trim()))) throw new Error("REWORK requires blocking findings and an execution-ready remediation Task."); if (outcome === "PASS" && blockers.length) throw new Error("PASS is not permitted while critical, high, or unaccepted medium findings remain."); if (!(["active", "review"] as string[]).includes(item.status) || (repo.listTasks(item.id) as Task[]).some((entry) => entry.status !== "done")) throw new Error("Work Review requires an active Work Item with every Task done."); repo.createReview({ work_item_id: item.id, outcome, summary: options.summary, findings: findings.length ? JSON.stringify(findings) : null, validation_evidence: options.validationEvidence }); item = work(repo, item.id); } finally { repo.close(); } sync(status, item!); const blockers = findings!.filter(blocksPass); const residual = findings!.filter((finding) => !blocksPass(finding)); const reviewOutput = outcome === "REWORK" ? `\n${formatFindings(findings!, "Findings")}\n\n${formatFindings(blockers, "Blocking findings")}\n\nRemediation Plan Preview:\n\nTask 1 — ${options.remediationTitle!.trim()}\n\nObjective:\n${options.remediationObjective!.trim()}\n\nImplementation approach:\n${options.remediationApproach!.trim()}\n${options.remediationTouchpoints?.trim() ? `\nExpected touchpoints:\n${options.remediationTouchpoints.trim()}\n` : ""}\nAcceptance criteria:\n${options.remediationAcceptanceCriteria!.trim()}\n\nTargeted validation:\n${options.remediationValidation!.trim()}\n` : residual.length ? `\n\n${formatFindings(residual, "Residual findings")}\nThese findings do not block Close.\n` : ""; console.log(`${item!.ref} review: ${outcome}${reviewOutput}\nRecommended next operation: ${recommendedNext(status, item!)}`); }));
program.command("checkpoint").argument("<workRef>").requiredOption("--summary <summary>").option("--task <position>").option("--next-step <step>").action((reference: string, options: { summary: string; task?: string; nextStep?: string }) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); let item: WorkItem; try { item = work(repo, reference); const entry = options.task ? taskAt(repo, item, options.task) : null; repo.createCheckpoint({ work_item_id: item.id, task_id: entry?.id ?? null, summary: options.summary, next_step: options.nextStep ?? null }); } finally { repo.close(); } sync(status, item!); console.log(`Checkpoint saved for ${item!.ref}.\nRecommended next operation: ${recommendedNext(status, item!)}`); }));
program.command("close").argument("<workRef>").requiredOption("--message <message>").action((reference: string, options: { message: string }) => action(() => { closeWork(reference, options.message); console.log("Recommended next operation: No further Nerv lifecycle operation is required."); }));
program.command("status").action(() => action(() => { const status = getWorkspaceStatus(process.cwd()); console.log(`Nerv status: ${status.initialized ? "initialized" : "not initialized"}`); if (status.initialized && status.repoRoot && status.workspaceRoot && status.databasePath) { const context = discoverContext(status.repoRoot, status.workspaceRoot, status.databasePath); console.log(`Product Context: ${context.product ? "available" : "not available"}`); console.log(`Shared Repo Context: ${context.repo ? "available" : "not available"}`); console.log(`Local Repo Observations: ${context.localRepo ? "available" : "not available"}`); } }));

function transitionTask(reference: string, position: string) { const status = workspace(); const repo = openRepository(status.databasePath); let item: WorkItem; let entry: Task; try { item = work(repo, reference); entry = repo.startTask(item.id, Number(position)); item = work(repo, item.id); } finally { repo.close(); } sync(status, item!); console.log(`Started Task ${entry!.position} in ${item!.ref}.\nRecommended next operation: ${recommendedNext(status, item!)}`); }
function completeTask(reference: string, position: string, options: { evidence: string; files: string[] }) { const status = workspace(); const repo = openRepository(status.databasePath); let item: WorkItem; let entry: Task; try { item = work(repo, reference); entry = taskAt(repo, item, position); const baseline = JSON.parse(item.git_baseline_json ?? "null"); if (!baseline) throw new Error("Task completion requires an activation Git baseline."); const paths = [...new Set(options.files.map((path) => validatePath(status.repoRoot, path)))].sort(); const baselinePaths = new Set(baseline.dirty.map((dirty: { path: string }) => dirty.path)); const ambiguousBaselinePaths = paths.filter((path) => baselinePaths.has(path)); const attribution: Attribution = { paths: paths.map((path) => fileState(status.repoRoot, path)), ambiguousBaselinePaths }; entry = repo.completeTask(entry.id, options.evidence.trim(), JSON.stringify(attribution)); item = work(repo, item.id); } finally { repo.close(); } sync(status, item!); console.log(`Completed Task ${entry!.position} in ${item!.ref}.\nRecommended next operation: ${recommendedNext(status, item!)}`); }
function closeWork(reference: string, message: string) {
  const status = workspace();
  const repo = openRepository(status.databasePath);
  try {
    const item = work(repo, reference);
    if (item.status !== "review" || repo.latestReview(item.id)?.outcome !== "PASS" || !item.validation_evidence) throw new Error(`Work Item ${item.ref} is not ready to close.`);
    const baseline = JSON.parse(item.git_baseline_json ?? "null") as GitBaseline | null;
    if (!baseline || (repo.listTasks(item.id) as Task[]).some((task) => task.status !== "done")) throw new Error("Close requires an activated Work Item with all Tasks done.");
    if (cachedPaths(status.repoRoot).length) throw new Error("Close blocked: Git index is not clean.");
    const tasks = repo.listTasks(item.id) as Task[];
    const attributed = new Set<string>();
    const ambiguousBaselinePaths = new Set<string>();
    for (const task of tasks) {
      const attribution = task.attribution_json ? JSON.parse(task.attribution_json) as Attribution : null;
      for (const path of attribution?.paths ?? []) attributed.add(path.path);
      for (const path of attribution?.ambiguousBaselinePaths ?? []) ambiguousBaselinePaths.add(path);
    }
    const changed = changedPaths(status.repoRoot, baseline.head);
    const changedSet = new Set(changed);
    const baselinePaths = new Set(baseline.dirty.map((dirty) => dirty.path));
    const unchangedBaselinePaths = new Set(baseline.dirty.filter((dirty) => {
      const actual = fileState(status.repoRoot, dirty.path);
      return changedSet.has(dirty.path) && actual.state === dirty.state && actual.hash === dirty.hash;
    }).map((dirty) => dirty.path));
    const restoredBaselinePaths = baseline.dirty.filter((dirty) => !changedSet.has(dirty.path)).map((dirty) => dirty.path);
    const noWorkDiff = changed.every((path) => baselinePaths.has(path) && unchangedBaselinePaths.has(path)) && restoredBaselinePaths.every((path) => attributed.has(path) && ambiguousBaselinePaths.has(path));
    if (noWorkDiff) {
      repo.closeWork(item.id, null);
      removeActiveContext(status.workspaceRoot, item.ref);
      console.log(`Closed ${item.ref}: no tracked Git diff.`);
      return;
    }
    if (ambiguousBaselinePaths.size) throw new Error("Close blocked: baseline-dirty paths cannot be attributed safely.");
    for (const dirty of baseline.dirty) {
      const actual = fileState(status.repoRoot, dirty.path);
      if (actual.state !== dirty.state || actual.hash !== dirty.hash) throw new Error(`Close blocked: baseline-dirty path changed: ${dirty.path}`);
    }
    const unowned = changed.filter((path) => !attributed.has(path) && !baselinePaths.has(path));
    if (unowned.length) throw new Error(`Close blocked: unattributed changes: ${unowned.join(", ")}`);
    stage(status.repoRoot, changed.filter((path) => attributed.has(path)));
    if (!stagedDiff(status.repoRoot)) throw new Error("Close blocked: no attributable changes to commit.");
    const hash = commit(status.repoRoot, `${message}\n\nNerv-Work: ${item.id}\nNerv-Work-Ref: ${item.ref}`);
    repo.closeWork(item.id, hash);
    removeActiveContext(status.workspaceRoot, item.ref);
    console.log(`Closed ${item.ref}: ${hash}`);
  } finally {
    repo.close();
  }
}
await program.parseAsync();
