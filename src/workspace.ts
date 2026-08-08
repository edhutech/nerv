import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { hasRequiredSchema, initializeDatabase } from "./database.js";

const DIRS = [".nerv", ".nerv/product", ".nerv/repo", ".nerv/agent", ".nerv/agent/active"] as const;
export type WorkspaceStatus = { repoRoot: string | null; workspaceRoot: string | null; databasePath: string | null; initialized: boolean };

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
export function ensureWorkspace(repoRoot: string): WorkspaceStatus {
  const databasePath = join(repoRoot, ".nerv", "nerv.db");
  if (existsSync(databasePath) && !hasRequiredSchema(databasePath)) throw new Error("existing .nerv/nerv.db is not a vNext Nerv database; remove generated .nerv state and run `nerv init` again");
  for (const dir of DIRS) mkdirSync(join(repoRoot, dir), { recursive: true });
  initializeDatabase(databasePath);
  return { repoRoot, workspaceRoot: join(repoRoot, ".nerv"), databasePath, initialized: true };
}
function isDirectory(path: string): boolean { return existsSync(path) && statSync(path).isDirectory(); }
