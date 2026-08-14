import test from "node:test";
import { assert, chmodSync, Database, existsSync, finish, git, gitResult, join, materialize, mkdirSync, mkdtempSync, readFileSync, review, rmSync, run, setup, tmpdir, writeFileSync } from "./helpers.mjs";

test("unrelated baseline-dirty files do not block new Work", () => {
  const dirty = setup(); try { writeFileSync(join(dirty, "unrelated.txt"), "dirty\n"); assert(materialize(dirty), "unrelated dirty path blocked new Work"); } finally { rmSync(dirty, { recursive: true, force: true }); }
});

test("Close preserves special entries, exact reviewed trees, literal paths, deletions, and no-diff behavior", () => {
  const special = setup(); const indexDir = mkdtempSync(join(tmpdir(), "nerv-special-index-")); try {
    const head = git(special, ["rev-parse", "HEAD"]).stdout.trim(); const index = join(indexDir, "index"); const env = { GIT_INDEX_FILE: index };
    writeFileSync(join(special, "binary.bin"), Buffer.from([0, 1, 2, 255])); writeFileSync(join(special, "executable.sh"), "#!/bin/sh\nexit 0\n"); writeFileSync(join(special, "dangling-link"), "missing-target");
    git(special, ["read-tree", head], env);
    for (const [mode, file, path] of [["100644", "binary.bin", "binary.bin"], ["100755", "executable.sh", "executable.sh"], ["120000", "dangling-link", "dangling-link"]]) { const blob = git(special, ["hash-object", "-w", file]).stdout.trim(); git(special, ["update-index", "--add", "--cacheinfo", `${mode},${blob},${path}`], env); }
    const tree = git(special, ["write-tree"], env).stdout.trim(); const commit = git(special, ["commit-tree", tree, "-p", head, "-m", "special Git entries"]).stdout.trim(); git(special, ["update-ref", "HEAD", commit, head]); git(special, ["read-tree", "HEAD"]);
    materialize(special); finish(special, 1, "one.txt"); finish(special, 2, "two.txt"); review(special, "PASS"); run(special, ["close", "WORK-001", "--message", "preserve special Git entries"]);
    assert(git(special, ["ls-tree", "HEAD", "binary.bin"]).stdout.includes("100644") && git(special, ["ls-tree", "HEAD", "executable.sh"]).stdout.includes("100755") && git(special, ["ls-tree", "HEAD", "dangling-link"]).stdout.includes("120000"), "Git-native special file identity was not preserved");
  } finally { rmSync(indexDir, { recursive: true, force: true }); rmSync(special, { recursive: true, force: true }); }

  const exact = setup(); try { materialize(exact); finish(exact, 1, "one.txt"); finish(exact, 2, "two.txt"); review(exact, "PASS"); writeFileSync(join(exact, "unrelated.txt"), "unrelated\n"); assert(run(exact, ["close", "WORK-001", "--message", "exact tree"], 1).includes("Unattributed changes"), "Close ignored an unreviewed path"); rmSync(join(exact, "unrelated.txt")); run(exact, ["close", "WORK-001", "--message", "exact tree"]); assert(git(exact, ["show", "--format=", "--name-only", "HEAD"]).stdout.trim().split("\n").sort().join(",") === "one.txt,two.txt", "Close did not commit the exact PASS-reviewed tree"); } finally { rmSync(exact, { recursive: true, force: true }); }
  const paths = setup(); try {
    writeFileSync(join(paths, "literal[1].txt"), "base\n"); writeFileSync(join(paths, "literal1.txt"), "control\n"); git(paths, ["add", "--", "literal[1].txt", "literal1.txt"], { GIT_LITERAL_PATHSPECS: "1" }); git(paths, ["commit", "-m", "literal path base"]); assert(git(paths, ["ls-tree", "--name-only", "HEAD"]).stdout.includes("literal[1].txt") && git(paths, ["ls-tree", "--name-only", "HEAD"]).stdout.includes("literal1.txt"), "literal path base fixture was not established");
    materialize(paths); writeFileSync(join(paths, "space name.txt"), "feature\n"); rmSync(join(paths, "literal[1].txt")); run(paths, ["work", "task", "done", "WORK-001", "1", "--evidence", "exact paths", "--files", "space name.txt", "literal[1].txt"]); finish(paths, 2, "two.txt"); review(paths, "PASS"); run(paths, ["close", "WORK-001", "--message", "literal paths"]);
    const names = git(paths, ["ls-tree", "-r", "--name-only", "HEAD"]).stdout.trim().split("\n");
    assert(!names.includes("literal[1].txt") && names.includes("literal1.txt") && names.includes("space name.txt") && !existsSync(join(paths, "literal[1].txt")) && readFileSync(join(paths, "literal1.txt"), "utf8") === "control\n", "literal path attribution or deletion broadened beyond its exact Git identity");
  } finally { rmSync(paths, { recursive: true, force: true }); }
  const magic = setup(); const magicIndexDir = mkdtempSync(join(tmpdir(), "nerv-literal-path-index-")); try {
    const head = git(magic, ["rev-parse", "HEAD"]).stdout.trim(); const index = join(magicIndexDir, "index"); const env = { GIT_INDEX_FILE: index };
    git(magic, ["read-tree", head], env); const blob = git(magic, ["hash-object", "-w", "--stdin"], env).stdout.trim(); const inserted = gitResult(magic, ["update-index", "--add", "--cacheinfo", `100644,${blob},:(glob)literal.txt`], env);
    if (process.platform === "win32") {
      assert(inserted.status !== 0 && !git(magic, ["ls-files", "--", ":(glob)literal.txt"], { GIT_LITERAL_PATHSPECS: "1" }).stdout.includes(":(glob)literal.txt"), "Git for Windows accepted an unsupported colon path identity");
    } else {
      assert(inserted.status === 0, "POSIX Git rejected representable pathspec-magic fixture"); const tree = git(magic, ["write-tree"], env).stdout.trim(); const commit = git(magic, ["commit-tree", tree, "-p", head, "-m", "literal Git path"]).stdout.trim(); git(magic, ["update-ref", "HEAD", commit, head]); git(magic, ["read-tree", "HEAD"]); git(magic, ["update-index", "--skip-worktree", "--", ":(glob)literal.txt"], { GIT_LITERAL_PATHSPECS: "1" });
       materialize(magic); run(magic, ["work", "task", "done", "WORK-001", "1", "--evidence", "literal magic", "--files", ":(glob)literal.txt"]); finish(magic, 2, "two.txt"); review(magic, "PASS"); run(magic, ["close", "WORK-001", "--message", "literal magic"]);
      assert(!git(magic, ["ls-tree", "HEAD", "--", ":(glob)literal.txt"], { GIT_LITERAL_PATHSPECS: "1" }).stdout.includes(":(glob)literal.txt"), "POSIX literal pathspec magic was not treated as an exact identity");
    }
  } finally { rmSync(magicIndexDir, { recursive: true, force: true }); rmSync(magic, { recursive: true, force: true }); }
  const deletion = setup(); try { writeFileSync(join(deletion, "delete.txt"), "base\n"); git(deletion, ["add", "delete.txt"]); git(deletion, ["commit", "-m", "deletion base"]); materialize(deletion); rmSync(join(deletion, "delete.txt")); run(deletion, ["work", "task", "done", "WORK-001", "1", "--evidence", "deletion", "--files", "delete.txt"]); finish(deletion, 2, "two.txt"); review(deletion, "PASS"); run(deletion, ["close", "WORK-001", "--message", "deletion"]); assert(!existsSync(join(deletion, "delete.txt")), "exact deletion was not committed"); } finally { rmSync(deletion, { recursive: true, force: true }); }
  const noDiff = setup(); try { materialize(noDiff); run(noDiff, ["work", "task", "done", "WORK-001", "1", "--evidence", "no tracked change"]); run(noDiff, ["work", "task", "done", "WORK-001", "2", "--evidence", "no tracked change"]); const before = git(noDiff, ["rev-parse", "HEAD"]).stdout.trim(); review(noDiff, "PASS"); run(noDiff, ["close", "WORK-001", "--message", "no diff"]); const db = new Database(join(noDiff, ".nerv/nerv.db"), { readonly: true }); try { assert(git(noDiff, ["rev-parse", "HEAD"]).stdout.trim() === before && db.prepare("SELECT commit_hash FROM work_items WHERE ref='WORK-001'").get().commit_hash === null, "no-diff Close manufactured a commit"); } finally { db.close(); } } finally { rmSync(noDiff, { recursive: true, force: true }); }
});

