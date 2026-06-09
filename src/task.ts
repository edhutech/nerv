import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { openRepository, type TaskRecord } from "./repository.js";

const LARGE_INTENT_KEYWORDS = [
  "system",
  "platform",
  "infrastructure",
  "migration",
  "authentication",
  "authorization",
  "database",
  "api",
  "backend",
  "frontend",
  "integration",
  "deployment",
  "pipeline",
  "workflow",
  "module",
  "feature",
  "rewrite",
  "redesign",
  "refactor",
];

const LARGE_INTENT_PHRASES = [
  "add support for",
  "implement support for",
  "build a system",
  "build a platform",
  "create a system",
  "create a platform",
];

export type CreateTaskResult = {
  task: TaskRecord;
  markdownPath: string;
  largeIntentDetected: boolean;
};

export type CreateTaskOptions = {
  force?: boolean;
};

export function createTaskFromIntent(
  databasePath: string,
  workspaceRoot: string,
  intent: string,
  options: CreateTaskOptions = {},
): CreateTaskResult {
  const largeIntentDetected = detectLargeIntent(intent);

  if (largeIntentDetected && !options.force) {
    throw new Error(
      `This intent appears to be large enough to warrant an Agentic Build.\n` +
        `Use \`nerv new build "${intent}"\` to create a Build first, then plan tasks.\n` +
        `If you want to create a task anyway, use --force.`,
    );
  }

  const repository = openRepository(databasePath);

  try {
    const taskId = repository.getNextId("TASK");
    const title = deriveTitle(intent);
    const markdownPath = generateTaskMarkdown(workspaceRoot, taskId, title, intent);

    const task = repository.createTask({
      id: taskId,
      title,
      intent,
      scope: `Implement ${title.toLowerCase()}.`,
      out_of_scope: "Related but separate concerns should be separate tasks.",
      acceptance_criteria: `- ${title} is implemented.\n- Existing functionality is not broken.`,
      validation: "- pnpm build\n- pnpm typecheck\n- pnpm smoke",
      risks: "- Scope may expand beyond initial intent.\n- Edge cases may not be covered.",
      generated_markdown_path: markdownPath,
    });

    return {
      task,
      markdownPath,
      largeIntentDetected,
    };
  } finally {
    repository.close();
  }
}

function detectLargeIntent(intent: string): boolean {
  const lowerIntent = intent.toLowerCase();

  for (const phrase of LARGE_INTENT_PHRASES) {
    if (lowerIntent.includes(phrase)) {
      return true;
    }
  }

  const words = lowerIntent.split(/\s+/);
  let matchCount = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, "");
    if (LARGE_INTENT_KEYWORDS.includes(cleanWord)) {
      matchCount++;
    }
  }

  if (matchCount >= 2) {
    return true;
  }

  if (intent.length > 100 && matchCount >= 1) {
    return true;
  }

  return false;
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
  return text[0].toUpperCase() + text.slice(1);
}

function generateTaskMarkdown(
  workspaceRoot: string,
  taskId: string,
  title: string,
  intent: string,
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
