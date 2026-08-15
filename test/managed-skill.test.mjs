import test from "node:test";
import { assert, join, readFileSync, rmSync, run, setup, writeFileSync } from "./helpers.mjs";

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
    const packaged = readFileSync(join(process.cwd(), "CLAUDE.md"), "utf8");
    const installedAgents = readFileSync(agents, "utf8");
    assert(installedAgents === "# Agent Instructions\n\nFor Nerv-governed work, read `.agents/skills/nerv/SKILL.md` and follow it.\n" && readFileSync(bridge, "utf8") === packaged && packaged.includes("Follow `AGENTS.md` when it exists.") && packaged.includes(".agents/skills/nerv/SKILL.md"), "init did not install minimal self-contained discovery bridges");
    run(repo, ["init"]);
    assert(readFileSync(agents, "utf8") === installedAgents && readFileSync(bridge, "utf8") === packaged, "init changed an existing discovery bridge");
    writeFileSync(agents, "# Local agent instructions\r\n");
    writeFileSync(bridge, "# Local Claude instructions\r\n");
    run(repo, ["init"]);
    assert(readFileSync(agents, "utf8") === "# Local agent instructions\r\n" && readFileSync(bridge, "utf8") === "# Local Claude instructions\r\n", "init overwrote custom discovery instructions");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
