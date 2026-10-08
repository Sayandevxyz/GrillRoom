import React from "react";
import { ArrowRight } from "lucide-react";

interface CriteriaProgressionGridProps {
  originalScores: Record<string, number>;
  retryScores: Record<string, number>;
}

/** Renders cards showing dilgence score movement from initial to retry session. */
export function CriteriaProgressionGrid({
  originalScores,
  retryScores,
}: CriteriaProgressionGridProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-serif font-bold text-navy">
        Diligence Criteria Progression
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(originalScores || {}).map(([key, origScore]) => {
          const retryScore = retryScores?.[key] ?? origScore;
          const delta = retryScore - origScore;

          return (
            <div
              key={key}
              className="p-3 rounded-field border border-border bg-surface-2/40 text-center space-y-1"
            >
              <span className="text-[10px] uppercase font-bold text-text-2 block truncate">
                {key}
              </span>
              <div className="flex items-center justify-center gap-1.5 font-sans tabular-nums font-bold">
                <span className="text-text-2 text-xs">{origScore}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-navy text-sm">{retryScore}</span>
              </div>
              <span
                className={`text-[10px] font-bold block ${
                  delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-text-2"
                }`}
              >
                {delta > 0 ? `+${delta}` : `${delta}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
