import test from "node:test";
import { assert, Database, existsSync, finish, git, installGitRaceWrapper, join, materialize, mkdtempSync, readFileSync, review, rmSync, run, setup, tmpdir } from "./helpers.mjs";

function preparedRepo() {
  const repo = setup();
  materialize(repo);
  finish(repo, 1, "one.txt");
  finish(repo, 2, "two.txt");
  review(repo, "PASS");
  return repo;
}

function raceEvidence(directory, scenario, updateRefs) {
  const events = JSON.parse(readFileSync(join(directory, "evidence.json"), "utf8"));
  const entered = events.filter((event) => event.event === "entered" && event.command === "update-ref");
  const event = (name) => events.findIndex((entry) => entry.event === name);
  const compensation = scenario !== "compensation" || event("publication-succeeded") < event("durable-failure-injected") && event("durable-failure-injected") < event("compensation-reached") && event("compensation-reached") < event("compensation-authority-advanced") && events.some((entry) => entry.event === "delegated" && entry.command === "update-ref" && entry.status !== 0);
  assert(entered.length === updateRefs && events.some((entry) => entry.event === "delegating" && entry.command === "update-ref") && events.some((entry) => entry.event === "delegated" && entry.command === "update-ref" && entry.status === 0) && events.some((entry) => entry.event === "mutation-started" && entry.scenario === scenario) && events.some((entry) => entry.event === "mutation-completed" && entry.scenario === scenario) && compensation, `${scenario} race harness did not prove direct update-ref interception, real-Git delegation, and required mutation ordering: ${JSON.stringify(events)}`);
}

test("Close safely handles Git publication and compensation races", () => {
  const initial = preparedRepo(); const initialBin = mkdtempSync(join(tmpdir(), "nerv-git-initial-race-")); try {
    const before = git(initial, ["rev-parse", "HEAD"]).stdout.trim();
    const failed = run(initial, ["close", "WORK-001", "--message", "initial race"], 1, { ...installGitRaceWrapper(initialBin), NERV_GIT_RACE_SCENARIO: "initial" });
    const db = new Database(join(initial, ".nerv/nerv.db"), { readonly: true });
    try { raceEvidence(initialBin, "initial", 1); assert(existsSync(join(initial, ".git/nerv-race-fired")) && failed.includes("publication failed") && git(initial, ["rev-parse", "HEAD"]).stdout.trim() !== before && git(initial, ["diff", "--cached", "--quiet"]).status === 0 && git(initial, ["status", "--porcelain"]).stdout.includes("one.txt") && db.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get().status === "review", "initial publication CAS loss did not execute or mutated Git after external authority advanced"); } finally { db.close(); }
  } finally { rmSync(initialBin, { recursive: true, force: true }); rmSync(initial, { recursive: true, force: true }); }

  const durable = preparedRepo(); const durableBin = mkdtempSync(join(tmpdir(), "nerv-git-durable-race-")); try {
    const baseline = git(durable, ["rev-parse", "HEAD"]).stdout.trim();
    const failed = run(durable, ["close", "WORK-001", "--message", "durable race"], 1, { ...installGitRaceWrapper(durableBin), NERV_GIT_RACE_SCENARIO: "durable" });
    const db = new Database(join(durable, ".nerv/nerv.db"), { readonly: true });
    try { raceEvidence(durableBin, "durable", 2); assert(existsSync(join(durable, ".git/nerv-race-fired")) && failed.includes("forced durable Close failure") && git(durable, ["rev-parse", "HEAD"]).stdout.trim() === baseline && git(durable, ["diff", "--cached", "--quiet"]).status === 0 && git(durable, ["status", "--porcelain"]).stdout.includes("one.txt") && db.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get().status === "review", "durable Close failure did not execute or safely compensate publication"); } finally { db.close(); }
  } finally { rmSync(durableBin, { recursive: true, force: true }); rmSync(durable, { recursive: true, force: true }); }

  const compensation = preparedRepo(); const compensationBin = mkdtempSync(join(tmpdir(), "nerv-git-compensation-race-")); try {
    const boundary = join(compensationBin, "boundary");
    const failed = run(compensation, ["close", "WORK-001", "--message", "compensation race"], 1, { ...installGitRaceWrapper(compensationBin), NERV_GIT_RACE_SCENARIO: "compensation", NERV_GIT_RACE_BOUNDARY: boundary });
    raceEvidence(compensationBin, "compensation", 2); const [ref, index, status] = readFileSync(boundary, "utf8").split("\n");
    const after = { ref: git(compensation, ["rev-parse", "HEAD"]).stdout.trim(), index: git(compensation, ["write-tree"]).stdout.trim(), status: Buffer.from(git(compensation, ["status", "--porcelain=v1", "-z"]).stdout).toString("base64") };
    const db = new Database(join(compensation, ".nerv/nerv.db"), { readonly: true });
    try { assert(existsSync(join(compensation, ".git/nerv-race-fired")) && failed.includes("Git/Nerv consistency failure") && JSON.stringify(after) === JSON.stringify({ ref, index, status }) && db.prepare("SELECT status FROM work_items WHERE ref='WORK-001'").get().status === "review", "failed compensation did not execute or mutated Git after external authority advanced"); } finally { db.close(); }
  } finally { rmSync(compensationBin, { recursive: true, force: true }); rmSync(compensation, { recursive: true, force: true }); }
});
