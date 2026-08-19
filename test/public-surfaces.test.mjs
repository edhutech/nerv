import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
test("README provides a concise documented onboarding path", () => {
  const readme = readFileSync(resolve(root, "README.md"), "utf8");
  assert.match(readme, /Nerv is currently in public alpha/);
  assert.match(readme, /npm install --global @edhutech\/nerv\n/);
  assert.doesNotMatch(readme, /npm install --global @edhutech\/nerv@alpha/);
  assert.match(readme, /newest public `0\.x` release is the primary Public Alpha release/);
  assert.match(readme, /nerv uninstall/);
  assert.match(readme, /npm uninstall -g @edhutech\/nerv/);
   assert.match(readme, /Node\.js `>=22\.14\.0 <23` or `>=24\.11\.0 <25`/);
   assert.match(readme, /git add \.agents\/skills\/nerv\/SKILL\.md \.nerv-context\/product\.md \.nerv-context\/repo\.md/);
   assert.doesNotMatch(readme, /git add AGENTS\.md CLAUDE\.md/);
  assert.match(readme, /request -> Plan -> approve -> automatic execution -> review -> close/);
  assert.match(readme, /hands off `review`/);
  assert.match(readme, /W-` plus 16 uppercase hexadecimal characters deterministically derived from the Work UUID/);
  assert.doesNotMatch(readme, /UUID hex characters/);
  assert.match(readme, /OpenCode, Codex, Cursor, and Claude Code/);
  assert.match(readme, /future dedicated documentation experience/);
  assert.doesNotMatch(readme, /docs\//);
  assert.doesNotMatch(readme, /^\*\*[^*]+\*\*$/m);
});

test("Social Preview guidance is maintainer configuration without a public tagline", () => {
  const socialPreview = readFileSync(resolve(root, ".github", "social-preview.md"), "utf8");
  assert.match(socialPreview, /Local-first work harness for coding-agent projects/);
  assert.match(socialPreview, /request -> Plan -> approve -> automatic execution -> review -> close/);
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
  assert.match(config, /GitHub Private Vulnerability Reporting/);
  const security = readFileSync(resolve(root, "SECURITY.md"), "utf8");
  const conduct = readFileSync(resolve(root, "CODE_OF_CONDUCT.md"), "utf8");
  assert.match(security, /GitHub Private Vulnerability Reporting/);
  assert.match(conduct, /nerv-conduct@edhutech\.com/);
  assert.match(conduct, /Do not submit reports through public GitHub Issues or Discussions/);
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
  assert.match(publish, /npm publish --provenance --tag latest/);
  assert.doesNotMatch(publish, /npm publish --provenance --tag alpha/);
  assert.doesNotMatch(publish, /NPM_TOKEN/);
  assert.equal(packageJson.repository.url, "git+https://github.com/edhutech/nerv.git");
  assert.equal(packageJson.publishConfig.registry, "https://registry.npmjs.org");
  assert.equal(packageJson.author, "Edhú Nuñez Alvarado");
  assert.equal(readFileSync(resolve(root, "NOTICE"), "utf8"), "Nerv\nCopyright 2026 Edhú Nuñez Alvarado\n");
  assert.match(publish, /package repository metadata must identify edhutech\/nerv/);
  assert.equal(packageJson.version, "0.3.0");
  assert(publish.includes('test "$(node -p \'require("./package.json").version\')" = "${GITHUB_REF_NAME#v}"'), "publish workflow must fail closed on release/tag and package version mismatch");
});

test("Dependabot covers npm dependencies and GitHub Actions", () => {
  const config = readFileSync(resolve(root, ".github", "dependabot.yml"), "utf8");
  assert.match(config, /package-ecosystem: npm/);
  assert.match(config, /package-ecosystem: github-actions/);
  assert.match(config, /interval: monthly/);
});
