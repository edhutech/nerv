import test from "node:test";
import { assert, join, readFileSync } from "./helpers.mjs";

const skill = readFileSync(join(process.cwd(), ".agents/skills/nerv/SKILL.md"), "utf8");

test("public workflow contract governs context enrichment, outcome review, tool composition, and presentation", () => {
  for (const expected of [
    "missing, scaffold, and established canonical context",
    "derive Repo Context only from authoritative repository evidence",
    "derive Product Context only from explicit developer statements, authoritative product documentation, or confirmed behavior",
    "passing builds, tests, and checks are evidence, not proof by themselves",
    "ask only an unresolved high-impact question",
    "Select concerns relevant to the Work rather than applying a universal checklist",
    "They cannot bypass approval, redefine approved scope, advance the lifecycle, substitute Work Review, or Close Work.",
    "local preview URL, artifact path, reproducible command, or focused verification instruction",
    "## Response Presentation",
    "consistent semantic Markdown hierarchy for every developer-facing Nerv response",
    "without relying on host-specific colors, themes, or rendering behavior",
  ]) assert(skill.includes(expected), `public workflow contract omitted: ${expected}`);
});
