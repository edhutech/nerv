#!/usr/bin/env node
import { Command } from "commander";
import { createRequire } from "node:module";
import { assertCanonicalSetupEstablished, getWorkspaceStatus, ensureWorkspace, uninstallWorkspace } from "./workspace.js";
import { openRepository, type ApprovedPlan, type PlanTask, type Repository, type Review, type Task, type WorkItem } from "./repository.js";
import { discoverContext } from "./context.js";
import { developerHandoff, executionStatus, remediationPreview, reviewFindingsPreview, removeActiveContext, syncActiveContext } from "./work.js";
import { assertCleanIndex, assertExpectedHead, assertProtectedBaseline, canonicalPath, captureBaseline, createExactCommit, currentRef, headTree, publishCommit, refreshIndex, rollbackPublishedCommit, workFingerprint, type GitBaseline, type GitFingerprint } from "./git.js";

const packageVersion = (createRequire(import.meta.url)("../package.json") as { version: string }).version;
const program = new Command().name("nerv").description("Local-first Agent Work Harness.").version(packageVersion);
type Workspace = { repoRoot: string; workspaceRoot: string; databasePath: string };
const FINDING_SEVERITIES = ["critical", "high", "medium", "low"] as const;
type FindingSeverity = (typeof FINDING_SEVERITIES)[number];
type ReviewFinding = { severity: FindingSeverity; issue: string; why_blocks_pass: string; evidence: string; affected_work_criterion: string; medium_residual_risk_decision?: string; accepted_as_residual_risk?: boolean };
type RemediationOptions = { remediationTitle?: string; remediationObjective?: string; remediationApproach?: string; remediationTouchpoints?: string; remediationAcceptanceCriteria?: string; remediationValidation?: string };
const MATERIALIZE_PLAN_EXAMPLE = JSON.stringify({ title: "Add status", goal: "Expose context state", scope: "Read-only status output", acceptance_criteria: "Status reports context state", validation: "pnpm test", tasks: [{ title: "Report state", objective: "Render context state", acceptance_criteria: "Status output is clear", validation: "pnpm test" }] });
const REVIEW_FINDINGS_EXAMPLE = JSON.stringify([{ severity: "high", issue: "Describe the blocking issue", why_blocks_pass: "The approved outcome is not met.", evidence: "Relevant validation or review evidence.", affected_work_criterion: "The affected Work acceptance criterion." }]);
const MATERIALIZE_PLAN_HELP = `
JSON contract for --plan:
  Work object required string fields: title, goal, scope, acceptance_criteria, validation.
  Optional Work string fields: intent, expected_touchpoints, out_of_scope.
  Required tasks field: non-empty array of Task objects.
  Task object required string fields: title, objective, acceptance_criteria, validation.
  Optional Task string fields: implementation_approach, expected_touchpoints.
  Example: ${MATERIALIZE_PLAN_EXAMPLE}
`;
const REVIEW_FINDINGS_HELP = `
JSON contract for --findings:
  Optional non-empty JSON array of finding objects.
  Required finding fields: severity, issue, why_blocks_pass, evidence, affected_work_criterion.
  severity must be one of: ${FINDING_SEVERITIES.join(", ")}.
  Optional fields: medium_residual_risk_decision (required for medium findings); accepted_as_residual_risk (boolean; true only for medium findings).
  Critical, high, and unaccepted medium findings block PASS; findings are required for REWORK.
  Example: ${REVIEW_FINDINGS_EXAMPLE}
`;
const UNINSTALL_HELP = `
Removes repository-level Nerv setup only; it does not uninstall the global npm package.
Uninstall refuses when local Nerv state cannot be inspected or unresolved Work exists.
The command never stages or commits Git changes; review and commit any removals normally.
Global removal remains: npm uninstall -g @edhutech/nerv
`;
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
    return developerHandoff(item, repo.listTasks(item.id), repo.latestReview(item.id));
  } finally {
    repo.close();
  }
}
function handoff(status: Workspace, item: WorkItem): string {
  const next = recommendedNext(status, item);
  return next ? `Recommended next action: ${next}` : `Execution: ${executionStatus(currentTasks(status, item))}`;
}
function currentTasks(status: Workspace, item: WorkItem): Task[] {
  const repo = openRepository(status.databasePath);
  try {
    return repo.listTasks(item.id);
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
  const workFields = ["title", "goal", "scope", "acceptance_criteria", "validation"] as const;
  const taskFields = ["title", "objective", "acceptance_criteria", "validation"] as const;
  for (const field of workFields) {
    if (typeof input[field] !== "string" || !input[field].trim()) {
      throw new Error(`Approved Work plan requires ${field}.`);
    }
  }
  if (!Array.isArray(input.tasks) || !input.tasks.length) {
    throw new Error("Approved Work plan requires at least one Task.");
  }
  const text = (entry: Record<string, unknown>, field: string) => typeof entry[field] === "string" ? entry[field].trim() : "";
  const tasks = input.tasks.map((task) => {
    if (!task || typeof task !== "object") {
      throw new Error("Each approved Task must be an object.");
    }
    for (const field of taskFields) {
      if (!text(task as Record<string, unknown>, field)) {
        throw new Error(`Each approved Task requires ${field}.`);
      }
    }
    const entry = task as Record<string, unknown>;
    return { title: text(entry, "title"), objective: text(entry, "objective"), implementation_approach: text(entry, "implementation_approach"), expected_touchpoints: text(entry, "expected_touchpoints"), acceptance_criteria: text(entry, "acceptance_criteria"), validation: text(entry, "validation") };
  });
  return { title: text(input, "title"), intent: text(input, "intent"), goal: text(input, "goal"), scope: text(input, "scope"), expected_touchpoints: text(input, "expected_touchpoints"), out_of_scope: text(input, "out_of_scope"), acceptance_criteria: text(input, "acceptance_criteria"), validation: text(input, "validation"), tasks, git_baseline_json: "" };
}
function reviewFindings(value?: string): ReviewFinding[] { if (!value?.trim()) return []; let parsed: unknown; try { parsed = JSON.parse(value); } catch { throw new Error("--findings must be a JSON array of structured findings."); } if (!Array.isArray(parsed) || !parsed.length) throw new Error("--findings must be a non-empty JSON array when supplied."); return parsed.map((entry) => { if (!entry || typeof entry !== "object") throw new Error("Each Review finding must be an object."); const finding = entry as Record<string, unknown>; const required = ["issue", "why_blocks_pass", "evidence", "affected_work_criterion"] as const; if (!FINDING_SEVERITIES.includes(String(finding.severity) as FindingSeverity) || required.some((field) => typeof finding[field] !== "string" || !(finding[field] as string).trim())) throw new Error(`Each Review finding requires severity (${FINDING_SEVERITIES.join(", ")}) and non-empty finding fields: ${required.join(", ")}.`); if (finding.medium_residual_risk_decision !== undefined && (typeof finding.medium_residual_risk_decision !== "string" || !finding.medium_residual_risk_decision.trim())) throw new Error("medium_residual_risk_decision must be non-empty when supplied."); if (finding.severity === "medium" && finding.medium_residual_risk_decision === undefined) throw new Error("Medium findings require medium_residual_risk_decision."); if (finding.accepted_as_residual_risk !== undefined && typeof finding.accepted_as_residual_risk !== "boolean") throw new Error("accepted_as_residual_risk must be boolean when supplied."); if (finding.accepted_as_residual_risk && finding.severity !== "medium") throw new Error("Only medium findings may be accepted as residual risk."); return { severity: finding.severity as FindingSeverity, issue: (finding.issue as string).trim(), why_blocks_pass: (finding.why_blocks_pass as string).trim(), evidence: (finding.evidence as string).trim(), affected_work_criterion: (finding.affected_work_criterion as string).trim(), ...(finding.medium_residual_risk_decision ? { medium_residual_risk_decision: (finding.medium_residual_risk_decision as string).trim() } : {}), ...(finding.accepted_as_residual_risk ? { accepted_as_residual_risk: true } : {}) }; }); }
const blocksPass = (finding: ReviewFinding) => finding.severity === "critical" || finding.severity === "high" || (finding.severity === "medium" && !finding.accepted_as_residual_risk);
 const formatFindings = (findings: ReviewFinding[], heading: string) => findings.length ? `${heading}:\n${findings.map((finding) => `- ${finding.severity.toUpperCase()}${finding.accepted_as_residual_risk ? " (accepted residual risk)" : ""}\n${reviewFindingsPreview({ findings: JSON.stringify([finding]) })}`).join("\n\n")}` : "";
function remediation(options: RemediationOptions): PlanTask[] { const values = [options.remediationTitle, options.remediationObjective, options.remediationAcceptanceCriteria, options.remediationValidation]; if (values.some((value) => !value?.trim())) throw new Error("REWORK requires title, objective, acceptance criteria, and validation."); return [{ title: options.remediationTitle!.trim(), objective: options.remediationObjective!.trim(), implementation_approach: options.remediationApproach?.trim() ?? "", expected_touchpoints: options.remediationTouchpoints?.trim() ?? "", acceptance_criteria: options.remediationAcceptanceCriteria!.trim(), validation: options.remediationValidation!.trim() }]; }
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
function requiredEvidence(value: string | undefined, label: string): string {
  const evidence = value?.trim() ?? "";
  if (!evidence) throw new Error(`${label} must be non-empty.`);
  return evidence;
}
function commitSubject(value: string): string {
  if (/[\r\n]/.test(value)) throw new Error("Close subject must be a single line.");
  const subject = value.trim();
  if (!subject) throw new Error("Close subject must be non-empty.");
  return subject;
}

program.command("init").action(() => action(() => { const status = getWorkspaceStatus(process.cwd()); if (!status.repoRoot) throw new Error("nerv init must be run inside a Git repository."); const existed = status.initialized; const result = ensureWorkspace(status.repoRoot); console.log(existed ? `Nerv is already initialized in ${status.repoRoot}.` : `Initialized Nerv in ${status.repoRoot}.`); console.log(`Repository setup: ${result.setup.every((entry) => entry.established) ? "established at HEAD" : `not established (${result.setup.filter((entry) => !entry.established).map((entry) => entry.path).join(", ")})`}.`); for (const message of result.messages) console.log(message); }));
program.command("uninstall").description("Remove repository-level Nerv setup without uninstalling the global package.").addHelpText("after", UNINSTALL_HELP).action(() => action(() => { const status = getWorkspaceStatus(process.cwd()); if (!status.repoRoot) throw new Error("nerv uninstall must be run inside a Git repository."); const result = uninstallWorkspace(status.repoRoot); if (result.alreadyAbsent) { console.log("Nerv repository setup is already absent."); return; } console.log(`Removed repository-level Nerv setup: ${result.removed.length ? result.removed.join(", ") : "none"}.`); if (result.preserved.length) console.log(`Preserved developer-owned or modified content: ${result.preserved.join(", ")}.`); console.log("No Git changes were staged or committed."); }));
const workCommand = program.command("work").description("Deterministic Work Item persistence primitives.");
  workCommand.command("materialize").requiredOption("--plan <json>").addHelpText("after", MATERIALIZE_PLAN_HELP).action((options: { plan: string }) => action(() => { const status = workspace(); const plan = approvedPlan(options.plan); const repo = openRepository(status.databasePath); let item: WorkItem; try { if (!repo.listWork().some((entry) => entry.status !== "closed")) assertCanonicalSetupEstablished(status.repoRoot); item = repo.materializePlan({ ...plan, git_baseline_json: JSON.stringify(captureBaseline(status.repoRoot)) }); } finally { repo.close(); } console.log(`Materialized ${item!.ref}: ${item!.title}\nStable ID: ${item!.id}\nContext: ${sync(status, item!)}`); console.log(handoff(status, item!)); }));
  workCommand.command("materialize-rework").argument("<workRef>").action((reference: string) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); let item: WorkItem; try { item = repo.materializeRework(work(repo, reference).id); } finally { repo.close(); } sync(status, item!); console.log(`Materialized persisted remediation Tasks in ${item!.ref}.\n${handoff(status, item!)}`); }));
   workCommand.command("status").argument("<workRef>").action((reference: string) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); try { const item = work(repo, reference); const tasks = repo.listTasks(item.id); const review = repo.latestReview(item.id); const findings = item.status === "rework" ? reviewFindingsPreview(review) : ""; const proposal = item.status === "rework" ? remediationPreview(review) : ""; const next = developerHandoff(item, tasks, review); console.log(`${item.ref}: ${item.title}\nStable ID: ${item.id}\nState: ${item.status}\nTasks: ${tasks.filter((entry) => entry.status === "done").length}/${tasks.length} done\nLatest review: ${review?.outcome ?? "none"}${findings ? `\n\nREWORK findings:\n${findings}` : ""}${proposal ? `\n\nRemediation proposal:\n${proposal}` : ""}\n${next ? `Recommended next action: ${next}` : item.status === "closed" ? "Terminal: no further Nerv lifecycle operation is required." : `Execution: ${executionStatus(tasks)}`}`); } finally { repo.close(); } }));
   workCommand.command("show").argument("<workRef>").action((reference: string) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); try { const item = work(repo, reference); const tasks = repo.listTasks(item.id); const review = repo.latestReview(item.id); const checkpoint = repo.latestCheckpoint(item.id); const checkpointTask = checkpoint?.task_id ? repo.getTask(checkpoint.task_id) : null; console.log(`${item.ref}: ${item.title}\nStable ID: ${item.id}\nState: ${item.status}\nIntent: ${item.intent}\nGoal: ${item.goal}\nScope: ${item.scope}\nExpected touchpoints: ${item.expected_touchpoints}\nOut of scope: ${item.out_of_scope}\nAcceptance criteria: ${item.acceptance_criteria}\nFull validation: ${item.validation}\n\n${tasks.map((entry) => `Task ${entry.position}: ${entry.title} [${entry.status}]\nObjective: ${entry.objective}\nImplementation approach: ${entry.implementation_approach}\nExpected touchpoints: ${entry.expected_touchpoints}\nAcceptance criteria: ${entry.acceptance_criteria}\nTargeted validation: ${entry.validation}\nCompletion validation evidence: ${entry.validation_evidence ?? "none"}\nAttribution: ${entry.attribution_json ?? "none"}`).join("\n\n")}\n\nLatest review:\n${review ? `ID: ${review.id}\nOutcome: ${review.outcome}\nSummary: ${review.summary}\n${reviewFindingsPreview(review) || "Findings: none"}\nPersisted remediation proposal: ${review.remediation_json ?? "none"}\nValidation evidence: ${review.validation_evidence}\nGit fingerprint: ${review.git_fingerprint_json ?? "none"}\nVerification evidence: ${review.verification_evidence ?? "none"}\nCreated at: ${review.created_at}` : "none"}\nLatest checkpoint:\n${checkpoint ? `ID: ${checkpoint.id}\nTask: ${checkpointTask ? `Task ${checkpointTask.position}: ${checkpointTask.title}` : "none"}\nSummary: ${checkpoint.summary}\nNext step: ${checkpoint.next_step ?? "none"}\nCreated at: ${checkpoint.created_at}` : "none"}`); } finally { repo.close(); } }));
