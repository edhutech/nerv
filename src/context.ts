import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { openRepository } from "./repository.js";

export type SharedKnowledge = { ref: string; title: string; content: string };
export function discoverContext(repoRoot: string, workspaceRoot: string, databasePath: string) { const repository = openRepository(databasePath); try { return { product: existsSync(join(repoRoot, ".nerv-context", "product.md")), repo: existsSync(join(repoRoot, ".nerv-context", "repo.md")), localRepo: existsSync(join(workspaceRoot, "repo", "development.md")), productUpdatedAt: repository.getMetadata("product_context_updated_at"), repoUpdatedAt: repository.getMetadata("repo_context_updated_at") }; } finally { repository.close(); } }
export function searchSharedKnowledge(repoRoot: string, query: string): SharedKnowledge[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return sharedKnowledge(repoRoot).map((item) => ({ item, score: terms.reduce((score, term) => score + (item.title.toLowerCase().includes(term) ? 2 : 0) + (item.content.toLowerCase().includes(term) ? 1 : 0), 0) })).filter(({ score }) => score > 0).sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title)).slice(0, 10).map(({ item }) => item);
}
export function getSharedKnowledge(repoRoot: string, ref: string): SharedKnowledge | null { return sharedKnowledge(repoRoot).find((item) => item.ref === ref) ?? null; }
function sharedKnowledge(repoRoot: string): SharedKnowledge[] {
  const directory = join(repoRoot, ".nerv-context", "knowledge");
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => {
    const content = readFileSync(join(directory, entry.name), "utf8").trim();
    const title = /^#\s+(.+)$/m.exec(content)?.[1]?.trim() || basename(entry.name, ".md");
    return { ref: `shared:${basename(entry.name, ".md")}`, title, content };
  });
}
