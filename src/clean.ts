import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export type CleanResult = {
  cleanedPaths: string[];
  preservedPaths: string[];
};

export function cleanWorkspace(workspaceRoot: string): CleanResult {
  const cleanedPaths: string[] = [];
  const preservedPaths: string[] = [];

  const agentRunsDir = join(workspaceRoot, "agent", "runs");
  const agentBuildsDir = join(workspaceRoot, "agent", "builds");

  if (existsSync(agentRunsDir)) {
    const runEntries = readdirSync(agentRunsDir);
    for (const entry of runEntries) {
      const entryPath = join(agentRunsDir, entry);
      if (statSync(entryPath).isDirectory()) {
        rmSync(entryPath, { recursive: true, force: true });
        cleanedPaths.push(entryPath);
      }
    }
  } else {
    preservedPaths.push(agentRunsDir);
  }

  if (existsSync(agentBuildsDir)) {
    const buildEntries = readdirSync(agentBuildsDir);
    for (const entry of buildEntries) {
      const entryPath = join(agentBuildsDir, entry);
      if (statSync(entryPath).isDirectory()) {
        rmSync(entryPath, { recursive: true, force: true });
        cleanedPaths.push(entryPath);
      }
    }
  } else {
    preservedPaths.push(agentBuildsDir);
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
