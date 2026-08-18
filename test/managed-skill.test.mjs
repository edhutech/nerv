import test from "node:test";
import { assert, join, readFileSync, rmSync, root, run, setup, writeFileSync } from "./helpers.mjs";
import { knownIdentity, normalizedText, textIdentity } from "../dist/managed-artifacts.js";

test("init installs, recognizes, and preserves the managed public skill", () => {
  const repo = setup(false);
  const skill = join(repo, ".agents/skills/nerv/SKILL.md");
  try {
    rmSync(skill);
    run(repo, ["init"]);
    const packaged = readFileSync(join(process.cwd(), ".agents/skills/nerv/SKILL.md"), "utf8");
    assert(readFileSync(skill, "utf8") === packaged, "installed skill differs from packaged content");
    run(repo, ["init"]);
    assert(readFileSync(skill, "utf8") === packaged, "init changed identical skill content");
    writeFileSync(skill, `${packaged}\nLocal modification.\n`);
    assert(run(repo, ["init"]).includes("Public Nerv skill preserved") && readFileSync(skill, "utf8").includes("Local modification."), "init overwrote a modified skill");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("init upgrades the supported v0.2.0 skill, recognizes CRLF, and preserves edits", () => {
  const repo = setup(false);
  const skill = join(repo, ".agents/skills/nerv/SKILL.md");
  try {
    const fixture = readFileSync(join(root, "test/fixtures/v0.2.0/SKILL.md"), "utf8");
    const historicalLf = normalizedText(fixture);
    const historicalCrlf = historicalLf.replaceAll("\n", "\r\n");
    assert(textIdentity(historicalLf) === "cdd6d96370ce7e6af5af627249c694478ac0115d816e5909079a790d7fc126bd", "historical fixture identity changed");
    assert(knownIdentity(".agents/skills/nerv/SKILL.md", historicalLf) === "legacy", "historical fixture is not registered as legacy");
    assert(knownIdentity(".agents/skills/nerv/SKILL.md", historicalCrlf) === "legacy", "CRLF historical fixture is not registered as legacy");
    writeFileSync(skill, historicalLf);
    assert(run(repo, ["init"]).includes("upgraded from a supported Nerv-managed version"), "init did not report the historical skill upgrade");
    const current = readFileSync(join(process.cwd(), ".agents/skills/nerv/SKILL.md"), "utf8");
    assert(readFileSync(skill, "utf8") === current, "historical skill was not upgraded");

    writeFileSync(skill, historicalCrlf);
    assert(run(repo, ["init"]).includes("upgraded from a supported Nerv-managed version"), "CRLF historical skill was not recognized");
    writeFileSync(skill, `${historicalCrlf}\r\nDeveloper change.\r\n`);
    const output = run(repo, ["init"]);
    assert(output.includes("ownership is not established") && readFileSync(skill, "utf8").includes("Developer change."), "modified historical skill was overwritten");

    writeFileSync(skill, "Custom skill\r\n");
    assert(run(repo, ["init"]).includes("ownership is not established") && readFileSync(skill, "utf8") === "Custom skill\r\n", "unknown skill was not preserved");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("init installs idempotent discovery bridges and preserves custom instructions", () => {
  const repo = setup(false);
  const agents = join(repo, "AGENTS.md");
  const bridge = join(repo, "CLAUDE.md");
  try {
    rmSync(agents);
    rmSync(bridge);
    run(repo, ["init"]);
    const installedAgents = readFileSync(agents, "utf8");
    const installedClaude = readFileSync(bridge, "utf8");
    assert(installedAgents.includes("<!-- Nerv managed discovery bridge -->") && installedAgents.includes(".agents/skills/nerv/SKILL.md") && installedClaude.includes("<!-- Nerv managed discovery bridge -->") && installedClaude.includes(".agents/skills/nerv/SKILL.md"), "init did not install delimited discovery bridges");
    run(repo, ["init"]);
    assert(readFileSync(agents, "utf8") === installedAgents && readFileSync(bridge, "utf8") === installedClaude, "init changed an existing discovery bridge");
    writeFileSync(agents, "# Local agent instructions\r\n");
    writeFileSync(bridge, "# Local Claude instructions\r\n");
    run(repo, ["init"]);
    assert(readFileSync(agents, "utf8").startsWith("# Local agent instructions\r\n") && readFileSync(agents, "utf8").includes("Nerv managed discovery bridge") && readFileSync(bridge, "utf8").startsWith("# Local Claude instructions\r\n") && readFileSync(bridge, "utf8").includes("Nerv managed discovery bridge"), "init overwrote custom discovery instructions");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("init establishes bridges alongside custom instructions and preserves ambiguous bridge blocks", () => {
  const repo = setup(false);
  const agents = join(repo, "AGENTS.md");
  const claude = join(repo, "CLAUDE.md");
  try {
    writeFileSync(agents, "Custom agents\r\n");
    writeFileSync(claude, "Custom Claude\r\n");
    const output = run(repo, ["init"]);
    assert(output.includes("alongside preserved custom content") && readFileSync(agents, "utf8").startsWith("Custom agents\r\n") && readFileSync(claude, "utf8").startsWith("Custom Claude\r\n"), "custom discovery content was not preserved");
    const stableAgents = readFileSync(agents, "utf8");
    run(repo, ["init"]);
    assert(readFileSync(agents, "utf8") === stableAgents, "repeated init duplicated a managed bridge");
    writeFileSync(agents, stableAgents.replace(".agents/skills/nerv/SKILL.md", ".agents/skills/other/SKILL.md"));
    assert(run(repo, ["init"]).includes("ambiguous Nerv bridge was preserved") && readFileSync(agents, "utf8").includes("other/SKILL.md"), "modified bridge was overwritten");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
