import { existsSync } from "node:fs";
import { join } from "node:path";

export function discoverContext(repoRoot: string) { return { product: existsSync(join(repoRoot, ".nerv-context", "product.md")), repo: existsSync(join(repoRoot, ".nerv-context", "repo.md")) }; }
