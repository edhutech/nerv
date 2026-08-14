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

test("init installs and preserves the minimal Claude Code bridge", () => {
  const repo = setup(false);
  const bridge = join(repo, "CLAUDE.md");
  try {
    rmSync(bridge);
    run(repo, ["init"]);
    const packaged = readFileSync(join(process.cwd(), "CLAUDE.md"), "utf8");
    assert(readFileSync(bridge, "utf8") === packaged && packaged.includes("@AGENTS.md") && packaged.includes(".agents/skills/nerv/SKILL.md"), "init did not install a canonical Claude bridge");
    writeFileSync(bridge, "# Local Claude instructions\n");
    run(repo, ["init"]);
    assert(readFileSync(bridge, "utf8") === "# Local Claude instructions\n", "init overwrote a modified Claude bridge");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
