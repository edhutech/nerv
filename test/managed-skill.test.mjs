import test from "node:test";
import { assert, join, readFileSync, rmSync, root, run, setup, writeFileSync } from "./helpers.mjs";
import { knownIdentity, MANAGED_IDENTITIES, textIdentity } from "../dist/managed-artifacts.js";
import { CANONICAL_CONTEXT_SCAFFOLDS } from "../dist/workspace.js";

test("managed skill policy recognizes only the current identity", () => {
  const policy = MANAGED_IDENTITIES[".agents/skills/nerv/SKILL.md"];
  const packaged = readFileSync(join(root, ".agents/skills/nerv/SKILL.md"), "utf8");
    assert(policy === "9242354ad586ff422830c09181264d0956eff270f1a2c363c190a0194952014f", "packaged skill current identity changed unexpectedly");
  assert(knownIdentity(".agents/skills/nerv/SKILL.md", packaged) === "current", "packaged skill is not registered as current");
});

test("context scaffold ownership distinguishes current and project content", () => {
  const productPolicy = MANAGED_IDENTITIES[".nerv-context/product.md"];
  const repoPolicy = MANAGED_IDENTITIES[".nerv-context/repo.md"];
  assert(knownIdentity(".nerv-context/product.md", CANONICAL_CONTEXT_SCAFFOLDS.product) === "current", "canonical Product scaffold is not current");
  assert(knownIdentity(".nerv-context/repo.md", CANONICAL_CONTEXT_SCAFFOLDS.repo) === "current", "canonical Repo scaffold is not current");
  assert(knownIdentity(".nerv-context/product.md", `${CANONICAL_CONTEXT_SCAFFOLDS.product}Project truth\n`) === "unknown", "custom Product Context became managed");
  assert(knownIdentity(".nerv-context/repo.md", `${CANONICAL_CONTEXT_SCAFFOLDS.repo}Project rules\n`) === "unknown", "custom Repo Context became managed");
  assert(productPolicy === textIdentity(CANONICAL_CONTEXT_SCAFFOLDS.product), "Product current identity does not match its scaffold");
  assert(repoPolicy === textIdentity(CANONICAL_CONTEXT_SCAFFOLDS.repo), "Repo current identity does not match its scaffold");
});

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