const task = workCommand.command("task").description("Task operations scoped to a Work Item.");
  task.command("done").argument("<workRef>").argument("<position>").requiredOption("--evidence <evidence>").option("--files <paths...>").action((reference: string, position: string, options: { evidence: string; files?: string[] }) => action(() => { const evidence = requiredEvidence(options.evidence, "Task completion evidence"); const status = workspace(); const repo = openRepository(status.databasePath); let item: WorkItem; let entry: Task; try { item = work(repo, reference); entry = taskAt(repo, item, position); const baseline = JSON.parse(item.git_baseline_json ?? "null") as GitBaseline | null; if (!baseline) throw new Error("Task completion requires an activation Git baseline."); assertExpectedHead(status.repoRoot, baseline.head); const paths = [...new Set((options.files ?? []).map((path) => canonicalPath(status.repoRoot, path)))].sort(); if (paths.some((path) => baseline.protected_paths.some((protectedPath) => path === protectedPath || path.startsWith(`${protectedPath}/`) || protectedPath.startsWith(`${path}/`)))) throw new Error("Baseline-dirty paths cannot be attributed to a Task."); entry = repo.completeTask(entry.id, evidence, JSON.stringify({ paths })); item = work(repo, item.id); } finally { repo.close(); } sync(status, item!); console.log(`Completed Task ${entry!.position} in ${item!.ref}.\n${handoff(status, item!)}`); }));
