import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
test("README provides a concise documented onboarding path", () => {
  const readme = readFileSync(resolve(root, "README.md"), "utf8");
  assert.match(readme, /npm install --global @edhutech\/nerv/);
  assert.match(readme, /Node\.js 22 and 24 LTS/);
  assert.match(readme, /intent -> Plan Preview -> approval -> execution -> review -> close/);
  assert.match(readme, /OpenCode, Codex, Cursor, and Claude Code/);
  assert.match(readme, /future dedicated documentation experience/);
  assert.doesNotMatch(readme, /docs\//);
  assert.doesNotMatch(readme, /^\*\*[^*]+\*\*$/m);
});

test("Social Preview guidance is maintainer configuration without a public tagline", () => {
  const socialPreview = readFileSync(resolve(root, ".github", "social-preview.md"), "utf8");
  assert.match(socialPreview, /Local-first work harness for coding-agent projects/);
  assert.match(socialPreview, /plan -> approve -> execute -> review -> close/);
  assert.doesNotMatch(socialPreview, /Tagline/);
  assert(!existsSync(resolve(root, "docs", "social-preview.md")));
});

test("community templates provide focused reporting routes", () => {
  const templates = ["bug.yml", "feature.yml", "agent-compatibility.yml"];
  for (const template of templates) {
    const content = readFileSync(resolve(root, ".github", "ISSUE_TEMPLATE", template), "utf8");
    assert.match(content, /^name: .+/m);
    assert.match(content, /^description: .+/m);
    assert.match(content, /^body:/m);
  }
  const config = readFileSync(resolve(root, ".github", "ISSUE_TEMPLATE", "config.yml"), "utf8");
  assert.match(config, /blank_issues_enabled: false/);
  assert.match(config, /github\.com\/edhutech\/nerv\/discussions/);
  assert.match(config, /security\/advisories\/new/);
  assert(existsSync(resolve(root, ".github", "PULL_REQUEST_TEMPLATE.md")));
  for (const file of ["CONTRIBUTING.md", "SECURITY.md", "CODE_OF_CONDUCT.md", ".github/social-preview.md"]) {
    assert(existsSync(resolve(root, file)), `${file} is missing`);
  }
});

test("publish workflow is an intentional Trusted Publishing boundary", () => {
  const publish = readFileSync(resolve(root, ".github", "workflows", "publish.yml"), "utf8");
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  assert.match(publish, /release:\s+types: \[published\]/);
  assert.doesNotMatch(publish, /^\s*push:/m);
  assert.match(publish, /runs-on: ubuntu-latest/);
  assert.match(publish, /node-version: 24\.19\.0/);
  assert.match(publish, /\[22, 14, 0\]/);
  assert.match(publish, /\[11, 5, 1\]/);
  assert.match(publish, /id-token: write/);
  assert.match(publish, /pnpm validate/);
  assert.match(publish, /pnpm test:package/);
  assert.match(publish, /npm publish --provenance/);
  assert.doesNotMatch(publish, /NPM_TOKEN/);
  assert.equal(packageJson.repository.url, "git+https://github.com/edhutech/nerv.git");
  assert.equal(packageJson.publishConfig.registry, "https://registry.npmjs.org");
  assert.match(publish, /package repository metadata must identify edhutech\/nerv/);
});

test("Dependabot covers npm dependencies and GitHub Actions", () => {
  const config = readFileSync(resolve(root, ".github", "dependabot.yml"), "utf8");
  assert.match(config, /package-ecosystem: npm/);
  assert.match(config, /package-ecosystem: github-actions/);
  assert.match(config, /interval: monthly/);
});
