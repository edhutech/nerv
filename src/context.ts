import { existsSync } from "node:fs";
import { join } from "node:path";
import { openRepository } from "./repository.js";

export function discoverContext(repoRoot: string, workspaceRoot: string, databasePath: string) { const repository = openRepository(databasePath); try { return { product: existsSync(join(repoRoot, ".nerv-context", "product.md")), repo: existsSync(join(repoRoot, ".nerv-context", "repo.md")), localRepo: existsSync(join(workspaceRoot, "repo", "development.md")), productUpdatedAt: repository.getMetadata("product_context_updated_at"), repoUpdatedAt: repository.getMetadata("repo_context_updated_at") }; } finally { repository.close(); } }
