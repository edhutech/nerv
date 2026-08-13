import { execFileSync } from "node:child_process";
import { cpSync } from "node:fs";
import test from "node:test";
import { assert, createHash, join, mkdirSync, mkdtempSync, readFileSync, rmSync, root, tmpdir } from "./helpers.mjs";

function valid(content) { const marker = content.match(/^nerv_managed_sha256: "([a-f0-9]{64})"$/m); return !content.includes("Task scopes") && marker && marker[1] === createHash("sha256").update(content.replace(marker[0], "nerv_managed_sha256: \"\"")).digest("hex"); }

test("public managed skill checksum remains valid", () => { assert(valid(readFileSync(join(root, ".agents/skills/nerv/SKILL.md"), "utf8")), "public skill is invalid"); });

test("managed skill has LF checkout content when autocrlf is enabled", () => {
  const temp = mkdtempSync(join(tmpdir(), "nerv-skill-eol-"));
  const source = join(temp, "source");
  const clone = join(temp, "clone");
  try {
    mkdirSync(join(source, ".agents/skills/nerv"), { recursive: true });
    cpSync(join(root, ".gitattributes"), join(source, ".gitattributes"));
    cpSync(join(root, ".agents/skills/nerv/SKILL.md"), join(source, ".agents/skills/nerv/SKILL.md"));
    execFileSync("git", ["init"], { cwd: source });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: source });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: source });
    execFileSync("git", ["add", "."], { cwd: source });
    execFileSync("git", ["commit", "-m", "skill"], { cwd: source });
    execFileSync("git", ["-c", "core.autocrlf=true", "clone", source, clone]);
    const checkedOut = readFileSync(join(clone, ".agents/skills/nerv/SKILL.md"), "utf8");
    assert(!checkedOut.includes("\r\n"), "managed skill checkout must use LF");
    assert(valid(checkedOut), "LF checkout must retain the managed checksum");
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test("managed skill checksum rejects unauthorized content changes", () => {
  const publicSkill = readFileSync(join(root, ".agents/skills/nerv/SKILL.md"), "utf8");
  assert(!valid(`${publicSkill}\nUnauthorized change.\n`), "modified managed skill must fail checksum validation");
});
