import React from "react";
import { Chip } from "@/components/ui/Chip";
import { INVESTOR_PROFILES } from "@/lib/constants";

interface ComparisonTableProps {
  originalConvictions: Record<string, number>;
  retryConvictions: Record<string, number>;
}

/** Renders side-by-side partner conviction comparison rows with delta chips. */
export function ComparisonTable({
  originalConvictions,
  retryConvictions,
}: ComparisonTableProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-serif font-bold text-navy">
        Partner Conviction Shift
      </h3>

      <div className="overflow-x-auto border border-border rounded-panel">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface-2 border-b border-border text-text-2 uppercase text-[10px] tracking-wider">
              <th className="p-3.5 font-bold">Investor</th>
              <th className="p-3.5 font-bold">Initial Conviction</th>
              <th className="p-3.5 font-bold">Revised Conviction</th>
              <th className="p-3.5 font-bold">Delta Shift</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Object.keys(originalConvictions || {}).map((key) => {
              const prof = INVESTOR_PROFILES[key] || {
                name: key,
                title: "Partner",
              };
              const orig = originalConvictions[key] ?? 50;
              const ret = retryConvictions?.[key] ?? orig;
              const diff = ret - orig;

              return (
                <tr key={key} className="hover:bg-slate-50/60 transition-subtle">
                  <td className="p-3.5 font-bold text-navy">
                    {prof.name}
                    <span className="block text-[11px] font-normal text-text-2">
                      {prof.title}
                    </span>
                  </td>
                  <td className="p-3.5 font-sans tabular-nums text-text-2 font-medium">
                    {orig}%
                  </td>
                  <td className="p-3.5 font-sans tabular-nums font-bold text-navy">
                    {ret}%
                  </td>
                  <td className="p-3.5">
                    <Chip
                      variant={diff > 0 ? "verified" : diff < 0 ? "danger" : "neutral"}
                      size="sm"
                      label={diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : "0%"}
                    />
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
