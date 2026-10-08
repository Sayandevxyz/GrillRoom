import React from "react";
import { Chip } from "@/components/ui/Chip";
import { INVESTOR_PROFILES } from "@/lib/constants";

export interface VerdictItem {
  investor_id: string;
  decision: "In" | "Conditional" | "Out";
  reason: string;
  condition: string;
  simulated_offer: string;
}

interface TermSheetSectionProps {
  verdicts: VerdictItem[];
}

/** Renders investor verdicts and simulated partner term sheets table. */
export function TermSheetSection({ verdicts }: TermSheetSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark block">
          Partner Deliberation
        </span>
        <h2 className="text-xl font-serif font-bold text-navy">
          Investor Verdicts
        </h2>
      </div>

      <div className="overflow-x-auto border border-border rounded-panel">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface-2 border-b border-border text-text-2 uppercase text-[10px] tracking-wider">
              <th className="p-3.5 font-bold">Investor</th>
              <th className="p-3.5 font-bold">Focus</th>
              <th className="p-3.5 font-bold">Verdict</th>
              <th className="p-3.5 font-bold">Primary Rationale</th>
              <th className="p-3.5 font-bold">Simulated Offer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {verdicts.map((v) => {
              const prof = INVESTOR_PROFILES[v.investor_id] || {
                name: v.investor_id,
                title: "Partner",
                initials: v.investor_id.charAt(0).toUpperCase(),
              };

              const verdictVariant =
                v.decision === "In"
                  ? "verified"
                  : v.decision === "Conditional"
                  ? "warning"
                  : "danger";

              return (
                <tr key={v.investor_id} className="hover:bg-slate-50/60 transition-subtle">
                  <td className="p-3.5 font-bold text-navy whitespace-nowrap">
                    {prof.name}
                  </td>
                  <td className="p-3.5 text-text-2 whitespace-nowrap">
                    {prof.title}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <Chip variant={verdictVariant} size="sm" label={v.decision} />
                  </td>
                  <td className="p-3.5 text-text max-w-xs leading-relaxed">
                    {v.reason}
                    {v.condition && (
                      <span className="block text-[11px] text-text-2 mt-1 italic">
                        Condition: {v.condition}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    {v.simulated_offer ? (
                      <div className="space-y-0.5">
                        <span className="font-semibold text-navy block tabular-nums">
                          {v.simulated_offer}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                          Simulated
                        </span>
                      </div>
                    ) : (
                      <span className="text-text-2 italic">Passed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
