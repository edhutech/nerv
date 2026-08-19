export const FINDING_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];
export type ReviewFinding = { severity: FindingSeverity; issue: string; pass_impact: string; evidence: string; affected_work_criterion: string; medium_residual_risk_decision?: string; accepted_as_residual_risk?: boolean };

export function parseReviewFindings(value?: string): ReviewFinding[] {
  if (!value?.trim()) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("--findings must be a JSON array of structured findings."); }
  if (!Array.isArray(parsed) || !parsed.length) throw new Error("--findings must be a non-empty JSON array when supplied.");
  return parsed.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("Each Review finding must be an object.");
    const finding = entry as Record<string, unknown>;
    const required = ["issue", "pass_impact", "evidence", "affected_work_criterion"] as const;
    if (!FINDING_SEVERITIES.includes(String(finding.severity) as FindingSeverity) || required.some((field) => typeof finding[field] !== "string" || !(finding[field] as string).trim())) {
      throw new Error(`Each Review finding requires severity (${FINDING_SEVERITIES.join(", ")}) and non-empty finding fields: ${required.join(", ")}.`);
    }
    if (finding.medium_residual_risk_decision !== undefined && (typeof finding.medium_residual_risk_decision !== "string" || !finding.medium_residual_risk_decision.trim())) throw new Error("medium_residual_risk_decision must be non-empty when supplied.");
    if (finding.severity === "medium" && finding.medium_residual_risk_decision === undefined) throw new Error("Medium findings require medium_residual_risk_decision.");
    if (finding.accepted_as_residual_risk !== undefined && typeof finding.accepted_as_residual_risk !== "boolean") throw new Error("accepted_as_residual_risk must be boolean when supplied.");
    if (finding.accepted_as_residual_risk && finding.severity !== "medium") throw new Error("Only medium findings may be accepted as residual risk.");
    return {
      severity: finding.severity as FindingSeverity,
      issue: (finding.issue as string).trim(),
      pass_impact: (finding.pass_impact as string).trim(),
      evidence: (finding.evidence as string).trim(),
      affected_work_criterion: (finding.affected_work_criterion as string).trim(),
      ...(finding.medium_residual_risk_decision === undefined ? {} : { medium_residual_risk_decision: (finding.medium_residual_risk_decision as string).trim() }),
      ...(finding.accepted_as_residual_risk === undefined ? {} : { accepted_as_residual_risk: finding.accepted_as_residual_risk as boolean }),
    };
  });
}
