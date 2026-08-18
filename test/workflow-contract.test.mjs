import test from "node:test";
import { assert, join, readFileSync } from "./helpers.mjs";

const skill = readFileSync(join(process.cwd(), ".agents/skills/nerv/SKILL.md"), "utf8");

test("public workflow contract governs context enrichment, outcome review, tool composition, and presentation", () => {
  for (const expected of [
    "missing, scaffold, and established canonical context",
    "derive Repo Context only from authoritative repository evidence",
    "derive Product Context only from explicit developer statements, authoritative product documentation, or confirmed behavior",
    "Keep Product Context authority-backed",
    "an implementation decision is not a product fact",
    "speculative copy, unsupported assumptions, temporary mock content, or other implementation inventions must not be persisted as durable product truth",
    "passing builds, tests, and checks are evidence, not proof by themselves",
    "Validation intent must be coherent with the acceptance criteria",
    "Distinguish technical validation from outcome verification.",
    "Reconcile every material Work-level acceptance criterion with evidence proportional to that criterion",
    "Static source inspection and an HTTP response may inform review but do not prove runtime behavior or visual correctness.",
    "Review also protects product authority",
    "a material product fact that conflicts with, exceeds, or is not grounded in available developer or Product Context authority is a focused blocking finding",
    "Do not treat Plan approval alone as authority for such a fact.",
    "If material evidence is failed, contradictory, or absent when verification is reasonably possible",
    "record a focused blocking finding and route corrective work through REWORK",
    "Infer safe defaults when confidence is genuinely high; ask only when the answer would materially change the result.",
    "Distinguish implementation decisions from product facts.",
    "a declared technical default such as React + Vite is an implementation decision, not product authority.",
    "Claims about the real product, business, customers, or organization require sufficient authority",
    "When product information is missing, use native judgment to choose an appropriate path",
    "clearly label temporary placeholder or demo content",
    "Approval of a Plan records approved work boundaries; it does not make an unsupported product assumption authoritative.",
    "Select concerns relevant to the Work rather than applying a universal checklist",
    "They cannot bypass approval, redefine approved scope, advance the lifecycle, substitute Work Review, or Close Work.",
    "Fabricated testimonials, customers, metrics, certifications, awards, contacts, or similar social proof must never be presented as real",
    "keep it out of canonical Product Context",
    "local preview URL, artifact path, reproducible command, or focused verification instruction",
    "observed local preview URL",
    "report the URL actually observed for the current execution rather than assuming a conventional address",
    "When the approved acceptance criteria require the developer to view or try the result",
    "prefer a concrete handoff in the execution response when reasonably available",
    "must not defer evidence required to justify PASS",
    "## Response Presentation",
    "consistent semantic Markdown hierarchy for every developer-facing Nerv response",
    "without relying on host-specific colors, themes, or rendering behavior",
  ]) assert(skill.includes(expected), `public workflow contract omitted: ${expected}`);
});

test("planning and multilingual interaction preserve agent intelligence and canonical protocol", () => {
  const spanishGreenfieldRequest = "Quiero crear una aplicación para organizar recetas familiares.";
  assert(!/Nerv|Work|Task|Review|lifecycle|nerv\s/.test(spanishGreenfieldRequest), "Spanish greenfield fixture is not a natural unguided request");
  const spanishLandingPagePlan = "Para este landing page greenfield, propongo React + Vite como default técnico; los hechos del producto requieren autoridad.";
  assert(spanishLandingPagePlan.includes("React + Vite") && spanishLandingPagePlan.includes("default técnico") && spanishLandingPagePlan.includes("hechos del producto requieren autoridad"), "Spanish greenfield fixture did not preserve the implementation-authority distinction");
  for (const expected of [
    "Nerv governs boundaries, not agent intelligence.",
    "Natural user requests need not name Nerv, Work, Tasks, Review, lifecycle commands, or repository instructions before this contract applies.",
    "native reasoning, planning, clarification, exploration, tool use, and implementation capabilities",
    "Before approval, resolve through native clarification, explicitly declare as a proposed decision/default, or safely infer any material implementation choice",
    "Infer safe defaults when confidence is genuinely high; ask only when the answer would materially change the result.",
    "Do not impose a fixed questionnaire or suppress ordinary agent exploration and planning.",
    "Include material implementation decisions and proposed defaults when they make the Plan execution-ready.",
    "recommended next action: `approve`",
    "Follow the user's language for human-facing Plans, clarification questions, findings, explanations, Review summaries, remediation proposals, and handoffs when practical; English and Spanish are supported initially.",
    "`nerv approve`, `nerv review WORK-###`, `nerv close WORK-###`, `WORK-###`, `Task`, `PASS`, and `REWORK`",
    "`review` after execution and full validation",
    "After Close, no further lifecycle operation is required.",
    "For structured Nerv CLI inputs, inspect the relevant command's `--help` output for the exact public contract instead of inspecting implementation source.",
    "When a Work is in REWORK, present its persisted remediation proposal before requesting approval",
    "persisted remediation proposal's objective, approach, expected touchpoints, acceptance criteria, and validation",
    "Do not recommend `nerv approve` before this compact preview has been presented.",
    "The original Work Plan need not be repeated.",
  ]) assert(skill.includes(expected), `planning or multilingual contract omitted: ${expected}`);
});

