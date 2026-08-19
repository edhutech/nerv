import { execFileSync } from "node:child_process";
import { lstatSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";

export type GitBaseline = {
  head: string;
  protected_paths: string[];
  protected_tree: string;
};
export type GitFingerprint = { head: string; paths: string[]; tree: string };
export type PendingCommit = { commit: string; ref: string };
function gitCommand(args: string[]): { command: string; args: string[] } {
  const wrapper = process.env.NERV_TEST_GIT_WRAPPER;
  return wrapper ? { command: process.execPath, args: [wrapper, ...args] } : { command: "git", args };
}
function git(root: string, args: string[], env?: NodeJS.ProcessEnv): string {
  const command = gitCommand(args);
  return execFileSync(command.command, command.args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
function gitBuffer(root: string, args: string[], env?: NodeJS.ProcessEnv): Buffer {
  const command = gitCommand(args);
  return execFileSync(command.command, command.args, {
    cwd: root,
    encoding: "buffer",
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  }) as Buffer;
}
const nulPaths = (output: Buffer) => output.toString("utf8").split("\0").filter(Boolean);
export function head(root: string): string {
  try {
    return git(root, ["rev-parse", "HEAD"]);
  } catch {
    throw new Error("Work Item activation requires an existing HEAD commit.");
  }
}
export function assertExpectedHead(root: string, expected: string): void {
  if (head(root) !== expected) {
    throw new Error("Git HEAD changed during this Work; Nerv cannot establish the reviewed boundary.");
  }
}
export function assertCleanIndex(root: string): void {
  try {
    git(root, ["diff", "--cached", "--quiet"]);
  } catch {
    throw new Error("Git index must be clean for Nerv Review and Close.");
  }
}
export function canonicalPath(root: string, input: string): string {
  if (!input || input.includes("\0")) throw new Error(`Invalid attributable path: ${input}`);
  const path = relative(root, resolve(root, input)).split(sep).join("/");
  if (!path || path === ".." || path.startsWith("../") || path === ".nerv" || path.startsWith(".nerv/")) throw new Error(`Invalid attributable path: ${input}`);
  let current = root;
  for (const part of path.split("/")) {
    current = resolve(current, part);
    try {
      const stat = lstatSync(current);
      if (part === path.split("/").at(-1) && stat.isDirectory()) throw new Error(`Invalid attributable path: ${input}`);
      if (stat.isSymbolicLink() && part !== path.split("/").at(-1)) {
        const target = realpathSync(current);
        if (target !== root && !target.startsWith(`${root}${sep}`)) throw new Error(`Invalid attributable path: ${input}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Invalid attributable")) {
        throw error;
      }
    }
  }
  const tracked = nulPaths(gitBuffer(root, ["ls-files", "-z", "--", path], { GIT_LITERAL_PATHSPECS: "1" }));
  if (tracked.some((entry) => entry.startsWith(`${path}/`))) throw new Error(`Invalid attributable path: ${input}`);
  if (path.includes(",")) {
    const exists = (() => { try { lstatSync(resolve(root, path)); return true; } catch { return false; } })();
    const candidates = path.split(",");
    if (!exists && candidates.length > 1 && candidates.every((candidate) => { try { return lstatSync(resolve(root, candidate)).isFile(); } catch { return false; } })) {
      throw new Error(`Invalid attributable path: ${input}; pass each path separately.`);
    }
  }
  return path;
}
function workingPaths(root: string, headId: string): string[] {
  return [
    ...new Set([
      ...nulPaths(gitBuffer(root, ["diff", "--name-only", "-z", headId])),
      ...nulPaths(gitBuffer(root, ["ls-files", "--others", "--exclude-per-directory=.gitignore", "-z"])),
    ]),
  ].filter((path) => path !== ".nerv" && !path.startsWith(".nerv/")).sort();
}
function withTemporaryIndex<T>(root: string, callback: (env: NodeJS.ProcessEnv) => T): T {
  const directory = mkdtempSync(`${tmpdir()}/nerv-index-`);
  try {
    return callback({ GIT_INDEX_FILE: `${directory}/index` });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
function treeForPaths(root: string, headId: string, paths: string[]): string {
  return withTemporaryIndex(root, (env) => {
    git(root, ["read-tree", headId], env);
    for (const path of paths) {
      const exists = (() => {
        try {
          lstatSync(resolve(root, path));
          return true;
        } catch {
          return false;
        }
      })();
      git(root, exists ? ["add", "--", path] : ["rm", "--cached", "--ignore-unmatch", "--", path], {
        ...env,
        GIT_LITERAL_PATHSPECS: "1",
      });
    }
    return git(root, ["write-tree"], env);
  });
}
export function captureBaseline(root: string): GitBaseline {
  assertCleanIndex(root);
  const headId = head(root);
  const protected_paths = workingPaths(root, headId);
  return { head: headId, protected_paths, protected_tree: treeForPaths(root, headId, protected_paths) };
}
export function assertProtectedBaseline(root: string, baseline: GitBaseline): void {
  if (treeForPaths(root, baseline.head, baseline.protected_paths) !== baseline.protected_tree) {
    throw new Error("Baseline-dirty paths changed during this Work; Nerv cannot establish the reviewed boundary.");
  }
}
function assertAttributionComplete(root: string, baseline: GitBaseline, paths: string[]): void {
  const owned = new Set(paths.map((path) => canonicalPath(root, path)));
  const protectedPaths = new Set(baseline.protected_paths);
  const unattributed = workingPaths(root, baseline.head).filter((path) => !protectedPaths.has(path) && !owned.has(path));
  if (unattributed.length) throw new Error(`Unattributed changes prevent Review: ${unattributed.join(", ")}.`);
}
export function workFingerprint(root: string, baseline: GitBaseline, paths: string[]): GitFingerprint {
  const canonical = [...new Set(paths.map((path) => canonicalPath(root, path)))].sort();
  if (canonical.some((path) => baseline.protected_paths.some((protectedPath) => path === protectedPath || path.startsWith(`${protectedPath}/`) || protectedPath.startsWith(`${path}/`)))) {
    throw new Error("Baseline-dirty paths cannot be Work-owned.");
  }
  assertAttributionComplete(root, baseline, canonical);
  return { head: baseline.head, paths: canonical, tree: treeForPaths(root, baseline.head, canonical) };
}
export function headTree(root: string, headId: string): string {
  return git(root, ["rev-parse", `${headId}^{tree}`]);
}
export function createExactCommit(root: string, tree: string, expectedHead: string, message: string): PendingCommit {
  const commit = git(root, ["commit-tree", tree, "-p", expectedHead, "-m", message]);
  const parent = git(root, ["rev-parse", `${commit}^`]);
  const actualTree = git(root, ["rev-parse", `${commit}^{tree}`]);
  const body = git(root, ["log", "-1", "--format=%B", commit]);
  if (parent !== expectedHead || actualTree !== tree || !body.includes("Nerv-Work:") || !body.includes("Nerv-Work-Ref:")) {
    throw new Error("Created commit does not match the reviewed Nerv Work tree.");
  }
  let ref = "HEAD";
  try {
    ref = git(root, ["symbolic-ref", "-q", "HEAD"]);
  } catch {
    /* Detached HEAD updates HEAD directly. */
  }
  return { commit, ref };
}
export function publishCommit(root: string, pending: PendingCommit, expectedHead: string): void {
  git(root, ["update-ref", pending.ref, pending.commit, expectedHead]);
}
export function rollbackPublishedCommit(root: string, pending: PendingCommit, expectedHead: string): void {
  git(root, ["update-ref", pending.ref, expectedHead, pending.commit]);
}
export function currentRef(root: string, ref: string): string {
  return git(root, ["rev-parse", ref]);
}
export function refreshIndex(root: string): void {
  git(root, ["read-tree", "HEAD"]);
}
