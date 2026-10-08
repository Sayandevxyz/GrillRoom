import React from "react";
import { Card } from "@/components/ui/Card";
import { Users, FileText, CheckCircle2, Award } from "lucide-react";

export const PitchRulesSidebar: React.FC = () => {
  return (
    <div className="lg:col-span-5 flex flex-col">
      <Card goldTopRule={true} className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-6">
        <div className="space-y-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark block mb-1">
              Deliverables
            </span>
            <h2 className="text-xl font-serif font-bold text-navy">
              What Happens in the Room
            </h2>
          </div>

          <ul className="space-y-3.5 text-xs text-text leading-relaxed">
            <li className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-cta flex-shrink-0" aria-hidden="true" />
              <span className="font-semibold text-navy">Live investor panel</span>
            </li>
            <li className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-cta flex-shrink-0" aria-hidden="true" />
              <span className="font-semibold text-navy">Claim-by-claim ledger</span>
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-cta flex-shrink-0" aria-hidden="true" />
              <span className="font-semibold text-navy">Verdict from each investor</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Award className="w-4 h-4 text-cta flex-shrink-0" aria-hidden="true" />
              <span className="font-semibold text-navy">Rewrites + 7-day plan</span>
            </li>
          </ul>

          <div className="p-4 bg-surface-2/80 border border-border rounded-field space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-2 block">
              Example
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-border">
                <span className="font-medium text-navy text-xs truncate">40% of retailers need this</span>
                <span className="text-[11px] font-bold text-warning flex-shrink-0">→ Unsourced</span>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-border">
                <span className="font-medium text-navy text-xs truncate">Pilot was free</span>
                <span className="text-[11px] font-bold text-danger flex-shrink-0">→ Contradiction</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white/70 border border-border rounded-panel text-xs text-text-2 space-y-1">
          <span className="font-bold text-navy block">Confidential & Private</span>
          <p>Your session is stored locally with session-scoped cookie tokens. Data is never shared or used for public training.</p>
        </div>
      </Card>
    </div>
  );
};
