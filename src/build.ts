import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { openRepository, type BuildAuditClassificationRecord, type BuildRecord, type BuildReviewRecord, type TaskRecord } from "./repository.js";

export type CreateBuildResult = {
  build: BuildRecord;
  markdownPath: string;
};

export function createBuildFromIntent(
  databasePath: string,
  workspaceRoot: string,
  intent: string,
): CreateBuildResult {
  const repository = openRepository(databasePath);

  try {
    const buildId = repository.getNextId("BUILD");
    const title = deriveTitle(intent);
    const markdownPath = generateBuildMarkdown(workspaceRoot, buildId, title, intent);

    const build = repository.createBuild({
      id: buildId,
      title,
      intent,
      goal: `Deliver ${title.toLowerCase()}.`,
      user_value: "Developers can plan and execute scoped work within this build.",
      scope: `Implement ${title.toLowerCase()}.`,
      out_of_scope: "Unrelated features should be separate builds.",
      acceptance_criteria: `- ${title} is delivered.\n- All planned tasks are completed.`,
      validation: "- pnpm build\n- pnpm typecheck\n- pnpm smoke",
      risks: "- Scope may expand beyond initial intent.\n- Tasks may need refinement during planning.",
      generated_markdown_path: markdownPath,
    });

    return {
      build,
      markdownPath,
    };
  } finally {
    repository.close();
  }
}

export type PlanBuildResult = {
  build: BuildRecord;
  tasks: TaskRecord[];
  skipped: boolean;
};

export function syncBuildMarkdown(workspaceRoot: string, build: BuildRecord, tasks: TaskRecord[], review?: BuildReviewRecord, audit?: BuildAuditClassificationRecord | null): string {
  const markdownPath = build.generated_markdown_path || join(workspaceRoot, "agent", "builds", `${build.id}.md`);
  if (!existsSync(markdownPath)) {
    throw new Error(`Build Markdown for ${build.id} was not found at ${markdownPath}.`);
  }
  const progress = `${tasks.filter((task) => task.status === "closed").length}/${tasks.length} task(s) closed`;
  const closeSummary = build.closed_at ? `Closed at ${build.closed_at}. ${progress}.` : "Pending.";
  let content = readFileSync(markdownPath, "utf8");
  content = replaceBuildSection(content, "Status", capitalizeFirst(build.status));
  content = replaceBuildSection(content, "Task Progress", progress, true);
  if (review) content = replaceBuildSection(content, "Review", `${capitalizeFirst(review.outcome)} on ${review.created_at}. ${review.summary}`);
  if (audit) content = replaceBuildSection(content, "Audit Classification", `${audit.audit_class}\n\n${audit.rationale}`);
  content = replaceBuildSection(content, "Close summary", closeSummary);
  writeFileSync(markdownPath, content, "utf8");
  return markdownPath;
}

export function syncTaskMarkdown(workspaceRoot: string, task: TaskRecord): string {
  const markdownPath = task.generated_markdown_path || join(workspaceRoot, "agent", "tasks", `${task.id}.md`);
  if (!existsSync(markdownPath)) {
    throw new Error(`Task Markdown for ${task.id} was not found at ${markdownPath}.`);
  }
  let content = readFileSync(markdownPath, "utf8");
  content = replaceBuildSection(content, "Status", capitalizeFirst(task.status));
  content = replaceBuildSection(content, "Parent Build", task.build_id ?? "None (standalone)");
  content = replaceBuildSection(content, "Close summary", task.closed_at ? `Closed at ${task.closed_at}.` : "Pending.");
  writeFileSync(markdownPath, content, "utf8");
  return markdownPath;
}

function replaceBuildSection(content: string, heading: string, value: string, append = false): string {
  const pattern = new RegExp(`## ${heading}\\n\\n[\\s\\S]*?(?=\\n## |$)`);
  const section = `## ${heading}\n\n${value}`;
  return pattern.test(content) ? content.replace(pattern, section) : append ? `${content.trimEnd()}\n\n${section}\n` : content;
}

export function planBuildTasks(
  databasePath: string,
  workspaceRoot: string,
  buildId: string,
): PlanBuildResult {
  const repository = openRepository(databasePath);

  try {
    const build = repository.getBuild(buildId);
    if (!build) {
      throw new Error(`Build ${buildId} not found.`);
    }

    const existingTasks = repository.listTasksByBuild(buildId);
    if (existingTasks.length > 0) {
      return {
        build,
        tasks: existingTasks,
        skipped: true,
      };
    }

    const plannedTasks = generatePlannedTasks(build);
    const createdTasks: TaskRecord[] = [];

    for (const plannedTask of plannedTasks) {
      const taskId = repository.getNextId("TASK");
      const markdownPath = generateTaskMarkdown(workspaceRoot, taskId, plannedTask.title, plannedTask.intent, buildId);

      const task = repository.createTask({
        id: taskId,
        build_id: buildId,
        title: plannedTask.title,
        intent: plannedTask.intent,
        scope: plannedTask.scope,
        out_of_scope: plannedTask.out_of_scope,
        acceptance_criteria: plannedTask.acceptance_criteria,
        validation: plannedTask.validation,
        risks: plannedTask.risks,
        generated_markdown_path: markdownPath,
      });

      createdTasks.push(task);
    }

    return {
      build,
      tasks: createdTasks,
      skipped: false,
    };
  } finally {
    repository.close();
  }
}

