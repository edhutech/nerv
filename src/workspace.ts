import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { hasRequiredSchema, initializeDatabase } from "./database.js";

const DIRS = [".nerv", ".nerv/repo", ".nerv/agent", ".nerv/agent/active"] as const;
const SKILL_HASH_MARKER = /^nerv_managed_sha256: "([a-f0-9]{64})"$/m;
const LEGACY_PUBLIC_SKILL_HASHES = new Set(["638ef1586304c2e803be712bd8b97894b72bcaacba0b9cab1c84e77fb9e50aa8"]);
export type WorkspaceStatus = { repoRoot: string | null; workspaceRoot: string | null; databasePath: string | null; initialized: boolean };
type SkillSync = { status: "installed" | "current" | "updated" | "preserved"; message?: string };

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
export function ensureWorkspace(repoRoot: string): WorkspaceStatus & { skillSync: SkillSync } {
  const databasePath = join(repoRoot, ".nerv", "nerv.db");
  if (existsSync(databasePath) && !hasRequiredSchema(databasePath)) throw new Error("existing .nerv/nerv.db is not a vNext Nerv database; remove generated .nerv state and run `nerv init` again");
  for (const dir of DIRS) mkdirSync(join(repoRoot, dir), { recursive: true });
  initializeDatabase(databasePath);
  ensureGitIgnore(repoRoot);
  const skillSync = ensurePublicSkill(repoRoot);
  return { repoRoot, workspaceRoot: join(repoRoot, ".nerv"), databasePath, initialized: true, skillSync };
}
function ensureGitIgnore(repoRoot: string): void {
  const path = join(repoRoot, ".gitignore");
  if (!existsSync(path)) {
    writeFileSync(path, ".nerv/\n");
    return;
  }
  const content = readFileSync(path, "utf8");
  if (content.split(/\r?\n/).some((line) => [".nerv", ".nerv/", "/.nerv", "/.nerv/"].includes(line.trim()))) return;
  appendFileSync(path, `${content.endsWith("\n") || content.length === 0 ? "" : "\n"}.nerv/\n`);
}
function ensurePublicSkill(repoRoot: string): SkillSync {
  const destination = join(repoRoot, ".agents", "skills", "nerv", "SKILL.md");
  const packaged = readFileSync(new URL("../.agents/skills/nerv/SKILL.md", import.meta.url), "utf8");
  if (!isManagedSkill(packaged)) throw new Error("packaged public Nerv skill has an invalid managed content hash");
  if (!existsSync(destination)) {
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, packaged);
    return { status: "installed" };
  }
  if (!statSync(destination).isFile()) throw new Error(`cannot install public Nerv skill: ${destination} is not a file`);
  const installed = readFileSync(destination, "utf8");
  if (installed === packaged) return { status: "current" };
  if (isManagedSkill(installed) || LEGACY_PUBLIC_SKILL_HASHES.has(contentHash(installed))) {
    writeFileSync(destination, packaged);
    return { status: "updated" };
  }
  return { status: "preserved", message: `Public Nerv skill preserved at ${destination}: it is not a recognized unmodified Nerv-managed copy. Review its changes and replace it manually to update.` };
}
function isManagedSkill(content: string): boolean {
  const marker = content.match(SKILL_HASH_MARKER);
  return marker !== null && marker[1] === contentHash(content.replace(marker[0], "nerv_managed_sha256: \"\""));
}
function contentHash(content: string): string { return createHash("sha256").update(content).digest("hex"); }
function isDirectory(path: string): boolean { return existsSync(path) && statSync(path).isDirectory(); }
