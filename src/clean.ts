import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

export type CleanResult = {
  cleanedPaths: string[];
  preservedPaths: string[];
};

export function cleanWorkspace(workspaceRoot: string): CleanResult {
  const cleanedPaths: string[] = [];
  const preservedPaths: string[] = [];

  for (const generatedDir of [
    join(workspaceRoot, "agent", "runs"),
    join(workspaceRoot, "agent", "builds"),
    join(workspaceRoot, "agent", "tasks"),
  ]) {
    if (existsSync(generatedDir)) {
      for (const entry of readdirSync(generatedDir)) {
        const entryPath = join(generatedDir, entry);
        rmSync(entryPath, { recursive: true, force: true });
        cleanedPaths.push(entryPath);
      }
    } else {
      preservedPaths.push(generatedDir);
    }
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
