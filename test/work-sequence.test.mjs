import test from "node:test";
import { assert, currentRef, finish, join, materializedRef, rmSync, setup } from "./helpers.mjs";

test("Work refs are random UUID-derived uppercase 64-bit identifiers", () => {
  const repo = setup();
  try {
    const first = materializedRef(repo);
    assert(/^W-[0-9A-F]{16}$/.test(first), `invalid Work ref: ${first}`);
    finish(repo, 1, "one.txt", first);
    finish(repo, 2, "two.txt", first);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("Work refs do not depend on sequential history allocation", () => {
  const repo = setup();
  try {
    const first = materializedRef(repo);
    assert(first === currentRef(repo), "generated ref was not persisted");
  } finally { rmSync(repo, { recursive: true, force: true }); }
  const fresh = setup();
  try {
    const second = materializedRef(fresh);
    assert(/^W-[0-9A-F]{16}$/.test(second) && second !== "W-0000000000000001", `ref retained sequential allocation: ${second}`);
  } finally { rmSync(fresh, { recursive: true, force: true }); }
});
