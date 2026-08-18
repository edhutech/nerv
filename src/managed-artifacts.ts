import { createHash } from "node:crypto";

export const NERV_BRIDGE_START = "<!-- Nerv managed discovery bridge -->";
export const NERV_BRIDGE_END = "<!-- End Nerv managed discovery bridge -->";

export function normalizedText(value: string): string {
  return value.replaceAll("\r\n", "\n");
}

export function textIdentity(value: string): string {
  return createHash("sha256").update(normalizedText(value)).digest("hex");
}

// Legacy entries are supported public release boundaries, not arbitrary Git revisions.
export const MANAGED_IDENTITIES: Record<string, { current: string; legacy: readonly string[] }> = {
  ".agents/skills/nerv/SKILL.md": {
    current: "b47dc934bfabc0124b19f1d3c5ef0ef237ddc67a37e85e97b699d54d3601c416",
    legacy: ["cdd6d96370ce7e6af5af627249c694478ac0115d816e5909079a790d7fc126bd"],
  },
  "CLAUDE.md": { current: "08c99e7cb82cc9a0520a8b3195f9583f6acc0089c6e84340fb36e5be0e4dbff5", legacy: ["baf0ecc33ac0416d1cabf88d3c3b63b06695722fe3a144c8bd9f99c64e08a26f"] },
  ".nerv-context/product.md": { current: "ef4d149f378d4150ebde1f71fb5e6c0a66d522c49625d82e3abd0a61c70baa7b", legacy: ["a660b357f7d9f1c49287be3593fc0de20b5b74001c1b00f32b8921bcf173dab9"] },
  ".nerv-context/repo.md": { current: "26936e8a8f05229211ccb8e628dd248aea03392ec6044a6bf657fd6fc3e41606", legacy: ["f389dfa64649f6f315eed16805bf06ea09ca5fb1179c214fba35acef8680712d"] },
};

export function knownIdentity(relativePath: string, content: string): "current" | "legacy" | "unknown" {
  const policy = MANAGED_IDENTITIES[relativePath];
  const identity = textIdentity(content);
  if (!policy) return "unknown";
  if (identity === policy.current) return "current";
  if (policy.legacy.includes(identity)) return "legacy";
  return "unknown";
}

export function bridgeContent(kind: "agents" | "claude"): string {
  const body = kind === "agents"
    ? "For Nerv-governed work, read `.agents/skills/nerv/SKILL.md` and follow it."
    : "# Claude Code\n\nFollow `AGENTS.md` when it exists.\n\nFor Nerv-governed work, read `.agents/skills/nerv/SKILL.md` and follow it.";
  return `${NERV_BRIDGE_START}\n${body}\n${NERV_BRIDGE_END}\n`;
}

export function bridgeBlock(content: string): string | null {
  const start = content.indexOf(NERV_BRIDGE_START);
  if (start < 0) return null;
  const end = content.indexOf(NERV_BRIDGE_END, start);
  if (end < 0) return null;
  return content.slice(start, end + NERV_BRIDGE_END.length) + (content[end + NERV_BRIDGE_END.length] === "\r" ? "\r\n" : "\n");
}

export function exactSingleBridge(content: string, expected: string): boolean {
  const openings = content.split(NERV_BRIDGE_START).length - 1;
  const closings = content.split(NERV_BRIDGE_END).length - 1;
  const block = bridgeBlock(content);
  return openings === 1 && closings === 1 && block !== null && normalizedText(block) === normalizedText(expected);
}