test("Close creates the exact reviewed commit without invoking hooks", () => {
  const repo = setup(); try { materialize(repo); finish(repo, 1, "nested path.txt"); finish(repo, 2, "two.txt"); review(repo, "PASS"); const db = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); const fingerprint = JSON.parse(db.prepare("SELECT git_fingerprint_json FROM work_reviews ORDER BY id DESC LIMIT 1").get().git_fingerprint_json); const baseline = JSON.parse(db.prepare("SELECT git_baseline_json FROM work_items WHERE ref='WORK-001'").get().git_baseline_json); db.close(); const hook = join(repo, ".git/hooks/pre-commit"); writeFileSync(hook, "#!/bin/sh\necho hook >> hook-mutated.txt\nexit 1\n"); chmodSync(hook, 0o755); run(repo, ["close", "WORK-001", "--message", "exact identity"]); const actual = git(repo, ["rev-parse", "HEAD"]).stdout.trim(); const closed = new Database(join(repo, ".nerv/nerv.db"), { readonly: true }); try { assert(git(repo, ["rev-parse", "HEAD^"]).stdout.trim() === baseline.head && git(repo, ["rev-parse", "HEAD^{tree}"]).stdout.trim() === fingerprint.tree && !existsSync(join(repo, "hook-mutated.txt")) && git(repo, ["log", "-1", "--format=%B"]).stdout.includes("Nerv-Work:") && git(repo, ["log", "-1", "--format=%B"]).stdout.includes("Nerv-Work-Ref: WORK-001") && closed.prepare("SELECT commit_hash FROM work_items WHERE ref='WORK-001'").get().commit_hash === actual, "exact-tree Close did not create or persist the reviewed commit"); } finally { closed.close(); } } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("Close defaults to the Work title and preserves an explicit subject", () => {
  const defaultSubject = setup();
  try {
    materialize(defaultSubject);
    finish(defaultSubject, 1, "one.txt");
    finish(defaultSubject, 2, "two.txt");
    review(defaultSubject, "PASS");
    run(defaultSubject, ["close", "WORK-001"]);
    const message = git(defaultSubject, ["log", "-1", "--format=%B"]).stdout;
    assert(message.startsWith("Persist plan\n\nNerv-Work:") && !message.includes("approved goal"), "Close default subject or compact trailers are incorrect");
  } finally {
    rmSync(defaultSubject, { recursive: true, force: true });
  }
  const suppliedSubject = setup();
  try {
    materialize(suppliedSubject);
    finish(suppliedSubject, 1, "one.txt");
    finish(suppliedSubject, 2, "two.txt");
    review(suppliedSubject, "PASS");
    run(suppliedSubject, ["close", "WORK-001", "--message", "fix: preserve subject"]);
    assert(git(suppliedSubject, ["log", "-1", "--format=%s"]).stdout.trim() === "fix: preserve subject", "Close did not preserve the supplied subject");
  } finally {
    rmSync(suppliedSubject, { recursive: true, force: true });
  }
});

test("review findings, protected attribution, and verification downgrades remain enforced", () => {
  const remediation = ["--findings", JSON.stringify([{ severity: "high", finding: "fix" }]), "--remediation-title", "Fix", "--remediation-objective", "Resolve", "--remediation-approach", "Change", "--remediation-touchpoints", "src/index.ts", "--remediation-acceptance-criteria", "Resolved", "--remediation-validation", "pnpm test"];
  for (const severity of ["critical", "high", "medium"]) { const repo = setup(); try { materialize(repo); finish(repo, 1, "one.txt"); finish(repo, 2, "two.txt"); const findings = JSON.stringify([{ severity, finding: `${severity} issue` }]); assert(run(repo, ["review", "WORK-001", "--outcome", "PASS", "--summary", "invalid", "--validation-evidence", "full", "--findings", findings], 1).includes("PASS is not permitted"), `${severity} finding did not block PASS`); assert(run(repo, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "missing proposal", "--validation-evidence", "full", "--findings", findings], 1).includes("requires title"), `${severity} REWORK accepted no proposal`); review(repo, "REWORK", ["--findings", findings, "--remediation-title", "Fix", "--remediation-objective", "Resolve issue", "--remediation-approach", "Change implementation", "--remediation-touchpoints", "src/index.ts", "--remediation-acceptance-criteria", "Issue resolved", "--remediation-validation", "pnpm test"]); run(repo, ["work", "materialize-rework", "WORK-001"]); finish(repo, 3, "fix.txt"); assert(review(repo, "PASS").includes("PASS"), `${severity} remediation did not return to Review`); } finally { rmSync(repo, { recursive: true, force: true }); } }
  const residual = setup(); try { materialize(residual); finish(residual, 1, "one.txt"); finish(residual, 2, "two.txt"); const output = review(residual, "PASS", ["--findings", JSON.stringify([{ severity: "medium", finding: "accepted", accepted_as_residual_risk: true }, { severity: "low", finding: "minor" }])]); assert(output.includes("Residual findings") && output.includes("MEDIUM (accepted residual risk)") && output.includes("LOW") && output.includes("do not block Close"), "accepted medium and low residual findings did not coexist with PASS"); } finally { rmSync(residual, { recursive: true, force: true }); }
  const protectedRepo = setup(); try { writeFileSync(join(protectedRepo, "README.md"), "preexisting change\n"); materialize(protectedRepo); assert(run(protectedRepo, ["work", "task", "done", "WORK-001", "1", "--evidence", "unsafe", "--files", "README.md"], 1).includes("Baseline-dirty"), "protected baseline path was attributable"); } finally { rmSync(protectedRepo, { recursive: true, force: true }); }
  const nested = setup(); try { mkdirSync(join(nested, "src")); writeFileSync(join(nested, "src", "protected.txt"), "dirty\n"); materialize(nested); assert(run(nested, ["work", "task", "done", "WORK-001", "1", "--evidence", "unsafe", "--files", "src"], 1).includes("Invalid attributable"), "directory attribution swallowed protected path"); assert(run(nested, ["work", "task", "done", "WORK-001", "1", "--evidence", "unsafe", "--files", "src/protected.txt"], 1).includes("Baseline-dirty"), "protected nested path was attributable"); writeFileSync(join(nested, "src", "normal.txt"), "feature\n"); assert(run(nested, ["work", "task", "done", "WORK-001", "1", "--evidence", "exact", "--files", "src/normal.txt"], 0).includes("Completed"), "exact nested sibling was rejected"); } finally { rmSync(nested, { recursive: true, force: true }); }
  const stale = setup(); try { materialize(stale); finish(stale, 1, "one.txt"); finish(stale, 2, "two.txt"); review(stale, "PASS"); writeFileSync(join(stale, "one.txt"), "changed after PASS\n"); assert(run(stale, ["close", "WORK-001", "--message", "stale"], 1).includes("changed after PASS"), "Close accepted a changed PASS fingerprint"); assert(run(stale, ["review", "WORK-001", "--outcome", "REWORK", "--summary", "mutated", "--validation-evidence", "full", ...remediation, "--verification-evidence", "external verification failed"], 1).includes("changed after PASS"), "mutated PASS downgraded to REWORK"); writeFileSync(join(stale, "one.txt"), "feature\n"); assert(review(stale, "REWORK", [...remediation, "--verification-evidence", "external verification failed"]).includes("REWORK"), "verification could not downgrade PASS to REWORK"); } finally { rmSync(stale, { recursive: true, force: true }); }
});
