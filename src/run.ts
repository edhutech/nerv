import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { openRepository, type TaskRecord, type BuildRecord, type RunRecord } from "./repository.js";

export type StartRunResult = {
  run: RunRecord;
  task: TaskRecord;
  build: BuildRecord | null;
  runMarkdownPath: string;
  taskMarkdownPath: string;
};

export function startRun(
  databasePath: string,
  workspaceRoot: string,
  query: string,
): StartRunResult {
  const repository = openRepository(databasePath);

  try {
    const task = repository.selectTaskForRun(query);

    const build = task.build_id ? repository.getBuild(task.build_id) : null;

    const runId = repository.getNextId("RUN");
    const run = repository.createRun({ id: runId, task_id: task.id });

    repository.setCurrentRunId(runId);

    const runDir = join(workspaceRoot, "agent", "runs", runId);
    const runMarkdownPath = generateRunMarkdown(runDir, run, task, build);
    const taskMarkdownPath = generateTaskMarkdown(runDir, task, build);

    return {
      run,
      task,
      build,
      runMarkdownPath,
      taskMarkdownPath,
    };
  } finally {
    repository.close();
  }
}

function generateRunMarkdown(
  runDir: string,
  run: RunRecord,
  task: TaskRecord,
  build: BuildRecord | null,
): string {
  const markdownPath = join(runDir, "run.md");

  if (!existsSync(runDir)) {
    mkdirSync(runDir, { recursive: true });
  }

  const taskTitle = task.title || "Task";
  const buildId = task.build_id || "None";
  const acceptanceCriteria = task.acceptance_criteria || "- Task is implemented.\n- Existing functionality is not broken.";
  const validation = task.validation || "- pnpm build\n- pnpm typecheck\n- pnpm smoke";

  const content = `# ${run.id}

## Active Task

${task.id}: ${taskTitle}

## Parent Build

${buildId}

## Primary context

Read first:

- \`./task.md\`

## Supporting context

Read only if needed:

- \`../../tasks/${task.id}.md\`
${build ? `- \`../../builds/${build.id}.md\`` : ""}
- \`../../../product/product.md\`
- \`../../../product/architecture.md\`
- \`../../../product/decisions.md\`

## Scope rule

The Agentic Task is the execution scope. The Agentic Build provides shared context, but it does not expand the scope of this Run.

If the Build and Task conflict, follow the Task.

## What to do now

Implement the task described in the primary context file.

## Acceptance criteria

${acceptanceCriteria}

## Validation

Run or verify:

${validation}

## Checkpoint instructions

Before checkpointing:

- Summarize what changed
- List files touched
- Note any decisions made
- Run validation commands
- Save checkpoint summary

## Review instructions

Before requesting review:

- Verify all acceptance criteria are met
- Ensure validation commands pass
- Confirm no unrelated changes were made
- Provide evidence of completion

## Close instructions

After review passes:

- Commit changes with a descriptive message
- Update task status to closed
- Update build progress if applicable
- Record commit hash in task close summary

## Git awareness

- Commit after review and before close
- Use descriptive commit messages
- Link commit hash in close summary

## Completion checklist

Before finishing this Run, provide:

- What changed
- Files touched
- Decisions made
- Validation performed
- Pending work
- Suggested next step
- Suggested commit message
`;

  writeFileSync(markdownPath, content, "utf8");

  return markdownPath;
}

function generateTaskMarkdown(
  runDir: string,
  task: TaskRecord,
  build: BuildRecord | null,
): string {
  const markdownPath = join(runDir, "task.md");

  const taskTitle = task.title || "Task";
  const buildId = task.build_id || "None";
  const intent = task.intent || taskTitle;
  const scope = task.scope || `Implement ${taskTitle.toLowerCase()}.`;
  const outOfScope = task.out_of_scope || "Related but separate concerns.";
  const acceptanceCriteria = task.acceptance_criteria || "- Task is implemented.\n- Existing functionality is not broken.";
  const validation = task.validation || "- pnpm build\n- pnpm typecheck\n- pnpm smoke";
  const risks = task.risks || "- Scope may expand beyond initial intent.\n- Edge cases may not be covered.";

  const content = `# ${task.id}: ${taskTitle}

## Parent Build

${buildId}

## Task Goal

${intent}

## Scope

${scope}

## Out of scope

${outOfScope}

## Acceptance criteria

${acceptanceCriteria}

## Validation

${validation}

## Risks

${risks}
`;

  writeFileSync(markdownPath, content, "utf8");

  return markdownPath;
}
