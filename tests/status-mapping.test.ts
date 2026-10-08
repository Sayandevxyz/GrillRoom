import { describe, it, expect } from "vitest";
import { mapClaimStatus, humanizeCategory } from "../lib/engine/status-mapping";

describe("Due Diligence Ledger Status Mapping", () => {
  it("maps contradicted status to danger Contradiction", () => {
    const result = mapClaimStatus({ status: "contradicted" });
    expect(result.status).toBe("contradiction");
    expect(result.label).toBe("Contradiction");
    expect(result.variant).toBe("danger");
  });

  it("maps evidenced status with score >= 8 to success Verified", () => {
    const result = mapClaimStatus({ status: "evidenced", evidence_score: 9 });
    expect(result.status).toBe("verified");
    expect(result.label).toBe("Verified");
    expect(result.variant).toBe("verified");
    expect(result.tooltip).toContain("Supported by a source or method");
  });

  it("maps evidenced status with score < 8 to info Strong Claim", () => {
    const result = mapClaimStatus({ status: "evidenced", evidence_score: 7 });
    expect(result.status).toBe("strong_claim");
    expect(result.label).toBe("Strong Claim");
    expect(result.variant).toBe("strong");
  });

  it("maps unverified status with followups >= 1 to warning Needs Evidence", () => {
    const result = mapClaimStatus({ status: "unverified", followups_used: 1 });
    expect(result.status).toBe("needs_evidence");
    expect(result.label).toBe("Needs Evidence");
    expect(result.variant).toBe("warning");
  });

  it("maps conceded status to warning Needs Evidence", () => {
    const result = mapClaimStatus({ status: "conceded" });
    expect(result.status).toBe("needs_evidence");
    expect(result.label).toBe("Needs Evidence");
    expect(result.variant).toBe("warning");
  });

  it("maps base unverified status to neutral Unverified", () => {
    const result = mapClaimStatus({ status: "unverified", followups_used: 0 });
    expect(result.status).toBe("unverified");
    expect(result.label).toBe("Unverified");
    expect(result.variant).toBe("neutral");
  });

  it("humanizes raw categories properly", () => {
    expect(humanizeCategory("financial")).toBe("Unit Economics");
    expect(humanizeCategory("traction")).toBe("Customer Traction");
    expect(humanizeCategory("moat")).toBe("Defensibility & Moat");
    expect(humanizeCategory("revenue_model")).toBe("Revenue Model");
  });
});
