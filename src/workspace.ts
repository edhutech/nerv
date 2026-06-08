import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";

import { hasRequiredSchema, initializeDatabase } from "./database.js";

const WORKSPACE_DIRECTORY = ".nerv";

const REQUIRED_SUBDIRECTORIES = [
  WORKSPACE_DIRECTORY,
  join(WORKSPACE_DIRECTORY, "product"),
  join(WORKSPACE_DIRECTORY, "repo"),
  join(WORKSPACE_DIRECTORY, "agent"),
  join(WORKSPACE_DIRECTORY, "agent", "runs"),
  join(WORKSPACE_DIRECTORY, "agent", "builds"),
] as const;

export type WorkspaceStatus = {
  repoRoot: string | null;
  workspaceRoot: string | null;
  databasePath: string | null;
  initialized: boolean;
};

export function findRepoRoot(startDirectory: string): string | null {
  let currentDirectory = resolve(startDirectory);

  while (true) {
    if (existsSync(join(currentDirectory, ".git"))) {
      return currentDirectory;
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory || currentDirectory === parse(currentDirectory).root) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

export function getWorkspaceStatus(startDirectory: string): WorkspaceStatus {
  const repoRoot = findRepoRoot(startDirectory);

  if (repoRoot === null) {
    return {
      repoRoot: null,
      workspaceRoot: null,
      databasePath: null,
      initialized: false,
    };
  }

  const workspaceRoot = join(repoRoot, WORKSPACE_DIRECTORY);
  const databasePath = join(workspaceRoot, "nerv.db");

  return {
    repoRoot,
    workspaceRoot,
    databasePath,
    initialized: isWorkspaceInitialized(repoRoot),
  };
}

export function ensureWorkspace(repoRoot: string): WorkspaceStatus {
  for (const relativeDirectory of REQUIRED_SUBDIRECTORIES) {
    mkdirSync(join(repoRoot, relativeDirectory), { recursive: true });
  }

  const workspaceRoot = join(repoRoot, WORKSPACE_DIRECTORY);
  const databasePath = join(workspaceRoot, "nerv.db");
  initializeDatabase(databasePath);

  return {
    repoRoot,
    workspaceRoot,
    databasePath,
    initialized: true,
  };
}

function isWorkspaceInitialized(repoRoot: string): boolean {
  for (const relativeDirectory of REQUIRED_SUBDIRECTORIES) {
    const directoryPath = join(repoRoot, relativeDirectory);
    if (!isDirectory(directoryPath)) {
      return false;
    }
  }

  const databasePath = join(repoRoot, WORKSPACE_DIRECTORY, "nerv.db");

  return isFile(databasePath) && hasRequiredSchema(databasePath);
}

function isDirectory(path: string): boolean {
  if (!existsSync(path)) {
    return false;
  }

  return statSync(path).isDirectory();
}

function isFile(path: string): boolean {
  if (!existsSync(path)) {
    return false;
  }

  return statSync(path).isFile();
}
