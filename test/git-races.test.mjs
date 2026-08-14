import test from "node:test";
import { assert, childEnv, Database, existsSync, finish, git, gitResult, installGitRaceWrapper, join, materialize, mkdtempSync, readFileSync, review, rmSync, run, setup, spawnSync, tmpdir } from "./helpers.mjs";

function preparedRepo() {
  const repo = setup();
  materialize(repo);
  finish(repo, 1, "one.txt");
  finish(repo, 2, "two.txt");
  review(repo, "PASS");
  return repo;
}

function evidence(directory, name) {
  const path = join(directory, name);
  return { path, exists: existsSync(path), events: existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [] };
}

function raceEvidence(directory, scenario, updateRefs) {
  const raceEvidence = evidence(directory, "evidence.json");
  const events = raceEvidence.events;
  const entered = events.filter((event) => event.event === "entered" && event.command === "update-ref");
  const event = (name) => events.findIndex((entry) => entry.event === name);
  const compensation = scenario !== "compensation" || event("publication-succeeded") < event("durable-failure-injected") && event("durable-failure-injected") < event("compensation-reached") && event("compensation-reached") < event("compensation-authority-advanced") && events.some((entry) => entry.event === "delegated" && entry.command === "update-ref" && entry.status !== 0);
  assert(entered.length === updateRefs && entered.every((entry) => entry.realGit && Array.isArray(entry.args)) && events.filter((entry) => entry.event === "delegating" && entry.command === "update-ref").length >= updateRefs && events.filter((entry) => entry.event === "delegated" && entry.command === "update-ref" && entry.status === 0).length >= updateRefs && events.some((entry) => entry.event === "mutation-started" && entry.scenario === scenario) && events.some((entry) => entry.event === "mutation-completed" && entry.scenario === scenario) && compensation, `${scenario} race harness did not prove complete argv forwarding, direct update-ref interception, real-Git delegation, and required mutation ordering: ${JSON.stringify({ raceEvidence })}`);
}

test("Git race wrapper receives exact argv and delegates safely", () => {
  const repo = setup(); const bin = mkdtempSync(join(tmpdir(), "nerv-git-bootstrap-")); try {
    const env = installGitRaceWrapper(bin);
    const probe = ["rev-parse", "--is-inside-work-tree"];
    const effectiveEnv = childEnv(env);
    const report = (result) => ({ status: result.status, signal: result.signal, error: result.error?.message, stdout: result.stdout, stderr: result.stderr });
    const diagnostics = () => ({ wrapper: env.NERV_TEST_GIT_WRAPPER, realGit: env.NERV_REAL_GIT, raceEvidence: evidence(bin, "evidence.json") });
    const direct = spawnSync(process.execPath, [env.NERV_TEST_GIT_WRAPPER, ...probe], { cwd: repo, encoding: "utf8", env: effectiveEnv });
    const directEvidence = diagnostics();
    assert(direct.status === 0 && direct.stdout.trim() === "true" && directEvidence.raceEvidence.events.some((event) => event.event === "entered" && event.command === probe[0] && JSON.stringify(event.args) === JSON.stringify(probe.slice(1))) && directEvidence.raceEvidence.events.some((event) => event.event === "delegated" && event.command === "rev-parse" && event.status === 0), `Git wrapper direct launch did not preserve argv and delegate the repository probe: ${JSON.stringify({ result: report(direct), ...directEvidence })}`);
    assert(!env.PATH && !env.NODE_OPTIONS, `Git race wrapper unexpectedly requires PATH interception or NODE_OPTIONS: ${JSON.stringify(env)}`);
  } finally { rmSync(bin, { recursive: true, force: true }); rmSync(repo, { recursive: true, force: true }); }
});

test("Close safely handles Git publication and compensation races", () => {
  const initial = preparedRepo(); const initialBin = mkdtempSync(join(tmpdir(), "nerv-git-initial-race-")); try {
    const before = git(initial, ["rev-parse", "HEAD"]).stdout.trim();
    const failed = run(initial, ["close", "WORK-001", "--message", "initial race"], 1, { ...installGitRaceWrapper(initialBin), NERV_GIT_RACE_SCENARIO: "initial" });
    const db = new Database(join(initial, ".nerv/nerv.db"), { readOnly: true });
    try { raceEvidence(initialBin, "initial", 1); assert(existsSync(join(initial, ".git/nerv-race-fired")) && failed.includes("publication failed") && git(initial, ["rev-parse", "HEAD"]).stdout.trim() !== before && gitResult(initial, ["diff", "--cached", "--quiet"]).status === 0 && git(initial, ["status", "--porcelain"]).stdout.includes("one.txt") && db.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get().status === "review", "initial publication CAS loss did not execute or mutated Git after external authority advanced"); } finally { db.close(); }
  } finally { rmSync(initialBin, { recursive: true, force: true }); rmSync(initial, { recursive: true, force: true }); }

  const durable = preparedRepo(); const durableBin = mkdtempSync(join(tmpdir(), "nerv-git-durable-race-")); try {
    const baseline = git(durable, ["rev-parse", "HEAD"]).stdout.trim();
    const failed = run(durable, ["close", "WORK-001", "--message", "durable race"], 1, { ...installGitRaceWrapper(durableBin), NERV_GIT_RACE_SCENARIO: "durable" });
    const db = new Database(join(durable, ".nerv/nerv.db"), { readOnly: true });
    try { raceEvidence(durableBin, "durable", 2); assert(existsSync(join(durable, ".git/nerv-race-fired")) && failed.includes("forced durable Close failure") && git(durable, ["rev-parse", "HEAD"]).stdout.trim() === baseline && gitResult(durable, ["diff", "--cached", "--quiet"]).status === 0 && git(durable, ["status", "--porcelain"]).stdout.includes("one.txt") && db.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get().status === "review", "durable Close failure did not execute or safely compensate publication"); } finally { db.close(); }
  } finally { rmSync(durableBin, { recursive: true, force: true }); rmSync(durable, { recursive: true, force: true }); }

  const compensation = preparedRepo(); const compensationBin = mkdtempSync(join(tmpdir(), "nerv-git-compensation-race-")); try {
    const boundary = join(compensationBin, "boundary");
    const failed = run(compensation, ["close", "WORK-001", "--message", "compensation race"], 1, { ...installGitRaceWrapper(compensationBin), NERV_GIT_RACE_SCENARIO: "compensation", NERV_GIT_RACE_BOUNDARY: boundary });
    raceEvidence(compensationBin, "compensation", 2); const [ref, index, status] = readFileSync(boundary, "utf8").split("\n");
    const after = { ref: git(compensation, ["rev-parse", "HEAD"]).stdout.trim(), index: git(compensation, ["write-tree"]).stdout.trim(), status: Buffer.from(git(compensation, ["status", "--porcelain=v1", "-z"]).stdout).toString("base64") };
    const db = new Database(join(compensation, ".nerv/nerv.db"), { readOnly: true });
    try { assert(existsSync(join(compensation, ".git/nerv-race-fired")) && failed.includes("Git/Nerv consistency failure") && JSON.stringify(after) === JSON.stringify({ ref, index, status }) && db.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get().status === "review", "failed compensation did not execute or mutated Git after external authority advanced"); } finally { db.close(); }
  } finally { rmSync(compensationBin, { recursive: true, force: true }); rmSync(compensation, { recursive: true, force: true }); }
});
