import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureSharedContext } from "./workspace.js";

export function scaffoldProductContext(repoRoot: string) { return ensureSharedContext(repoRoot); }
export function writeProductContext(repoRoot: string, name: string, content: string): void { if (name !== "product.md") throw new Error("Product Context document must be product.md"); const approved = content.trim(); if (!approved) throw new Error("Product Context content must not be empty"); writeFileSync(join(repoRoot, ".nerv-context", name), `${approved}\n`, "utf8"); }
