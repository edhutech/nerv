#!/usr/bin/env node
import { Command } from "commander";
import { createRequire } from "node:module";
import { assertCanonicalSetupEstablished, getWorkspaceStatus, ensureWorkspace } from "./workspace.js";
import { openRepository, type ApprovedPlan, type PlanTask, type Repository, type Task, type WorkItem } from "./repository.js";
import { discoverContext } from "./context.js";
import { nextOperation, removeActiveContext, syncActiveContext } from "./work.js";
import { assertCleanIndex, assertExpectedHead, assertProtectedBaseline, canonicalPath, captureBaseline, createExactCommit, currentRef, headTree, publishCommit, refreshIndex, rollbackPublishedCommit, workFingerprint, type GitBaseline, type GitFingerprint } from "./git.js";

const packageVersion = (createRequire(import.meta.url)("../package.json") as { version: string }).version;
const program = new Command().name("nerv").description("Local-first Agent Work Harness.").version(packageVersion);
type Workspace = { repoRoot: string; workspaceRoot: string; databasePath: string };
type FindingSeverity = "critical" | "high" | "medium" | "low";
type ReviewFinding = { severity: FindingSeverity; finding: string; accepted_as_residual_risk?: boolean };
type RemediationOptions = { remediationTitle?: string; remediationObjective?: string; remediationApproach?: string; remediationTouchpoints?: string; remediationAcceptanceCriteria?: string; remediationValidation?: string };
function action(handler: () => void) {
  try {
    handler();
  } catch (error) {
    program.error(error instanceof Error ? error.message : String(error), {
      exitCode: 1,
      code: "NERV_OPERATION_FAILED",
    });
  }
}
function workspace(): Workspace {
  const status = getWorkspaceStatus(process.cwd());
  if (!status.initialized || !status.repoRoot || !status.workspaceRoot || !status.databasePath) {
    throw new Error("Nerv is not initialized in this repo. Execute `nerv init` first.");
  }
  return {
    repoRoot: status.repoRoot,
    workspaceRoot: status.workspaceRoot,
    databasePath: status.databasePath,
  };
}
function work(repo: Repository, reference: string): WorkItem {
  const item = repo.getWork(reference);
  if (!item) throw new Error(`Work Item ${reference.toUpperCase()} not found.`);
  return item;
}
function taskAt(repo: Repository, item: WorkItem, position: string): Task {
  const task = repo.getTaskAt(item.id, Number(position));
  if (!task || !Number.isInteger(Number(position)) || Number(position) < 1) {
    throw new Error(`Task ${position} not found in ${item.ref}.`);
  }
  return task;
}
function sync(status: Workspace, item: WorkItem) {
  const repo = openRepository(status.databasePath);
  try {
    return syncActiveContext(status.workspaceRoot, item, repo.listTasks(item.id), repo.latestReview(item.id), repo.latestCheckpoint(item.id));
  } finally {
    repo.close();
  }
}
function recommendedNext(status: Workspace, item: WorkItem) {
  const repo = openRepository(status.databasePath);
  try {
    return nextOperation(item, repo.listTasks(item.id), repo.latestReview(item.id));
  } finally {
    repo.close();
  }
}
function approvedPlan(value: string): ApprovedPlan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("--plan must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("--plan must be an approved Work plan object.");
  }
  const input = parsed as Record<string, unknown>;
  const workFields = ["title", "intent", "goal", "scope", "expected_touchpoints", "out_of_scope", "acceptance_criteria", "validation"] as const;
  const taskFields = ["title", "objective", "implementation_approach", "expected_touchpoints", "acceptance_criteria", "validation"] as const;
  for (const field of workFields) {
    if (typeof input[field] !== "string" || !input[field].trim()) {
      throw new Error(`Approved Work plan requires ${field}.`);
    }
  }
  if (!Array.isArray(input.tasks) || !input.tasks.length) {
    throw new Error("Approved Work plan requires at least one Task.");
  }
  for (const task of input.tasks) {
    if (!task || typeof task !== "object") {
      throw new Error("Each approved Task must be an object.");
    }
    for (const field of taskFields) {
      if (typeof (task as Record<string, unknown>)[field] !== "string" || !String((task as Record<string, unknown>)[field]).trim()) {
        throw new Error(`Each approved Task requires ${field}.`);
      }
    }
  }
  return input as ApprovedPlan;
}
function reviewFindings(value?: string): ReviewFinding[] { if (!value?.trim()) return []; let parsed: unknown; try { parsed = JSON.parse(value); } catch { throw new Error("--findings must be a JSON array of severity-labeled findings."); } if (!Array.isArray(parsed) || !parsed.length) throw new Error("--findings must be a non-empty JSON array when supplied."); return parsed.map((entry) => { if (!entry || typeof entry !== "object") throw new Error("Each Review finding must be an object."); const finding = entry as Record<string, unknown>; if (typeof finding.finding !== "string" || !finding.finding.trim() || !["critical", "high", "medium", "low"].includes(String(finding.severity))) throw new Error("Each Review finding requires a severity of critical, high, medium, or low and non-empty finding text."); if (finding.accepted_as_residual_risk !== undefined && typeof finding.accepted_as_residual_risk !== "boolean") throw new Error("accepted_as_residual_risk must be boolean when supplied."); if (finding.accepted_as_residual_risk && finding.severity !== "medium") throw new Error("Only medium findings may be accepted as residual risk."); return { severity: finding.severity as FindingSeverity, finding: finding.finding.trim(), ...(finding.accepted_as_residual_risk ? { accepted_as_residual_risk: true } : {}) }; }); }
const blocksPass = (finding: ReviewFinding) => finding.severity === "critical" || finding.severity === "high" || (finding.severity === "medium" && !finding.accepted_as_residual_risk);
const formatFindings = (findings: ReviewFinding[], heading: string) => findings.length ? `${heading}:\n${findings.map((finding) => `- ${finding.severity.toUpperCase()}${finding.accepted_as_residual_risk ? " (accepted residual risk)" : ""} - ${finding.finding}`).join("\n")}` : "";
function remediation(options: RemediationOptions): PlanTask[] { const values = [options.remediationTitle, options.remediationObjective, options.remediationApproach, options.remediationTouchpoints, options.remediationAcceptanceCriteria, options.remediationValidation]; if (values.some((value) => !value?.trim())) throw new Error("REWORK requires an execution-ready remediation Task."); return [{ title: options.remediationTitle!, objective: options.remediationObjective!, implementation_approach: options.remediationApproach!, expected_touchpoints: options.remediationTouchpoints!, acceptance_criteria: options.remediationAcceptanceCriteria!, validation: options.remediationValidation! }]; }
function ownedPaths(tasks: Task[]): string[] {
  return [...new Set(tasks.flatMap((task) => {
    try {
      const value = JSON.parse(task.attribution_json ?? "{\"paths\":[]}") as { paths?: unknown };
      return Array.isArray(value.paths) && value.paths.every((path) => typeof path === "string") ? value.paths : [];
    } catch {
      return [];
    }
  }))].sort();
}

