import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILES: Array<[string, string]> = [
  ["product.md", "# Product\n\n## What is this product?\n\nDescribe the product and its core value.\n"],
  ["problem.md", "# Problem\n\n## Problem\n\nDescribe the developer problem this product solves.\n"],
  ["users.md", "# Users\n\n## Users\n\nDescribe the intended users.\n"],
  ["prd.md", "# Product Requirements\n\n## Requirements\n\nDescribe the minimum useful outcomes.\n"],
  ["roadmap.md", "# Roadmap\n\n## Current priorities\n\nRecord current priorities.\n"],
  ["scope.md", "# Scope\n\n## In scope\n\nRecord product boundaries.\n"],
  ["decisions.md", "# Decisions\n\n## Decision log\n\nRecord durable decisions.\n"],
  ["architecture.md", "# Architecture\n\n## System overview\n\nRecord durable architecture truth.\n"],
  ["evolution.md", "# Evolution\n\n## Product evolution\n\nRecord meaningful product changes.\n"],
];
export function scaffoldProductContext(workspaceRoot: string) {
  const directory = join(workspaceRoot, "product"); mkdirSync(directory, { recursive: true });
  const created: string[] = []; const preserved: string[] = [];
  for (const [name, content] of FILES) {
    const path = join(directory, name);
    if (existsSync(path)) preserved.push(name); else { writeFileSync(path, content, "utf8"); created.push(name); }
  }
  return { created, preserved };
}