test("lifecycle shorthand is an unambiguous agent intent over canonical protocol", () => {
  const source = readFileSync(join(process.cwd(), "src/index.ts"), "utf8");
  for (const expected of [
    "These are conversational agent intents, not shell commands.",
    "current workspace identifies exactly one applicable Work and valid transition",
    "`approve` means approval of the presented Plan or persisted REWORK remediation",
    "`review` means Review of the current Work after all Tasks are done",
    "`close` means Close of the current Work after PASS",
    "If no applicable Work or transition exists, explain that instead of guessing.",
    "Equivalent natural-language intent in the developer's language",
    "Explicit `nerv ...` forms remain valid",
    "nerv approve",
    "nerv review WORK-###",
    "nerv close WORK-###",
  ]) assert(skill.includes(expected), `lifecycle shorthand contract omitted: ${expected}`);
  assert(!source.includes('program.command("approve")'), "conversation-only approve became a CLI command");
  assert(source.includes('program.command("review").argument("<workRef>")') && source.includes('program.command("close").argument("<workRef>")'), "canonical explicit review/close commands were removed");
});

test("lifecycle intent is semantic and execution topology remains native", () => {
  for (const expected of [
    "semantic conversational intent, not keyword matching",
    "the developer's full message clearly expresses the lifecycle action",
    "not negative, hypothetical, conditional, explanatory, or deferred",
    "Words such as `approve`, `review`, or `close` appearing in a message are never sufficient by themselves",
    "Before approve, explain the migration",
    "Do not approve yet",
    "What happens after close?",
    "Do not close this yet",
    "For the review, use two subagents first",
    "antes de cerrar quiero revisar otra cosa",
    "If intent, Work resolution, or state is ambiguous or invalid, explain that instead of guessing or forcing a transition.",
    "I approve this plan",
    "apruébalo",
    "The developer and host agent may choose their native execution strategy",
    "including one or more subagents",
    "A capability invocation, subagent, or delegation does not by itself create a Task or Work",
    "create a Task only for a real execution boundary inside the approved Work",
    "create another Work only for a materially separate outcome needing its own approval, evidence, Review, and Close",
    "Nerv remains agent-, model-, provider-, and host-agnostic.",
  ]) assert(skill.includes(expected), `semantic lifecycle or execution-freedom contract omitted: ${expected}`);
  const spanishPositive = "apruébalo";
  const spanishNegative = "todavía no lo apruebes";
  const spanishConditional = "antes de cerrar quiero revisar otra cosa";
  assert(skill.includes(spanishPositive) && skill.includes(spanishNegative) && skill.includes(spanishConditional), "Spanish lifecycle intent distinctions were not documented");
});

test("explicit temporary opt-out is scoped developer authority, not a runtime mode", () => {
  const englishTaskOptOut = "Do not use Nerv for this task.";
  const englishSessionOptOut = "Do not use Nerv for this session.";
  const spanishTaskOptOut = "No uses Nerv para esta tarea.";
  const spanishSessionOptOut = "No uses Nerv durante esta sesión.";
  for (const request of [englishTaskOptOut, englishSessionOptOut, spanishTaskOptOut, spanishSessionOptOut]) {
    assert(/Nerv/i.test(request), "opt-out fixture names the governed system");
  }
  for (const expected of [
    "After `nerv init`, automatic discovery makes Nerv the default",
    "Explicit developer intent has precedence over that automatic governance",
    "do not use Nerv for this task",
    "do not use Nerv for this session",
    "Equivalent natural-language intent in the developer's language, including English and Spanish",
    "do not require an exact phrase or host-specific `/`, `@`, or `$` invocation",
    "During an active opt-out scope, work natively",
    "do not automatically prepare a Nerv Plan, materialize a Work Item, execute Nerv lifecycle commands, create Tasks, or perform Nerv Review or Close",
    "do not remove or modify Nerv files or contexts, uninstall the skill, change lifecycle state, or introduce runtime session state",
    "A future session returns to the normal Nerv default",
    "use Nerv again",
    "An already-active Work Item is not canceled, abandoned, mutated, or silently bypassed",
    "Its durable lifecycle and active context remain authoritative",
  ]) assert(skill.includes(expected), `temporary opt-out contract omitted: ${expected}`);
});
