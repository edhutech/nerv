import test from "node:test";
import { assert, currentRef, finish, git, join, materialize, mkdirSync, readFileSync, remediation, review, rmSync, run, setup, writeFileSync } from "./helpers.mjs";

test("attribution rejects malformed comma lists but accepts literal comma filenames", () => {
  const repo = setup();
  try {
    materialize(repo);
    const ref = currentRef(repo);
    writeFileSync(join(repo, "one.txt"), "one\n");
    writeFileSync(join(repo, "two.txt"), "two\n");
    assert(run(repo, ["work", "task", "done", ref, "1", "--evidence", "targeted", "--files", "one.txt,two.txt"], 1).includes("pass each path separately"), "comma-combined attribution was accepted");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
  const comma = setup();
  try {
    materialize(comma);
    const ref = currentRef(comma);
    writeFileSync(join(comma, "comma,name.txt"), "feature\n");
    run(comma, ["work", "task", "done", ref, "1", "--evidence", "targeted", "--files", "comma,name.txt"]);
    finish(comma, 2, "two.txt");
    assert(run(comma, ["review", ref, "--outcome", "PASS", "--summary", "complete", "--validation-evidence", "full"]).includes("PASS"), "literal comma filename was rejected");
  } finally {
    rmSync(comma, { recursive: true, force: true });
  }
});

test("Review blocks new unattributed changes without claiming protected baseline paths", () => {
  const repo = setup();
  try {
    writeFileSync(join(repo, "baseline.txt"), "before\n");
    materialize(repo);
    const ref = currentRef(repo);
    finish(repo, 1, "one.txt");
    finish(repo, 2, "two.txt");
    writeFileSync(join(repo, "unattributed.txt"), "after\n");
    assert(run(repo, ["review", ref, "--outcome", "PASS", "--summary", "complete", "--validation-evidence", "full"], 1).includes("Unattributed changes"), "Review ignored a new unattributed path");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("invalid trees recover through REWORK and local excludes cannot conceal attribution", () => {
  const repo = setup();
  try {
    materialize(repo);
    const ref = currentRef(repo);
    finish(repo, 1, "one.txt");
    finish(repo, 2, "two.txt");
    mkdirSync(join(repo, "node_modules", "package"), { recursive: true });
    mkdirSync(join(repo, "dist"), { recursive: true });
    writeFileSync(join(repo, "node_modules", "package", "index.js"), "generated\n");
    writeFileSync(join(repo, "dist", "index.js"), "generated\n");
    assert(run(repo, ["review", ref, "--outcome", "PASS", "--summary", "complete", "--validation-evidence", "full"], 1).includes("Unattributed changes"), "Review accepted unattributed generated paths");
    const exclude = join(repo, ".git", "info", "exclude");
    writeFileSync(exclude, `${readFileSync(exclude, "utf8")}node_modules/\ndist/\n`);
    const hidden = run(repo, ["review", ref, "--outcome", "PASS", "--summary", "complete", "--validation-evidence", "full"], 1);
    assert(hidden.includes("node_modules/package/index.js") && hidden.includes("dist/index.js"), "local exclude concealed unattributed paths");
    review(repo, "REWORK", remediation);
    run(repo, ["work", "materialize-rework", ref]);
    writeFileSync(join(repo, ".gitignore"), "node_modules/\ndist/\n");
    run(repo, ["work", "task", "done", ref, "3", "--evidence", "ignore generated outputs", "--files", ".gitignore"]);
    review(repo, "PASS");
    run(repo, ["close", ref, "--message", "ignore generated outputs"]);
    assert(git(repo, ["show", "--format=", "--name-only", "HEAD"]).stdout.includes(".gitignore"), "governed remediation did not close with the repository ignore rule");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
