import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, isAbsolute, join, parse, resolve } from "node:path";
import { hasRequiredSchema, initializeDatabase } from "./database.js";
import { workRef } from "./repository.js";

const DIRS = [".nerv", ".nerv/agent", ".nerv/agent/active"] as const;
const AGENTS_BRIDGE = "# Agent Instructions\n\nFor Nerv-governed work, read `.agents/skills/nerv/SKILL.md` and follow it.\n";
const UNSUPPORTED_SCHEMA = "existing .nerv/nerv.db uses an unsupported generated schema; use a compatible/current Nerv version, or back up .nerv before intentionally discarding it";
export type WorkspaceStatus = { repoRoot: string | null; workspaceRoot: string | null; databasePath: string | null; initialized: boolean };
type SkillSync = { status: "installed" | "current" | "preserved"; message?: string };
export type SetupStatus = { path: string; established: boolean };
const SHARED_CONTEXT_FILES = [
  ["product.md", "# Product\n\n## What it is\n\n## Users and problem\n\n## Core capabilities\n\n## Product invariants\n\n## Boundaries\n\n## Current direction\n"],
  ["repo.md", "# Repository\n\n## Stack\n\n## Architecture\n\n## Important paths\n\n## Development rules\n\n## Generated and local state\n\n## Validation\n\n## Repository invariants\n"],
] as const;
export const CANONICAL_SETUP_PATHS = [".agents/skills/nerv/SKILL.md", ...SHARED_CONTEXT_FILES.map(([name]) => `.nerv-context/${name}`)] as const;

export function findRepoRoot(start: string): string | null {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current || current === parse(current).root) return null;
    current = parent;
  }
}
export function getWorkspaceStatus(start: string): WorkspaceStatus {
  const repoRoot = findRepoRoot(start);
  if (!repoRoot) return { repoRoot: null, workspaceRoot: null, databasePath: null, initialized: false };
  const workspaceRoot = join(repoRoot, ".nerv");
  const databasePath = join(workspaceRoot, "nerv.db");
  return { repoRoot, workspaceRoot, databasePath, initialized: DIRS.every((dir) => isDirectory(join(repoRoot, dir))) && existsSync(databasePath) && hasRequiredSchema(databasePath) };
}
export function ensureWorkspace(repoRoot: string): WorkspaceStatus & { skillSync: SkillSync; setup: SetupStatus[] } {
  const databasePath = join(repoRoot, ".nerv", "nerv.db");
  if (existsSync(databasePath) && !hasRequiredSchema(databasePath)) throw new Error(UNSUPPORTED_SCHEMA);
  for (const dir of DIRS) mkdirSync(join(repoRoot, dir), { recursive: true });
  initializeDatabase(databasePath, existsSync(databasePath) ? undefined : nextWorkNumber(repoRoot));
  ensureLocalExclude(repoRoot);
  const skillSync = ensurePublicSkill(repoRoot);
  ensureAgentsBridge(repoRoot);
  ensureClaudeBridge(repoRoot);
  ensureSharedContext(repoRoot);
  return { repoRoot, workspaceRoot: join(repoRoot, ".nerv"), databasePath, initialized: true, skillSync, setup: canonicalSetupStatus(repoRoot) };
}
function ensureSharedContext(repoRoot: string): void {
  const directory = join(repoRoot, ".nerv-context");
  mkdirSync(directory, { recursive: true });
  for (const [name, content] of SHARED_CONTEXT_FILES) {
    const path = join(directory, name);
    if (!existsSync(path)) writeFileSync(path, content, "utf8");
  }
}
function git(repoRoot: string, args: string[]): string { return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
function gitSucceeds(repoRoot: string, args: string[]): boolean { try { git(repoRoot, args); return true; } catch { return false; } }
function nextWorkNumber(repoRoot: string): number {
  let entries: string[];
  try {
    entries = (execFileSync("git", ["log", "-z", "--format=%(trailers:key=Nerv-Work,valueonly,unfold=true)%x00%(trailers:key=Nerv-Work-Ref,valueonly,unfold=true)", "HEAD"], { cwd: repoRoot, encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] }) as Buffer).toString("utf8").split("\0");
  } catch { return 1; }
  let highest = 0;
  for (let index = 0; index + 1 < entries.length; index += 2) {
    const ids = entries[index].split("\n").filter(Boolean);
    const refs = entries[index + 1].split("\n").filter(Boolean);
    if (ids.length !== 1 || refs.length !== 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ids[0])) continue;
    const match = /^WORK-([0-9]+)$/.exec(refs[0]);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isSafeInteger(value) && value > 0 && workRef(value) === refs[0]) highest = Math.max(highest, value);
  }
  return highest + 1;
}
export function ensureLocalExclude(repoRoot: string): void {
  const resolved = git(repoRoot, ["rev-parse", "--git-path", "info/exclude"]);
  const path = isAbsolute(resolved) ? resolved : resolve(repoRoot, resolved);
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) { writeFileSync(path, ".nerv/\n", "utf8"); return; }
  const content = readFileSync(path, "utf8");
  if (content.split(/\r?\n/).some((line) => [".nerv", ".nerv/", "/.nerv", "/.nerv/"].includes(line.trim()))) return;
  appendFileSync(path, `${content.endsWith("\n") || content.length === 0 ? "" : "\n"}.nerv/\n`);
}
export function canonicalSetupStatus(repoRoot: string): SetupStatus[] {
  return CANONICAL_SETUP_PATHS.map((path) => ({ path, established: existsSync(join(repoRoot, path)) && gitSucceeds(repoRoot, ["ls-files", "--error-unmatch", "--", path]) && gitSucceeds(repoRoot, ["diff", "--quiet", "--cached", "HEAD", "--", path]) && gitSucceeds(repoRoot, ["diff", "--quiet", "HEAD", "--", path]) }));
}
export function assertCanonicalSetupEstablished(repoRoot: string): void {
  const pending = canonicalSetupStatus(repoRoot).filter((entry) => !entry.established).map((entry) => entry.path);
  if (pending.length) throw new Error(`Nerv repository setup/context must be committed before materializing a new Work: ${pending.join(", ")}.`);
}
function ensurePublicSkill(repoRoot: string): SkillSync {
  const destination = join(repoRoot, ".agents", "skills", "nerv", "SKILL.md");
  const packaged = readFileSync(new URL("../.agents/skills/nerv/SKILL.md", import.meta.url), "utf8");
  return ensureManagedFile(destination, packaged, "Public Nerv skill");
}
function ensureAgentsBridge(repoRoot: string): SkillSync {
  return ensureManagedFile(join(repoRoot, "AGENTS.md"), AGENTS_BRIDGE, "Agent discovery bridge");
}
function ensureClaudeBridge(repoRoot: string): SkillSync {
  const destination = join(repoRoot, "CLAUDE.md");
  const packaged = readFileSync(new URL("../CLAUDE.md", import.meta.url), "utf8");
  return ensureManagedFile(destination, packaged, "Claude Code bridge");
}
function ensureManagedFile(destination: string, packaged: string, label: string): SkillSync {
  if (!existsSync(destination)) {
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, packaged);
    return { status: "installed" };
  }
  if (!statSync(destination).isFile()) throw new Error(`cannot install ${label}: ${destination} is not a file`);
  const installed = readFileSync(destination, "utf8");
  if (installed === packaged) return { status: "current" };
  return { status: "preserved", message: `${label} preserved at ${destination}; update it through approved repository work.` };
}
function isDirectory(path: string): boolean { return existsSync(path) && statSync(path).isDirectory(); }
