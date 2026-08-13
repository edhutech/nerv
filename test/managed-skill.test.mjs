import test from "node:test";
import { assert, createHash, join, readFileSync, root } from "./helpers.mjs";

test("public managed skill checksum remains valid", () => { const publicSkill = readFileSync(join(root, ".agents/skills/nerv/SKILL.md"), "utf8"); const marker = publicSkill.match(/^nerv_managed_sha256: "([a-f0-9]{64})"$/m); assert(!publicSkill.includes("Task scopes") && marker && marker[1] === createHash("sha256").update(publicSkill.replace(marker[0], "nerv_managed_sha256: \"\"")).digest("hex"), "public skill is invalid"); });
