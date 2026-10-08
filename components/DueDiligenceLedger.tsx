"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { mapClaimStatus, humanizeCategory } from "@/lib/engine/status-mapping";
import { ChevronDown, ChevronUp, AlertOctagon } from "lucide-react";

export interface LedgerClaimItem {
  id: number;
  claim_text: string;
  category: string;
  status: string;
  source_turn: number;
  followups_used?: number;
  evidence_score?: number;
  last_asked_by?: string | null;
}

export interface DueDiligenceLedgerProps {
  claims: LedgerClaimItem[];
  className?: string;
}

/**
 * Due Diligence Ledger component displaying extracted claims,
 * rigorous status mappings, filter tabs, and expandable exchange details.
 */
export const DueDiligenceLedger: React.FC<DueDiligenceLedgerProps> = ({
  claims,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Derive status details for all claims
  const processedClaims = claims.map((claim, idx) => ({
    ...claim,
    displayId: `DD-${String(idx + 1).padStart(2, "0")}`,
    mapped: mapClaimStatus(claim),
    humanCategory: humanizeCategory(claim.category),
  }));

  // Counts following claim status:
  // Unverified and Contradicted count as Needs Proof / Needs Attention
  // Evidenced counts as Verified
  // Total = all claims
  const verifiedCount = processedClaims.filter(
    (c) => c.status === "evidenced" || c.mapped.status === "verified" || c.mapped.status === "strong_claim"
  ).length;

  const needsAttentionCount = processedClaims.filter(
    (c) =>
      c.status === "unverified" ||
      c.status === "contradicted" ||
      c.status === "conceded" ||
      c.mapped.status === "unverified" ||
      c.mapped.status === "needs_evidence" ||
      c.mapped.status === "contradiction"
  ).length;

  const contradictionCount = processedClaims.filter(
    (c) => c.status === "contradicted" || c.mapped.status === "contradiction"
  ).length;

  const tabs: TabItem[] = [
    { id: "all", label: "All Claims", count: processedClaims.length },
    { id: "attention", label: "Needs Attention", count: needsAttentionCount },
    { id: "verified", label: "Verified", count: verifiedCount },
  ];

  const filteredClaims = processedClaims.filter((claim) => {
    if (activeTab === "attention") {
      return (
        claim.status === "unverified" ||
        claim.status === "contradicted" ||
        claim.status === "conceded" ||
        claim.mapped.status === "unverified" ||
        claim.mapped.status === "needs_evidence" ||
        claim.mapped.status === "contradiction"
      );
    }
    if (activeTab === "verified") {
      return (
        claim.status === "evidenced" ||
        claim.mapped.status === "verified" ||
        claim.mapped.status === "strong_claim"
      );
    }
    return true;
  });

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Card goldTopRule={true} className={`p-5 flex flex-col ${className}`}>
      {/* Ledger Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark block">
            Diligence Audit
          </span>
          {contradictionCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-danger bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              <AlertOctagon className="w-3 h-3" aria-hidden="true" />
              <span>{contradictionCount} contradiction{contradictionCount > 1 ? "s" : ""}</span>
            </span>
          )}
        </div>
        <h2 className="text-base font-serif font-bold text-navy mt-0.5">
          Due Diligence Ledger
        </h2>
        <p className="text-xs text-text-2">
          Every assertion is extracted and cross-referenced in real-time.
        </p>
      </div>

      {/* Status Summary Bar */}
      <div className="grid grid-cols-3 gap-2 pb-3 mb-3 border-b border-border text-center">
        <div className="p-2 rounded-field bg-slate-50 border border-border">
          <span className="text-[10px] uppercase font-bold text-text-2 block">Total Claims</span>
          <span className="text-sm font-bold font-sans tabular-nums text-navy">{processedClaims.length}</span>
        </div>
        <div className={`p-2 rounded-field border ${needsAttentionCount > 0 ? "bg-amber-50/50 border-amber-200" : "bg-slate-50 border-border"}`}>
          <span className="text-[10px] uppercase font-bold text-text-2 block">Needs Proof</span>
          <span className={`text-sm font-bold font-sans tabular-nums ${needsAttentionCount > 0 ? "text-warning" : "text-text"}`}>
            {needsAttentionCount}
          </span>
        </div>
        <div className="p-2 rounded-field bg-green-50/40 border border-green-200/80">
          <span className="text-[10px] uppercase font-bold text-text-2 block">Verified</span>
          <span className="text-sm font-bold font-sans tabular-nums text-success">{verifiedCount}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-3" />

      {/* Claims List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[520px] pr-1">
        {filteredClaims.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-field bg-surface-2/40">
            <p className="text-xs text-text-2 font-medium">
              No claims recorded yet. They appear here as you speak.
            </p>
          </div>
        ) : (
          filteredClaims.map((claim) => {
            const isExpanded = expandedId === claim.id;

            return (
              <div
                key={claim.id}
                className={`p-3 rounded-field border transition-subtle bg-white ${
                  claim.mapped.status === "contradiction"
                    ? "border-red-300 bg-red-50/10"
                    : "border-border hover:border-slate-300"
                }`}
              >
                <div
                  className="cursor-pointer"
                  onClick={() => toggleExpand(claim.id)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-navy">
                        {claim.displayId}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-text-2">
                        {claim.humanCategory}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Chip
                        variant={claim.mapped.variant}
                        size="sm"
                        label={claim.mapped.label}
                        title={claim.mapped.tooltip}
                      />
                      <button
                        type="button"
                        className="text-text-2 hover:text-text p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info"
                        aria-label={isExpanded ? "Collapse claim details" : "Expand claim details"}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-text font-medium leading-relaxed">
                    {claim.claim_text}
                  </p>
                </div>

                {/* Expandable Exchange Detail */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-border/80 text-[11px] text-text-2 space-y-1 bg-surface-2/40 -mx-3 -mb-3 p-3 rounded-b-field animate-in fade-in duration-100">
                    <p>
                      <strong>Origin:</strong> Exchange {claim.source_turn + 1}
                    </p>
                    <p>
                      <strong>Status Details:</strong> {claim.mapped.tooltip}
                    </p>
                    {claim.last_asked_by && (
                      <p>
                        <strong>Last Questioned By:</strong> {claim.last_asked_by}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
