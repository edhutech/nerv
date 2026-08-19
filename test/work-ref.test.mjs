import test from "node:test";
import { createHash } from "node:crypto";
import { assert, currentRef, materializedRef, rmSync, setup } from "./helpers.mjs";
import { workRef } from "../dist/repository.js";

test("Work refs are deterministic hash-derived aliases with 64 bits of entropy", () => {
  const id = "123e4567-e89b-42d3-a456-426614174000";
  const expected = `W-${createHash("sha256").update(id).digest("hex").slice(0, 16).toUpperCase()}`;
  const ref = workRef(id);
  assert(ref === expected && workRef(id) === ref, "Work ref is not deterministic SHA-256 output");
  assert(/^W-[0-9A-F]{16}$/.test(ref), "Work ref format does not preserve W- plus 16 uppercase hex characters");
  assert(ref !== workRef("123e4567-e89b-42d3-a456-426614174001"), "distinct UUIDs unexpectedly share the derived ref");
});

test("materialized Work refs are persisted aliases, not sequential history numbers", () => {
  const repo = setup();
  try {
    const ref = materializedRef(repo);
    assert(ref === currentRef(repo) && ref !== "W-0000000000000001", `materialized ref retained sequential allocation: ${ref}`);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});