program.command("review").argument("<workRef>").requiredOption("--outcome <PASS|REWORK>").requiredOption("--summary <summary>").requiredOption("--validation-evidence <evidence>").option("--verification-evidence <evidence>").option("--findings <json>").option("--remediation-title <title>").option("--remediation-objective <objective>").option("--remediation-approach <approach>").option("--remediation-touchpoints <touchpoints>").option("--remediation-acceptance-criteria <criteria>").option("--remediation-validation <validation>").addHelpText("after", REVIEW_FINDINGS_HELP).action((reference: string, options: { outcome: string; summary: string; validationEvidence: string; verificationEvidence?: string; findings?: string } & RemediationOptions) => action(() => reviewWork(reference, options)));
  program.command("checkpoint").argument("<workRef>").requiredOption("--summary <summary>").option("--task <position>").option("--next-step <step>").action((reference: string, options: { summary: string; task?: string; nextStep?: string }) => action(() => { const summary = requiredEvidence(options.summary, "Checkpoint summary"); const status = workspace(); const repo = openRepository(status.databasePath); let item: WorkItem; try { item = work(repo, reference); const entry = options.task ? taskAt(repo, item, options.task) : null; repo.createCheckpoint({ work_item_id: item.id, task_id: entry?.id ?? null, summary, next_step: options.nextStep ?? null }); } finally { repo.close(); } sync(status, item!); console.log(`Checkpoint saved for ${item!.ref}.\n${handoff(status, item!)}`); }));
   program.command("close").argument("<workRef>").option("--message <subject>").action((reference: string, options: { message?: string }) => action(() => { const status = workspace(); const repo = openRepository(status.databasePath); let subject: string; try { subject = commitSubject(options.message === undefined ? work(repo, reference).title : options.message); } finally { repo.close(); } closeWork(reference, subject); console.log("Closed Work is terminal. No further Nerv lifecycle operation is required."); }));