program.command("init").action(() => action(() => { const status = getWorkspaceStatus(process.cwd()); if (!status.repoRoot) throw new Error("nerv init must be run inside a Git repository."); const existed = status.initialized; const result = ensureWorkspace(status.repoRoot); console.log(existed ? `Nerv is already initialized in ${status.repoRoot}.` : `Initialized Nerv in ${status.repoRoot}.`); console.log(`Repository setup: ${result.setup.every((entry) => entry.established) ? "established at HEAD" : `not established (${result.setup.filter((entry) => !entry.established).map((entry) => entry.path).join(", ")})`}.`); if (result.skillSync.message) console.log(result.skillSync.message); }));
const workCommand = program.command("work").description("Deterministic Work Item persistence primitives.");
workCommand.command("materialize").requiredOption("--plan <json>").action((options: { plan: string }) => action(() => { const status = workspace(); const plan = approvedPlan(options.plan); const repo = openRepository(status.databasePath); let item: WorkItem; try { if (!repo.listWork().some((entry) => entry.status !== "closed")) assertCanonicalSetupEstablished(status.repoRoot); item = repo.materializePlan({ ...plan, git_baseline_json: JSON.stringify(captureBaseline(status.repoRoot)) }); } finally { repo.close(); } console.log(`Materialized ${item!.ref}: ${item!.title}\nStable ID: ${item!.id}\nContext: ${sync(status, item!)}`); console.log(`Recommended next operation: ${recommendedNext(status, item!)}`); }));
workCommand.command("materialize-rework").argument("<workRef>").action((reference: string) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); let item: WorkItem; try { item = repo.materializeRework(work(repo, reference).id); } finally { repo.close(); } sync(status, item!); console.log(`Materialized persisted remediation Tasks in ${item!.ref}.\nRecommended next operation: ${recommendedNext(status, item!)}`); }));
workCommand.command("status").argument("<workRef>").action((reference: string) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); try { const item = work(repo, reference); const tasks = repo.listTasks(item.id); console.log(`${item.ref}: ${item.title}\nStable ID: ${item.id}\nState: ${item.status}\nTasks: ${tasks.filter((entry) => entry.status === "done").length}/${tasks.length} done\nLatest review: ${repo.latestReview(item.id)?.outcome ?? "none"}\nRecommended next operation: ${nextOperation(item, tasks, repo.latestReview(item.id))}`); } finally { repo.close(); } }));
workCommand.command("show").argument("<workRef>").action((reference: string) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); try { const item = work(repo, reference); const tasks = repo.listTasks(item.id); const review = repo.latestReview(item.id); const checkpoint = repo.latestCheckpoint(item.id); const checkpointTask = checkpoint?.task_id ? repo.getTask(checkpoint.task_id) : null; console.log(`${item.ref}: ${item.title}\nStable ID: ${item.id}\nState: ${item.status}\nIntent: ${item.intent}\nGoal: ${item.goal}\nScope: ${item.scope}\nExpected touchpoints: ${item.expected_touchpoints}\nOut of scope: ${item.out_of_scope}\nAcceptance criteria: ${item.acceptance_criteria}\nFull validation: ${item.validation}\n\n${tasks.map((entry) => `Task ${entry.position}: ${entry.title} [${entry.status}]\nObjective: ${entry.objective}\nImplementation approach: ${entry.implementation_approach}\nExpected touchpoints: ${entry.expected_touchpoints}\nAcceptance criteria: ${entry.acceptance_criteria}\nTargeted validation: ${entry.validation}\nCompletion validation evidence: ${entry.validation_evidence ?? "none"}\nAttribution: ${entry.attribution_json ?? "none"}`).join("\n\n")}\n\nLatest review:\n${review ? `ID: ${review.id}\nOutcome: ${review.outcome}\nSummary: ${review.summary}\nFindings: ${review.findings ?? "none"}\nPersisted remediation proposal: ${review.remediation_json ?? "none"}\nValidation evidence: ${review.validation_evidence}\nGit fingerprint: ${review.git_fingerprint_json ?? "none"}\nVerification evidence: ${review.verification_evidence ?? "none"}\nCreated at: ${review.created_at}` : "none"}\nLatest checkpoint:\n${checkpoint ? `ID: ${checkpoint.id}\nTask: ${checkpointTask ? `Task ${checkpointTask.position}: ${checkpointTask.title}` : "none"}\nSummary: ${checkpoint.summary}\nNext step: ${checkpoint.next_step ?? "none"}\nCreated at: ${checkpoint.created_at}` : "none"}`); } finally { repo.close(); } }));
const task = workCommand.command("task").description("Task operations scoped to a Work Item.");
task.command("start").argument("<workRef>").argument("<position>").action((reference: string, position: string) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); let item: WorkItem; let entry: Task; try { item = work(repo, reference); entry = repo.startTask(item.id, Number(position)); item = work(repo, item.id); } finally { repo.close(); } sync(status, item!); console.log(`Started Task ${entry!.position} in ${item!.ref}.\nRecommended next operation: ${recommendedNext(status, item!)}`); }));
task.command("done").argument("<workRef>").argument("<position>").requiredOption("--evidence <evidence>").option("--files <paths...>").action((reference: string, position: string, options: { evidence: string; files?: string[] }) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); let item: WorkItem; let entry: Task; try { item = work(repo, reference); entry = taskAt(repo, item, position); const baseline = JSON.parse(item.git_baseline_json ?? "null") as GitBaseline | null; if (!baseline) throw new Error("Task completion requires an activation Git baseline."); assertExpectedHead(status.repoRoot, baseline.head); const paths = [...new Set((options.files ?? []).map((path) => canonicalPath(status.repoRoot, path)))].sort(); if (paths.some((path) => baseline.protected_paths.some((protectedPath) => path === protectedPath || path.startsWith(`${protectedPath}/`) || protectedPath.startsWith(`${path}/`)))) throw new Error("Baseline-dirty paths cannot be attributed to a Task."); entry = repo.completeTask(entry.id, options.evidence.trim(), JSON.stringify({ paths })); item = work(repo, item.id); } finally { repo.close(); } sync(status, item!); console.log(`Completed Task ${entry!.position} in ${item!.ref}.\nRecommended next operation: ${recommendedNext(status, item!)}`); }));
program.command("review").argument("<workRef>").requiredOption("--outcome <PASS|REWORK>").requiredOption("--summary <summary>").requiredOption("--validation-evidence <evidence>").option("--verification-evidence <evidence>").option("--findings <json>").option("--remediation-title <title>").option("--remediation-objective <objective>").option("--remediation-approach <approach>").option("--remediation-touchpoints <touchpoints>").option("--remediation-acceptance-criteria <criteria>").option("--remediation-validation <validation>").action((reference: string, options: { outcome: string; summary: string; validationEvidence: string; verificationEvidence?: string; findings?: string } & RemediationOptions) => action(() => reviewWork(reference, options)));
program.command("checkpoint").argument("<workRef>").requiredOption("--summary <summary>").option("--task <position>").option("--next-step <step>").action((reference: string, options: { summary: string; task?: string; nextStep?: string }) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); let item: WorkItem; try { item = work(repo, reference); const entry = options.task ? taskAt(repo, item, options.task) : null; repo.createCheckpoint({ work_item_id: item.id, task_id: entry?.id ?? null, summary: options.summary, next_step: options.nextStep ?? null }); } finally { repo.close(); } sync(status, item!); console.log(`Checkpoint saved for ${item!.ref}.\nRecommended next operation: ${recommendedNext(status, item!)}`); }));
program.command("close").argument("<workRef>").requiredOption("--message <message>").action((reference: string, options: { message: string }) => action(() => { closeWork(reference, options.message); console.log("Recommended next operation: No further Nerv lifecycle operation is required."); }));
program.command("status").action(() => action(() => { const status = getWorkspaceStatus(process.cwd()); console.log(`Nerv status: ${status.initialized ? "initialized" : "not initialized"}`); if (status.initialized && status.repoRoot) { const context = discoverContext(status.repoRoot); console.log(`Product Context: ${context.product ? "available" : "not available"}\nRepo Context: ${context.repo ? "available" : "not available"}`); } }));
function reviewWork(reference: string, options: { outcome: string; summary: string; validationEvidence: string; verificationEvidence?: string; findings?: string } & RemediationOptions) { const status = workspace(); const repo = openRepository(status.databasePath); let item: WorkItem; try { item = work(repo, reference); const outcome = options.outcome.toUpperCase() as "PASS" | "REWORK"; if (outcome !== "PASS" && outcome !== "REWORK") throw new Error("Review outcome must be PASS or REWORK."); if (item.status !== "active" && item.status !== "review") throw new Error("Work Review requires an active Work Item with all Tasks done."); if (item.status === "review" && !(outcome === "REWORK" && options.verificationEvidence?.trim())) throw new Error("Only REWORK with verification evidence may replace a PASS review."); const findings = reviewFindings(options.findings); const blockers = findings.filter(blocksPass); if (outcome === "PASS" && blockers.length) throw new Error("PASS is not permitted while critical, high, or unaccepted medium findings remain."); const proposal = outcome === "REWORK" ? remediation(options) : null; if (outcome === "REWORK" && !blockers.length) throw new Error("REWORK requires blocking findings and an execution-ready remediation Task."); const baseline = JSON.parse(item.git_baseline_json ?? "null") as GitBaseline | null; if (!baseline) throw new Error("Work Review requires an activation Git baseline."); assertCleanIndex(status.repoRoot); assertExpectedHead(status.repoRoot, baseline.head); assertProtectedBaseline(status.repoRoot, baseline); const current = workFingerprint(status.repoRoot, baseline, ownedPaths(repo.listTasks(item.id))); if (item.status === "review") { const previous = repo.latestReview(item.id); if (!previous?.git_fingerprint_json || JSON.stringify(current) !== previous.git_fingerprint_json) throw new Error("Git state changed after PASS; Work cannot be downgraded as reviewed."); } const fingerprint = outcome === "PASS" ? current : null; repo.createReview({ work_item_id: item.id, outcome, summary: options.summary.trim(), findings: findings.length ? JSON.stringify(findings) : null, remediation_json: proposal ? JSON.stringify(proposal) : null, validation_evidence: options.validationEvidence.trim(), git_fingerprint_json: fingerprint ? JSON.stringify(fingerprint) : null, verification_evidence: options.verificationEvidence?.trim() ?? null }); item = work(repo, item.id); const residual = findings.filter((finding) => !blocksPass(finding)); console.log(`${outcome} recorded for ${item.ref}.${residual.length ? `\n${formatFindings(residual, "Residual findings")}\nResidual findings do not block Close.` : ""}${proposal ? `\n${formatFindings(findings, "Blocking findings")}\nPersisted remediation proposal: ${proposal[0].title}` : ""}`); } finally { repo.close(); } sync(status, item!); console.log(`Recommended next operation: ${recommendedNext(status, item!)}`); }
function closeWork(reference: string, message: string) { const status = workspace(); const repo = openRepository(status.databasePath); try { const item = work(repo, reference); const review = repo.latestReview(item.id); if (item.status !== "review" || review?.outcome !== "PASS" || !review.git_fingerprint_json || !item.validation_evidence) throw new Error(`Work Item ${item.ref} is not ready to close.`); let baseline: GitBaseline; let fingerprint: GitFingerprint; try { baseline = JSON.parse(item.git_baseline_json ?? ""); fingerprint = JSON.parse(review.git_fingerprint_json); } catch { throw new Error("Close requires valid persisted Git review evidence."); } if (!baseline || !fingerprint || !Array.isArray(fingerprint.paths) || typeof fingerprint.tree !== "string" || typeof fingerprint.head !== "string" || repo.listTasks(item.id).some((entry) => entry.status !== "done")) throw new Error("Close requires valid persisted Git review evidence."); assertCleanIndex(status.repoRoot); assertExpectedHead(status.repoRoot, baseline.head); assertProtectedBaseline(status.repoRoot, baseline); if (JSON.stringify(workFingerprint(status.repoRoot, baseline, ownedPaths(repo.listTasks(item.id))) ) !== JSON.stringify(fingerprint)) throw new Error("Git state changed after PASS; Work cannot close as reviewed."); if (fingerprint.tree === headTree(status.repoRoot, baseline.head)) { repo.closeWork(item.id, null); removeActiveContext(status.workspaceRoot, item.ref); console.log(`Closed ${item.ref}: no tracked Git diff.`); return; } const pending = createExactCommit(status.repoRoot, fingerprint.tree, baseline.head, `${message}\n\nNerv-Work: ${item.id}\nNerv-Work-Ref: ${item.ref}`); try { publishCommit(status.repoRoot, pending, baseline.head); } catch { throw new Error("Git publication failed before Nerv persistence; no Git or index cleanup was attempted."); } try { repo.closeWork(item.id, pending.commit); } catch (error) { try { if (currentRef(status.repoRoot, pending.ref) === pending.commit) rollbackPublishedCommit(status.repoRoot, pending, baseline.head); else throw new Error("publication authority lost"); } catch { throw new Error(`Git/Nerv consistency failure after publication: ${baseline.head} -> ${currentRef(status.repoRoot, pending.ref)}. ${error instanceof Error ? error.message : String(error)}`); } throw error; } refreshIndex(status.repoRoot); removeActiveContext(status.workspaceRoot, item.ref); console.log(`Closed ${item.ref}: ${pending.commit}`); } finally { repo.close(); } }
await program.parseAsync();
