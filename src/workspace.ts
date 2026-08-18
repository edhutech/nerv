import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { dirname, isAbsolute, join, parse, resolve } from "node:path";
import { hasRequiredSchema, initializeDatabase, UNSUPPORTED_SCHEMA } from "./database.js";
import { workRef } from "./repository.js";
import { bridgeBlock, bridgeContent, exactSingleBridge, knownIdentity, normalizedText } from "./managed-artifacts.js";

const DIRS = [".nerv", ".nerv/agent", ".nerv/agent/active"] as const;
export const AGENTS_BRIDGE = bridgeContent("agents");
const LEGACY_AGENTS_BRIDGE = "# Agent Instructions\n\nFor Nerv-governed work, read `.agents/skills/nerv/SKILL.md` and follow it.\n";
export const NERV_EXCLUDE_BLOCK = "# Nerv local state (managed)\n.nerv/\n# End Nerv local state\n";
export type WorkspaceStatus = { repoRoot: string | null; workspaceRoot: string | null; databasePath: string | null; initialized: boolean };
export type SetupStatus = { path: string; established: boolean };
export const CANONICAL_CONTEXT_SCAFFOLDS = {
  product: "# Product\n\n## What it is\n\n## Users and problem\n\n## Core capabilities\n\n## Product invariants\n\n## Boundaries\n\n## Current direction\n",
  repo: "# Repository\n\n## Stack\n\n## Architecture\n\n## Important paths\n\n## Development rules\n\n## Generated and local state\n\n## Validation\n\n## Repository invariants\n",
} as const;
const SHARED_CONTEXT_FILES = [
  ["product.md", CANONICAL_CONTEXT_SCAFFOLDS.product],
  ["repo.md", CANONICAL_CONTEXT_SCAFFOLDS.repo],
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
export function ensureWorkspace(repoRoot: string): WorkspaceStatus & { messages: string[]; setup: SetupStatus[] } {
  const databasePath = join(repoRoot, ".nerv", "nerv.db");
  if (existsSync(databasePath) && !hasRequiredSchema(databasePath)) throw new Error(UNSUPPORTED_SCHEMA);
  for (const dir of DIRS) mkdirSync(join(repoRoot, dir), { recursive: true });
  initializeDatabase(databasePath, existsSync(databasePath) ? undefined : nextWorkNumber(repoRoot));
  ensureLocalExclude(repoRoot);
  const messages = [ensurePublicSkill(repoRoot), ensureAgentsBridge(repoRoot), ensureClaudeBridge(repoRoot)].filter((message): message is string => Boolean(message));
  ensureSharedContext(repoRoot);
  return { repoRoot, workspaceRoot: join(repoRoot, ".nerv"), databasePath, initialized: true, messages, setup: canonicalSetupStatus(repoRoot) };
}

export type UninstallResult = { removed: string[]; preserved: string[]; alreadyAbsent: boolean };

export function uninstallWorkspace(repoRoot: string): UninstallResult {
  const inspection = inspectWorkspaceForUninstall(repoRoot);
  if (!inspection.present && hasRepositorySetup(repoRoot)) {
    throw new Error("Cannot uninstall Nerv safely: .nerv is absent while repository Nerv setup remains; local Work state cannot be inspected.");
  }
  const removed: string[] = [];
  const preserved: string[] = [];
  const packagedSkill = readFileSync(new URL("../.agents/skills/nerv/SKILL.md", import.meta.url), "utf8");
  const packagedClaude = readFileSync(new URL("../CLAUDE.md", import.meta.url), "utf8");

  removeManagedFile(repoRoot, ".agents/skills/nerv/SKILL.md", packagedSkill, "Public Nerv skill", removed, preserved);
  removeManagedFile(repoRoot, "AGENTS.md", AGENTS_BRIDGE, "Agent discovery bridge", removed, preserved, true);
  removeManagedFile(repoRoot, "CLAUDE.md", packagedClaude, "Claude Code bridge", removed, preserved, true);
  removeManagedFile(repoRoot, ".nerv-context/product.md", CANONICAL_CONTEXT_SCAFFOLDS.product, "Product Context scaffold", removed, preserved);
  removeManagedFile(repoRoot, ".nerv-context/repo.md", CANONICAL_CONTEXT_SCAFFOLDS.repo, "Repo Context scaffold", removed, preserved);
  removeManagedExclude(repoRoot, removed);

  if (inspection.present) {
    rmSync(join(repoRoot, ".nerv"), { recursive: true, force: false });
    removed.push(".nerv/");
  }

  pruneEmptyDirectories(repoRoot, [".agents/skills/nerv", ".agents/skills", ".nerv-context"]);
  return { removed, preserved, alreadyAbsent: removed.length === 0 && preserved.length === 0 };
}

function inspectWorkspaceForUninstall(repoRoot: string): { present: boolean } {
  const workspacePath = join(repoRoot, ".nerv");
  let workspaceStat: ReturnType<typeof lstatSync>;
  try {
    workspaceStat = lstatSync(workspacePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { present: false };
    throw new Error("Cannot uninstall Nerv safely: .nerv cannot be inspected; local state may be inaccessible.");
  }
  if (!workspaceStat.isDirectory()) throw new Error("Cannot uninstall Nerv safely: .nerv exists but is not a directory; local state cannot be inspected.");
  const databasePath = join(workspacePath, "nerv.db");
  let databaseStat: ReturnType<typeof lstatSync>;
  try {
    databaseStat = lstatSync(databasePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`Cannot uninstall Nerv safely: .nerv/nerv.db is missing, unsupported, unreadable, or corrupt. Resolve or preserve the local state before retrying.`);
    throw new Error("Cannot uninstall Nerv safely: .nerv/nerv.db cannot be accessed. Resolve or preserve the local state before retrying.");
  }
  if (!databaseStat.isFile() || !hasRequiredSchema(databasePath)) {
    throw new Error(`Cannot uninstall Nerv safely: .nerv/nerv.db is missing, unsupported, unreadable, or corrupt. Resolve or preserve the local state before retrying.`);
  }
  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(databasePath, { readOnly: true });
    const work = database.prepare("SELECT * FROM work_items ORDER BY ref").all() as { ref: string; status: string }[];
    if (work.some((item) => typeof item.ref !== "string" || !["active", "review", "rework", "closed"].includes(item.status))) {
      throw new Error("invalid Work state");
    }
    const unresolved = work.filter((item) => item.status !== "closed");
    if (unresolved.length) {
      throw new Error(`Cannot uninstall Nerv while unresolved Work exists: ${unresolved.map((item) => `${item.ref} (${item.status})`).join(", ")}. Resolve it first.`);
    }
    return { present: true };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Cannot uninstall Nerv while unresolved Work exists:")) throw error;
    throw new Error("Cannot uninstall Nerv safely: .nerv/nerv.db cannot be inspected for unresolved Work. Resolve or preserve the local state before retrying.");
  } finally {
    database?.close();
  }
}

function removeManagedFile(repoRoot: string, relativePath: string, managed: string, label: string, removed: string[], preserved: string[], allowEmbedded = false): void {
  const path = join(repoRoot, relativePath);
  if (!existsSync(path)) return;
  if (!isRegularFile(path)) {
    preserved.push(`${relativePath} (${label} is not a regular file)`);
    return;
  }
  const content = readFileSync(path, "utf8");
  const identity = relativePath === "AGENTS.md" && normalizedText(content) === normalizedText(LEGACY_AGENTS_BRIDGE) ? "legacy" : knownIdentity(relativePath, content);
  if (identity !== "unknown" && relativePath !== "AGENTS.md" && relativePath !== "CLAUDE.md") {
    rmSync(path);
    removed.push(relativePath);
    return;
  }
  if ((relativePath === "AGENTS.md" || relativePath === "CLAUDE.md") && identity !== "unknown") {
    rmSync(path);
    removed.push(relativePath);
    return;
  }
  if (allowEmbedded) {
    const crlf = managed.replaceAll("\n", "\r\n");
    const owned = bridgeBlock(content);
    const expected = relativePath === "AGENTS.md" ? AGENTS_BRIDGE : bridgeContent("claude");
    const next = owned ? exactSingleBridge(content, expected) ? content.replace(owned, "") : null : content.includes(managed) ? content.replace(managed, "") : content.includes(crlf) ? content.replace(crlf, "") : null;
    if (next !== null) {
      if (next) writeFileSync(path, next, "utf8");
      else rmSync(path);
      removed.push(relativePath);
      return;
    }
  }
  preserved.push(`${relativePath} (${label} modified or contains custom content)`);
}

function removeManagedExclude(repoRoot: string, removed: string[]): void {
  const path = localExcludePath(repoRoot);
  if (!existsSync(path) || !isRegularFile(path)) return;
  const content = readFileSync(path, "utf8");
  const crlf = NERV_EXCLUDE_BLOCK.replaceAll("\n", "\r\n");
  const next = content.includes(NERV_EXCLUDE_BLOCK) ? content.replace(NERV_EXCLUDE_BLOCK, "") : content.includes(crlf) ? content.replace(crlf, "") : null;
  if (next !== null && next !== content) {
    writeFileSync(path, next, "utf8");
    removed.push(".git/info/exclude Nerv block");
  }
}

function localExcludePath(repoRoot: string): string {
  const resolved = git(repoRoot, ["rev-parse", "--git-path", "info/exclude"]);
  return isAbsolute(resolved) ? resolved : resolve(repoRoot, resolved);
}

function pruneEmptyDirectories(repoRoot: string, paths: string[]): void {
  for (const relativePath of paths) {
    const path = join(repoRoot, relativePath);
    try {
      if (statSync(path).isDirectory() && readdirSync(path).length === 0) rmSync(path);
    } catch {
      // The path may already be absent or may contain developer-owned content.
    }
  }
}

function isRegularFile(path: string): boolean {
  try { return lstatSync(path).isFile(); } catch { return false; }
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
  const path = localExcludePath(repoRoot);
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) { writeFileSync(path, NERV_EXCLUDE_BLOCK, "utf8"); return; }
  const content = readFileSync(path, "utf8");
  if (content.includes(NERV_EXCLUDE_BLOCK) || content.includes(NERV_EXCLUDE_BLOCK.replaceAll("\n", "\r\n"))) return;
  if (content.split(/\r?\n/).some((line) => [".nerv", ".nerv/", "/.nerv", "/.nerv/"].includes(line.trim()))) return;
  appendFileSync(path, `${content.endsWith("\n") || content.length === 0 ? "" : "\n"}${NERV_EXCLUDE_BLOCK}`);
}
export function canonicalSetupStatus(repoRoot: string): SetupStatus[] {
  return CANONICAL_SETUP_PATHS.map((path) => ({ path, established: existsSync(join(repoRoot, path)) && gitSucceeds(repoRoot, ["ls-files", "--error-unmatch", "--", path]) && gitSucceeds(repoRoot, ["diff", "--quiet", "--cached", "HEAD", "--", path]) && gitSucceeds(repoRoot, ["diff", "--quiet", "HEAD", "--", path]) }));
}
export function assertCanonicalSetupEstablished(repoRoot: string): void {
  const pending = canonicalSetupStatus(repoRoot).filter((entry) => !entry.established).map((entry) => entry.path);
  if (pending.length) throw new Error(`Nerv repository setup/context must be committed before materializing a new Work: ${pending.join(", ")}.`);
}
function ensurePublicSkill(repoRoot: string): string | undefined {
  const destination = join(repoRoot, ".agents", "skills", "nerv", "SKILL.md");
  const packaged = readFileSync(new URL("../.agents/skills/nerv/SKILL.md", import.meta.url), "utf8");
  return ensureManagedFile(destination, packaged, ".agents/skills/nerv/SKILL.md", "Public Nerv skill");
}
function ensureAgentsBridge(repoRoot: string): string | undefined {
  return ensureDiscoveryBridge(join(repoRoot, "AGENTS.md"), "Agent discovery bridge");
}
function ensureClaudeBridge(repoRoot: string): string | undefined {
  const destination = join(repoRoot, "CLAUDE.md");
  return ensureDiscoveryBridge(destination, "Claude Code bridge");
}
function ensureManagedFile(destination: string, packaged: string, relativePath: string, label: string): string | undefined {
  if (!existsSync(destination)) {
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, packaged);
    return;
  }
  if (!statSync(destination).isFile()) throw new Error(`cannot install ${label}: ${destination} is not a file`);
  const installed = readFileSync(destination, "utf8");
  const identity = knownIdentity(relativePath, installed);
  if (identity === "current") return `${label} already current.`;
  if (identity === "legacy") {
    writeFileSync(destination, packaged);
    return `${label} upgraded from a supported Nerv-managed version.`;
  }
  return `${label} preserved at ${destination}; ownership is not established.`;
}
function ensureDiscoveryBridge(destination: string, label: string): string | undefined {
  if (!existsSync(destination)) {
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, bridgeContent(destination.endsWith("AGENTS.md") ? "agents" : "claude"));
    return `${label} established.`;
  }
  if (!statSync(destination).isFile()) throw new Error(`cannot install ${label}: ${destination} is not a file`);
  const installed = readFileSync(destination, "utf8");
  const owned = bridgeBlock(installed);
  if (owned) {
    const expected = bridgeContent(destination.endsWith("AGENTS.md") ? "agents" : "claude");
    if (!exactSingleBridge(installed, expected)) {
      return `${label} could not be safely established at ${destination}; an ambiguous Nerv bridge was preserved.`;
    }
    return `${label} established.`;
  }
  if (installed.includes("<!-- Nerv managed discovery bridge -->") || installed.includes("<!-- End Nerv managed discovery bridge -->")) {
    return `${label} could not be safely established at ${destination}; an incomplete Nerv bridge was preserved.`;
  }
  const relativePath = destination.endsWith("AGENTS.md") ? "AGENTS.md" : "CLAUDE.md";
  const identity = relativePath === "AGENTS.md" && normalizedText(installed) === normalizedText(LEGACY_AGENTS_BRIDGE) ? "legacy" : knownIdentity(relativePath, installed);
  if (identity === "current" || identity === "legacy") {
    writeFileSync(destination, bridgeContent(destination.endsWith("AGENTS.md") ? "agents" : "claude"));
    return `${label} upgraded to an owned bridge block.`;
  }
  const separator = installed.length && !installed.endsWith("\n") && !installed.endsWith("\r") ? "\n" : "";
  writeFileSync(destination, `${installed}${separator}\n${bridgeContent(destination.endsWith("AGENTS.md") ? "agents" : "claude")}`);
  return `${label} established alongside preserved custom content.`;
}
function hasRepositorySetup(repoRoot: string): boolean {
  const paths = [".agents/skills/nerv/SKILL.md", ".nerv-context/product.md", ".nerv-context/repo.md"];
  if (paths.some((path) => existsSync(join(repoRoot, path)))) return true;
  for (const path of ["AGENTS.md", "CLAUDE.md"]) {
    const full = join(repoRoot, path);
    if (existsSync(full) && isRegularFile(full) && bridgeBlock(readFileSync(full, "utf8"))) return true;
  }
  return false;
}
function isDirectory(path: string): boolean { return existsSync(path) && statSync(path).isDirectory(); }
