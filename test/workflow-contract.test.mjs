import test from "node:test";
import { assert, join, readFileSync } from "./helpers.mjs";

const skill = readFileSync(join(process.cwd(), ".agents/skills/nerv/SKILL.md"), "utf8");

test("public workflow contract governs context enrichment, outcome review, tool composition, and presentation", () => {
  for (const expected of [
    "missing, scaffold, and established canonical context",
    "derive Repo Context only from authoritative repository evidence",
    "derive Product Context only from explicit developer statements, authoritative product documentation, or confirmed behavior",
    "passing builds, tests, and checks are evidence, not proof by themselves",
    "Infer safe defaults when confidence is genuinely high; ask only when the answer would materially change the result.",
    "Select concerns relevant to the Work rather than applying a universal checklist",
    "They cannot bypass approval, redefine approved scope, advance the lifecycle, substitute Work Review, or Close Work.",
    "local preview URL, artifact path, reproducible command, or focused verification instruction",
    "## Response Presentation",
    "consistent semantic Markdown hierarchy for every developer-facing Nerv response",
    "without relying on host-specific colors, themes, or rendering behavior",
  ]) assert(skill.includes(expected), `public workflow contract omitted: ${expected}`);
});

test("planning and multilingual interaction preserve agent intelligence and canonical protocol", () => {
  const spanishGreenfieldRequest = "Quiero crear una aplicación para organizar recetas familiares.";
  assert(!/Nerv|Work|Task|Review|lifecycle|nerv\s/.test(spanishGreenfieldRequest), "Spanish greenfield fixture is not a natural unguided request");
  for (const expected of [
    "Nerv governs boundaries, not agent intelligence.",
    "Natural user requests need not name Nerv, Work, Tasks, Review, lifecycle commands, or repository instructions before this contract applies.",
    "native reasoning, planning, clarification, exploration, tool use, and implementation capabilities",
    "Before approval, resolve through native clarification, explicitly declare as a proposed decision/default, or safely infer any material implementation choice",
    "Infer safe defaults when confidence is genuinely high; ask only when the answer would materially change the result.",
    "Do not impose a fixed questionnaire or suppress ordinary agent exploration and planning.",
    "Include material implementation decisions and proposed defaults when they make the Plan execution-ready.",
    "Recommended next operation: nerv approve",
    "Follow the user's language for human-facing Plans, clarification questions, findings, explanations, Review summaries, remediation proposals, and handoffs when practical; English and Spanish are supported initially.",
    "`nerv approve`, `nerv review WORK-###`, `nerv close WORK-###`, `WORK-###`, `Task`, `PASS`, and `REWORK`",
    "Recommended next operation: nerv review WORK-###",
    "After Close, no further lifecycle operation is required.",
  ]) assert(skill.includes(expected), `planning or multilingual contract omitted: ${expected}`);
});