program.command("status").action(() => action(() => { const status = getWorkspaceStatus(process.cwd()); console.log(`Nerv status: ${status.initialized ? "initialized" : "not initialized"}`); if (status.initialized && status.repoRoot) { const context = discoverContext(status.repoRoot); console.log(`Product Context: ${context.product}\nRepo Context: ${context.repo}`); } }));
function reviewWork(reference: string, options: { outcome: string; summary: string; validationEvidence: string; verificationEvidence?: string; findings?: string } & RemediationOptions) {
  const summary = requiredEvidence(options.summary, "Review summary");
  const validationEvidence = requiredEvidence(options.validationEvidence, "Review validation evidence");
  const status = workspace();
  const repo = openRepository(status.databasePath);
  let item: WorkItem;
  try {
    item = work(repo, reference);
    const outcome = options.outcome.toUpperCase() as "PASS" | "REWORK";
    if (outcome !== "PASS" && outcome !== "REWORK") throw new Error("Review outcome must be PASS or REWORK.");
    if (item.status !== "active" && item.status !== "review") throw new Error("Work Review requires an active Work Item with all Tasks done.");
    if (item.status === "review" && !(outcome === "REWORK" && options.verificationEvidence?.trim())) throw new Error("Only REWORK with verification evidence may replace a PASS review.");
    const findings = reviewFindings(options.findings);
    const blockers = findings.filter(blocksPass);
    if (outcome === "PASS" && blockers.length) throw new Error("PASS is not permitted while critical, high, or unaccepted medium findings remain.");
    const proposal = outcome === "REWORK" ? remediation(options) : null;
    if (outcome === "REWORK" && !blockers.length) throw new Error("REWORK requires blocking findings and an execution-ready remediation Task.");
    const baseline = JSON.parse(item.git_baseline_json ?? "null") as GitBaseline | null;
    if (!baseline) throw new Error("Work Review requires an activation Git baseline.");
    const needsFingerprint = outcome === "PASS" || item.status === "review";
    if (needsFingerprint) {
      assertCleanIndex(status.repoRoot);
      assertExpectedHead(status.repoRoot, baseline.head);
      assertProtectedBaseline(status.repoRoot, baseline);
    }
    const current = needsFingerprint ? workFingerprint(status.repoRoot, baseline, ownedPaths(repo.listTasks(item.id))) : null;
    if (item.status === "review") {
      const previous = repo.latestReview(item.id);
      if (!previous?.git_fingerprint_json || JSON.stringify(current) !== previous.git_fingerprint_json) throw new Error("Git state changed after PASS; Work cannot be downgraded as reviewed.");
    }
    const fingerprint = outcome === "PASS" ? current : null;
    const createdReview = repo.createReview({ work_item_id: item.id, outcome, summary, findings: findings.length ? JSON.stringify(findings) : null, remediation_json: proposal ? JSON.stringify(proposal) : null, validation_evidence: validationEvidence, git_fingerprint_json: fingerprint ? JSON.stringify(fingerprint) : null, verification_evidence: options.verificationEvidence?.trim() ?? null });
    item = work(repo, item.id);
    const residual = findings.filter((finding) => !blocksPass(finding));
    console.log(`${outcome} recorded for ${item.ref}.${residual.length ? `\n${formatFindings(residual, "Residual findings")}\nResidual findings do not block Close.` : ""}${proposal ? `\n${formatFindings(findings, "Blocking findings")}\n\nRemediation proposal:\n${remediationPreview(createdReview)}` : ""}`);
  } finally {
    repo.close();
  }
  sync(status, item!);
  console.log(`${handoff(status, item!)}${item!.status === "review" ? "\nOptional additional local or user inspection may happen first; required outcome verification was part of Review." : ""}`);
}
function closeWork(reference: string, message: string) { const status = workspace(); const repo = openRepository(status.databasePath); try { const item = work(repo, reference); const review = repo.latestReview(item.id); if (item.status !== "review" || review?.outcome !== "PASS" || !review.git_fingerprint_json || !item.validation_evidence) throw new Error(`Work Item ${item.ref} is not ready to close.`); let baseline: GitBaseline; let fingerprint: GitFingerprint; try { baseline = JSON.parse(item.git_baseline_json ?? ""); fingerprint = JSON.parse(review.git_fingerprint_json); } catch { throw new Error("Close requires valid persisted Git review evidence."); } if (!baseline || !fingerprint || !Array.isArray(fingerprint.paths) || typeof fingerprint.tree !== "string" || typeof fingerprint.head !== "string" || repo.listTasks(item.id).some((entry) => entry.status !== "done")) throw new Error("Close requires valid persisted Git review evidence."); assertCleanIndex(status.repoRoot); assertExpectedHead(status.repoRoot, baseline.head); assertProtectedBaseline(status.repoRoot, baseline); if (JSON.stringify(workFingerprint(status.repoRoot, baseline, ownedPaths(repo.listTasks(item.id))) ) !== JSON.stringify(fingerprint)) throw new Error("Git state changed after PASS; Work cannot close as reviewed."); if (fingerprint.tree === headTree(status.repoRoot, baseline.head)) { repo.closeWork(item.id, null); removeActiveContext(status.workspaceRoot, item.ref); console.log(`Closed ${item.ref}: no tracked Git diff.`); return; } const pending = createExactCommit(status.repoRoot, fingerprint.tree, baseline.head, `${message}\n\nNerv-Work: ${item.id}\nNerv-Work-Ref: ${item.ref}`); try { publishCommit(status.repoRoot, pending, baseline.head); } catch { throw new Error("Git publication failed before Nerv persistence; no Git or index cleanup was attempted."); } try { repo.closeWork(item.id, pending.commit); } catch (error) { try { if (currentRef(status.repoRoot, pending.ref) === pending.commit) rollbackPublishedCommit(status.repoRoot, pending, baseline.head); else throw new Error("publication authority lost"); } catch { throw new Error(`Git/Nerv consistency failure after publication: ${baseline.head} -> ${currentRef(status.repoRoot, pending.ref)}. ${error instanceof Error ? error.message : String(error)}`); } throw error; } refreshIndex(status.repoRoot); removeActiveContext(status.workspaceRoot, item.ref); console.log(`Closed ${item.ref}: ${pending.commit}`); } finally { repo.close(); } }
await program.parseAsync();
