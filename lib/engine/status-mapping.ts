export type MappedClaimStatus =
  | "contradiction"
  | "verified"
  | "strong_claim"
  | "needs_evidence"
  | "unverified";

export interface ClaimStatusInput {
  status: "unverified" | "evidenced" | "contradicted" | "conceded" | string;
  followups_used?: number;
  evidence_score?: number;
}

export interface MappedStatusOutput {
  status: MappedClaimStatus;
  label: string;
  variant: "verified" | "strong" | "warning" | "danger" | "neutral";
  tooltip: string;
}

/**
 * Derives the Due Diligence Ledger status according to executive diligence rules:
 * - Contradiction: status = 'contradicted'
 * - Verified: status = 'evidenced' AND evidence_score >= 8
 * - Strong Claim: status = 'evidenced' with evidence_score < 8
 * - Needs Evidence: unverified with followups_used >= 1, OR status = 'conceded'
 * - Unverified: all remaining unverified claims
 */
export function mapClaimStatus(claim: ClaimStatusInput): MappedStatusOutput {
  if (claim.status === "contradicted") {
    return {
      status: "contradiction",
      label: "Contradiction",
      variant: "danger",
      tooltip: "Conflicting metrics or mutually exclusive assertions detected.",
    };
  }

  if (claim.status === "evidenced") {
    const score = claim.evidence_score ?? 8; // Default to verified if evidenced without score breakdown
    if (score >= 8) {
      return {
        status: "verified",
        label: "Verified",
        variant: "verified",
        tooltip:
          "Supported by a source or method you provided. Not independently checked.",
      };
    }
    return {
      status: "strong_claim",
      label: "Strong Claim",
      variant: "strong",
      tooltip: "Plausible assertion supported by anecdotal context or early indicators.",
    };
  }

  if ((claim.followups_used && claim.followups_used >= 1) || claim.status === "conceded") {
    return {
      status: "needs_evidence",
      label: "Needs Evidence",
      variant: "warning",
      tooltip: "Questioned by the panel but lacking verifiable data or operational proof.",
    };
  }

  return {
    status: "unverified",
    label: "Unverified",
    variant: "neutral",
    tooltip: "Uncorroborated premise awaiting quantitative diligence.",
  };
}

/**
 * Humanizes raw backend category strings into clean executive terminology.
 */
export function humanizeCategory(category: string): string {
  const map: Record<string, string> = {
    financial: "Unit Economics",
    economics: "Unit Economics",
    traction: "Customer Traction",
    technical: "Defensibility & Tech",
    moat: "Defensibility & Moat",
    market: "Market & TAM",
    team: "Execution & Team",
    product: "Product Strategy",
    ask: "Deal Terms & Ask",
    problem: "Problem & Urgency",
  };

  return map[category.toLowerCase()] || category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
