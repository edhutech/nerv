import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CANONICAL_CONTEXT_SCAFFOLDS } from "./workspace.js";

export type ContextState = "missing" | "scaffold" | "established";

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function contextState(path: string, scaffold: string): ContextState {
  if (!existsSync(path)) return "missing";
  return normalize(readFileSync(path, "utf8")) === normalize(scaffold) ? "scaffold" : "established";
}

export function discoverContext(repoRoot: string) {
  return {
    product: contextState(join(repoRoot, ".nerv-context", "product.md"), CANONICAL_CONTEXT_SCAFFOLDS.product),
    repo: contextState(join(repoRoot, ".nerv-context", "repo.md"), CANONICAL_CONTEXT_SCAFFOLDS.repo),
  };
}
