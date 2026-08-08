import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { relative, resolve } from "node:path";

export type GitBaseline = { head: string; dirty: Array<FileState & { origin: "tracked" | "untracked" }> };
export type FileState = { path: string; state: "present" | "deleted"; hash: string | null };
function git(root: string, args: string[]) { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
export function captureBaseline(root: string): GitBaseline {
  try { git(root, ["diff", "--cached", "--quiet"]); } catch { throw new Error("Work Item activation requires a clean Git index."); }
  let head: string; try { head = git(root, ["rev-parse", "HEAD"]); } catch { throw new Error("Work Item activation requires an existing HEAD commit."); }
  const untracked = new Set(git(root, ["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean));
  return { head, dirty: changedPaths(root, head).map((path) => ({ ...fileState(root, path), origin: untracked.has(path) ? "untracked" : "tracked" })) };
}
export function highestWorkIdFromGit(root: string): number {
  return git(root, ["log", "--format=%(trailers:key=Nerv-Work,valueonly)"])
    .split("\n")
    .reduce((highest, value) => {
      const match = /^WORK-(\d+)$/.exec(value.trim());
      const number = match ? Number(match[1]) : 0;
      return Number.isSafeInteger(number) && number > 0 ? Math.max(highest, number) : highest;
    }, 0);
}
export function changedPaths(root: string, head: string): string[] {
  const tracked = git(root, ["diff", "--name-only", head]).split("\n").filter(Boolean);
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
  return [...new Set([...tracked, ...untracked])].filter((path) => path !== ".nerv" && !path.startsWith(".nerv/")).sort();
}
export function fileState(root: string, path: string): FileState {
  const absolute = resolve(root, path); if (!existsSync(absolute)) return { path, state: "deleted", hash: null };
  return { path, state: "present", hash: createHash("sha256").update(readFileSync(absolute)).digest("hex") };
}
export function validatePath(root: string, path: string): string {
  const normalized = relative(root, resolve(root, path));
  if (!normalized || normalized.startsWith("..") || normalized === ".nerv" || normalized.startsWith(`.nerv/`)) throw new Error(`Invalid attributable path: ${path}`);
  return normalized;
}
export function stage(root: string, paths: string[]) { if (paths.length) execFileSync("git", ["add", "--", ...paths], { cwd: root, stdio: "inherit" }); }
export function cachedPaths(root: string): string[] { return git(root, ["diff", "--cached", "--name-only"]).split("\n").filter(Boolean).sort(); }
export function isUntracked(root: string, path: string): boolean { return git(root, ["ls-files", "--others", "--exclude-standard", "--", path]).split("\n").includes(path); }
export function existsAtHead(root: string, head: string, path: string): boolean {
  try { git(root, ["cat-file", "-e", `${head}:${path}`]); return true; } catch { return false; }
}
export function stagedDiff(root: string): string { return git(root, ["diff", "--cached", "--stat"]); }
export function commit(root: string, message: string): string { execFileSync("git", ["commit", "-m", message], { cwd: root, stdio: "inherit" }); return git(root, ["rev-parse", "HEAD"]); }
