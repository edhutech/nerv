import { existsSync } from "node:fs";
import { join } from "node:path";
import { openRepository } from "./repository.js";

const PRODUCT_FILES = ["product.md", "problem.md", "users.md", "prd.md", "roadmap.md", "scope.md", "decisions.md", "architecture.md", "evolution.md"];
export function discoverContext(repoRoot: string, workspaceRoot: string, databasePath: string) { const repository = openRepository(databasePath); try { return { product: PRODUCT_FILES.filter((file) => existsSync(join(repoRoot, ".nerv-context", "product", file))), repo: existsSync(join(repoRoot, ".nerv-context", "repo", "facts.md")), localRepo: existsSync(join(workspaceRoot, "repo", "development.md")), productUpdatedAt: repository.getMetadata("product_context_updated_at"), repoUpdatedAt: repository.getMetadata("repo_context_updated_at") }; } finally { repository.close(); } }