type PlannedTask = {
  title: string;
  intent: string;
  scope: string;
  out_of_scope: string;
  acceptance_criteria: string;
  validation: string;
  risks: string;
};

function generatePlannedTasks(build: BuildRecord): PlannedTask[] {
  const title = build.title || "this feature";
  const intent = build.intent || title;

  return [
    {
      title: `Implement core ${title.toLowerCase()}`,
      intent: `Implement the core functionality for ${intent}.`,
      scope: `Implement the main components and logic for ${title.toLowerCase()}.`,
      out_of_scope: "Edge cases and error handling refinements.",
      acceptance_criteria: `- Core ${title.toLowerCase()} is implemented.\n- Basic functionality works as expected.`,
      validation: "- pnpm build\n- pnpm typecheck\n- pnpm smoke",
      risks: "- Core logic may need refinement.\n- Integration points may not be fully tested.",
    },
    {
      title: `Add validation and error handling for ${title.toLowerCase()}`,
      intent: `Add validation, error handling, and edge case coverage for ${intent}.`,
      scope: `Add input validation, error handling, and test edge cases for ${title.toLowerCase()}.`,
      out_of_scope: "Major refactoring of core logic.",
      acceptance_criteria: `- Validation and error handling are in place.\n- Edge cases are covered.\n- Existing functionality is not broken.`,
      validation: "- pnpm build\n- pnpm typecheck\n- pnpm smoke",
      risks: "- Error handling may need iteration.\n- Edge cases may be incomplete.",
    },
    {
      title: `Document and integrate ${title.toLowerCase()}`,
      intent: `Document ${intent} and integrate with existing systems.`,
      scope: `Add documentation, update related code, and ensure ${title.toLowerCase()} integrates properly.`,
      out_of_scope: "Major changes to existing systems.",
      acceptance_criteria: `- Documentation is complete.\n- Integration is verified.\n- No regressions in existing functionality.`,
      validation: "- pnpm build\n- pnpm typecheck\n- pnpm smoke",
      risks: "- Documentation may need updates.\n- Integration may reveal issues.",
    },
  ];
}

function deriveTitle(intent: string): string {
  const trimmed = intent.trim();
  const maxLength = 60;

  if (trimmed.length <= maxLength) {
    return capitalizeFirst(trimmed);
  }

  const truncated = trimmed.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > 30) {
    return capitalizeFirst(truncated.slice(0, lastSpace));
  }

  return capitalizeFirst(truncated);
}

function capitalizeFirst(text: string): string {
  if (text.length === 0) {
    return text;
  }
  return text[0].toUpperCase() + text.slice(1).replaceAll("_", " ");
}

function generateBuildMarkdown(
  workspaceRoot: string,
  buildId: string,
  title: string,
  intent: string,
): string {
  const buildsDir = join(workspaceRoot, "agent", "builds");
  const markdownPath = join(buildsDir, `${buildId}.md`);

  if (existsSync(markdownPath)) {
    return markdownPath;
  }

  if (!existsSync(buildsDir)) {
    mkdirSync(buildsDir, { recursive: true });
  }

  const content = `# ${buildId}: ${title}

## Status

Proposed

## Build Goal

${intent}

## Scope

This build includes:

- Implement ${title.toLowerCase()}.
- Plan and execute scoped tasks.
- Ensure all tasks are completed and integrated.

## Out of scope

This build does not include:

- Unrelated features.
- Major refactoring of existing systems.

## Acceptance criteria

This build is complete when:

- ${title} is delivered.
- All planned tasks are completed.
- No regressions in existing functionality.

## Validation

Run or verify:

- pnpm build
- pnpm typecheck
- pnpm smoke

## Risks

- Scope may expand beyond initial intent.
- Tasks may need refinement during planning.
- Integration may reveal issues.

## Planned tasks

Tasks will be generated by \`nerv build plan ${buildId}\`.

## Checkpoint log

### Checkpoint 001

Pending.

## Review

Pending.

## Close summary

Pending.
`;

  writeFileSync(markdownPath, content, "utf8");

  return markdownPath;
}

function generateTaskMarkdown(
  workspaceRoot: string,
  taskId: string,
  title: string,
  intent: string,
  buildId: string,
): string {
  const tasksDir = join(workspaceRoot, "agent", "tasks");
  const markdownPath = join(tasksDir, `${taskId}.md`);

  if (existsSync(markdownPath)) {
    return markdownPath;
  }

  if (!existsSync(tasksDir)) {
    mkdirSync(tasksDir, { recursive: true });
  }

  const content = `# ${taskId}: ${title}

## Parent Build

${buildId}

## Status

Proposed

## Task Goal

${intent}

## Scope

This task includes:

- Implement ${title.toLowerCase()}.
- Add appropriate tests or validation.
- Update documentation if needed.

## Out of scope

This task does not include:

- Related but separate features.
- Major refactoring of unrelated code.
- Breaking changes to existing functionality.

## Acceptance criteria

This task is complete when:

- ${title} is implemented.
- Existing functionality is not broken.
- Code passes validation commands.

## Validation

Run or verify:

- pnpm build
- pnpm typecheck
- pnpm smoke

## Risks

- Scope may expand beyond initial intent.
- Edge cases may not be covered.
- Integration with existing code may require adjustments.

## Checkpoint log

### Checkpoint 001

Pending.

## Review

Pending.

## Close summary

Pending.
`;

  writeFileSync(markdownPath, content, "utf8");

  return markdownPath;
}
