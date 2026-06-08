import { existsSync } from "node:fs";
import { join } from "node:path";

import { openRepository } from "./repository.js";

export type ProductContextFile = {
  name: string;
  exists: boolean;
};

export type ContextAvailability = {
  productContext: {
    available: boolean;
    files: ProductContextFile[];
    updatedAt: string | null;
  };
  repoContext: {
    available: boolean;
    updatedAt: string | null;
  };
};

const PRODUCT_FILE_NAMES = [
  "product.md",
  "problem.md",
  "users.md",
  "prd.md",
  "roadmap.md",
  "scope.md",
  "decisions.md",
  "architecture.md",
  "evolution.md",
] as const;

export function discoverContext(workspaceRoot: string, databasePath: string): ContextAvailability {
  const productDir = join(workspaceRoot, "product");
  const repoDir = join(workspaceRoot, "repo");

  const productFiles: ProductContextFile[] = PRODUCT_FILE_NAMES.map((name) => ({
    name,
    exists: existsSync(join(productDir, name)),
  }));

  const productContextAvailable = productFiles.some((file) => file.exists);
  const repoContextPath = join(repoDir, "development.md");
  const repoContextAvailable = existsSync(repoContextPath);

  const repository = openRepository(databasePath);

  try {
    const productUpdatedAt = repository.getMetadata("product_context_updated_at");
    const repoUpdatedAt = repository.getMetadata("repo_context_updated_at");

    return {
      productContext: {
        available: productContextAvailable,
        files: productFiles,
        updatedAt: productUpdatedAt,
      },
      repoContext: {
        available: repoContextAvailable,
        updatedAt: repoUpdatedAt,
      },
    };
  } finally {
    repository.close();
  }
}
