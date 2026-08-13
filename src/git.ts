import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";

export type GitBaseline = { head: string; protected_paths: string[]; protected_tree: string };
export type GitFingerprint = { head: string; paths: string[]; tree: string };
export type PendingCommit = { commit: string; ref: string };

function git(root: string, args: string[], env?: NodeJS.ProcessEnv): string { return execFileSync("git", args, { cwd: root, encoding: "utf8", env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] }).trim(); }
function gitBuffer(root: string, args: string[], env?: NodeJS.ProcessEnv): Buffer { return execFileSync("git", args, { cwd: root, encoding: "buffer", env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] }) as Buffer; }
function nulPaths(output: Buffer): string[] { return output.toString("utf8").split("\0").filter(Boolean); }
export function head(root: string): string { try { return git(root, ["rev-parse", "HEAD"]); } catch { throw new Error("Work Item activation requires an existing HEAD commit."); } }
export function assertExpectedHead(root: string, expected: string): void { if (head(root) !== expected) throw new Error("Git HEAD changed during this Work; Nerv cannot establish the reviewed boundary."); }
export function assertCleanIndex(root: string): void { try { git(root, ["diff", "--cached", "--quiet"]); } catch { throw new Error("Git index must be clean for Nerv Review and Close."); } }
export function canonicalPath(root: string, path: string): string {
  const normalized = relative(root, resolve(root, path)).split(sep).join("/");
  if (!normalized || normalized === ".." || normalized.startsWith("../") || normalized === ".nerv" || normalized.startsWith(".nerv/")) throw new Error(`Invalid attributable path: ${path}`);
  return normalized;
}
function workingPaths(root: string, headId: string): string[] {
  const tracked = nulPaths(gitBuffer(root, ["diff", "--name-only", "-z", headId]));
  const untracked = nulPaths(gitBuffer(root, ["ls-files", "--others", "--exclude-standard", "-z"]));
  return [...new Set([...tracked, ...untracked])].filter((path) => path !== ".nerv" && !path.startsWith(".nerv/")).sort();
}
function withTemporaryIndex<T>(root: string, callback: (env: NodeJS.ProcessEnv) => T): T {
  const directory = mkdtempSync(`${tmpdir()}/nerv-index-`); const index = `${directory}/index`;
  try { return callback({ GIT_INDEX_FILE: index }); } finally { rmSync(directory, { recursive: true, force: true }); }
}
function treeForPaths(root: string, headId: string, paths: string[]): string {
  return withTemporaryIndex(root, (env) => {
    git(root, ["read-tree", headId], env);
    for (const path of paths) {
      if (existsSync(resolve(root, path))) git(root, ["add", "--", path], env);
      else git(root, ["rm", "--cached", "--ignore-unmatch", "--", path], env);
    }
    return git(root, ["write-tree"], env);
  });
}
export function captureBaseline(root: string): GitBaseline {
  assertCleanIndex(root); const headId = head(root); const protected_paths = workingPaths(root, headId);
  return { head: headId, protected_paths, protected_tree: treeForPaths(root, headId, protected_paths) };
}
export function assertProtectedBaseline(root: string, baseline: GitBaseline): void {
  if (treeForPaths(root, baseline.head, baseline.protected_paths) !== baseline.protected_tree) throw new Error("Baseline-dirty paths changed during this Work; Nerv cannot establish the reviewed boundary.");
}
export function workFingerprint(root: string, baseline: GitBaseline, paths: string[]): GitFingerprint {
  const canonical = [...new Set(paths.map((path) => canonicalPath(root, path)))].sort();
  const protectedPaths = new Set(baseline.protected_paths);
  if (canonical.some((path) => protectedPaths.has(path))) throw new Error("Baseline-dirty paths cannot be Work-owned.");
  return { head: baseline.head, paths: canonical, tree: treeForPaths(root, baseline.head, canonical) };
}
export function headTree(root: string, headId: string): string { return git(root, ["rev-parse", `${headId}^{tree}`]); }
export function stage(root: string, paths: string[]): void { for (const path of paths) { if (existsSync(resolve(root, path))) git(root, ["add", "--", path]); else git(root, ["rm", "--cached", "--ignore-unmatch", "--", path]); } }
export function stagedTree(root: string): string { return git(root, ["write-tree"]); }
export function unstage(root: string, headId: string, paths: string[]): void { if (paths.length) git(root, ["reset", "-q", headId, "--", ...paths]); }
export function createExactCommit(root: string, tree: string, expectedHead: string, message: string): PendingCommit {
  if (process.env.NERV_TEST_FAIL_COMMIT_CREATE) throw new Error("simulated commit creation failure");
  const commit = git(root, ["commit-tree", tree, "-p", expectedHead, "-m", message]);
  const parent = git(root, ["rev-parse", `${commit}^`]); const actualTree = git(root, ["rev-parse", `${commit}^{tree}`]); const body = git(root, ["log", "-1", "--format=%B", commit]);
  if (parent !== expectedHead || actualTree !== tree || !body.includes("Nerv-Work:") || !body.includes("Nerv-Work-Ref:")) throw new Error("Created commit does not match the reviewed Nerv Work tree.");
  let ref = "HEAD"; try { ref = git(root, ["symbolic-ref", "-q", "HEAD"]); } catch { /* Detached HEAD updates HEAD directly. */ }
  return { commit, ref };
}
export function publishCommit(root: string, pending: PendingCommit, expectedHead: string): void { if (process.env.NERV_TEST_FAIL_PUBLICATION) throw new Error("simulated guarded publication failure"); git(root, ["update-ref", pending.ref, pending.commit, expectedHead]); }
export function rollbackPublishedCommit(root: string, pending: PendingCommit, expectedHead: string): void { git(root, ["update-ref", pending.ref, expectedHead, pending.commit]); }
export function currentRef(root: string, ref: string): string { return git(root, ["rev-parse", ref]); }
export function advanceRefForTest(root: string, ref: string, parent: string): string {
  const commit = git(root, ["commit-tree", `${parent}^{tree}`, "-p", parent, "-m", "external ref advance"]);
  git(root, ["update-ref", ref, commit, parent]); return commit;
}
export function gitBoundarySnapshot(root: string, ref: string): string {
  return JSON.stringify({ ref: currentRef(root, ref), index: stagedTree(root), status: gitBuffer(root, ["status", "--porcelain=v1", "-z"]).toString("base64") });
}
export function commitExactTree(root: string, tree: string, expectedHead: string, message: string): string {
  const pending = createExactCommit(root, tree, expectedHead, message); publishCommit(root, pending, expectedHead); return pending.commit;
}
