import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

export type CleanResult = {
  cleanedPaths: string[];
  preservedPaths: string[];
};

export function cleanWorkspace(workspaceRoot: string): CleanResult {
  const cleanedPaths: string[] = [];
  const preservedPaths: string[] = [];
  const agentRoot = join(workspaceRoot, "agent");
  const preservedGeneratedDirs = new Set(["runs", "builds", "tasks"]);

  if (existsSync(agentRoot)) {
    for (const entry of readdirSync(agentRoot)) {
      const entryPath = join(agentRoot, entry);

      if (preservedGeneratedDirs.has(entry)) {
        for (const childEntry of readdirSync(entryPath)) {
          const childPath = join(entryPath, childEntry);
          rmSync(childPath, { recursive: true, force: true });
          cleanedPaths.push(childPath);
        }
      } else {
        rmSync(entryPath, { recursive: true, force: true });
        cleanedPaths.push(entryPath);
      }
    }
  } else {
    preservedPaths.push(agentRoot);
  }

  const productDir = join(workspaceRoot, "product");
  if (existsSync(productDir)) {
    preservedPaths.push(productDir);
  }

  const repoDir = join(workspaceRoot, "repo");
  if (existsSync(repoDir)) {
    preservedPaths.push(repoDir);
  }

  const databasePath = join(workspaceRoot, "nerv.db");
  if (existsSync(databasePath)) {
    preservedPaths.push(databasePath);
  }

  return {
    cleanedPaths,
    preservedPaths,
  };
}
