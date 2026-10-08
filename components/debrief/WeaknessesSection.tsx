import React from "react";
import { Chip } from "@/components/ui/Chip";
import { AlertTriangle } from "lucide-react";

export interface WeaknessItem {
  exchange: string;
  failed_criterion: string;
  explanation: string;
  most_affected_investor: string;
}

export interface StrongerAnswerItem {
  question: string;
  rewrite: string;
}

export interface ContradictionItem {
  turn_numbers: string;
  suggested_consistent_position: string;
}

interface WeaknessesSectionProps {
  weaknesses: WeaknessItem[];
  contradictions: ContradictionItem[];
  strongerAnswers: StrongerAnswerItem[];
}

/** Renders diligence vulnerabilities, contradiction matrix, and stronger rewrites. */
export function WeaknessesSection({
  weaknesses,
  contradictions,
  strongerAnswers,
}: WeaknessesSectionProps) {
  return (
    <>
      {/* Key Risks */}
      {weaknesses && weaknesses.length > 0 && (
        <section className="space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark block">
              Diligence Vulnerabilities
            </span>
            <h2 className="text-xl font-serif font-bold text-navy">
              Key Risks & Objections
            </h2>
          </div>

          <div className="space-y-3">
            {weaknesses.map((w, idx) => (
              <div
                key={idx}
                className="p-4 rounded-field border border-border bg-white flex flex-col sm:flex-row items-start justify-between gap-3 shadow-subtle"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Chip
                      variant={idx === 0 ? "danger" : "warning"}
                      size="sm"
                      label={idx === 0 ? "High Severity" : "Medium Severity"}
                    />
                    <span className="text-xs font-bold text-navy">
                      Criterion: {w.failed_criterion}
                    </span>
                    <span className="text-xs text-text-2">• {w.exchange}</span>
                  </div>
                  <p className="text-xs text-text leading-relaxed font-medium">
                    {w.explanation}
                  </p>
                </div>

                <div className="text-right flex-shrink-0 text-[11px] text-text-2">
                  <span>Raised by: </span>
                  <strong className="text-navy">{w.most_affected_investor}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contradiction Resolution Matrix */}
      {contradictions && contradictions.length > 0 && (
        <section className="space-y-3 p-5 rounded-panel bg-red-50/40 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger" aria-hidden="true" />
            <h3 className="text-sm font-bold text-danger uppercase tracking-wider">
              Contradiction Resolution Matrix
            </h3>
          </div>
          <p className="text-xs text-text-2 leading-relaxed">
            The panel noted discrepancies across statements. Adopt the consistent positions below in future partner calls:
          </p>
          <div className="space-y-2 mt-2">
            {contradictions.map((c, i) => (
              <div key={i} className="p-3 bg-white border border-red-200 rounded-field text-xs space-y-1">
                <span className="font-bold text-navy block">Turn {c.turn_numbers}</span>
                <p className="text-text font-medium">{c.suggested_consistent_position}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stronger Rewrites */}
      {strongerAnswers && strongerAnswers.length > 0 && (
        <section className="space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark block">
              Evidence-Grounded Corrections
            </span>
            <h2 className="text-xl font-serif font-bold text-navy">
              Weakest Answers & Stronger Rewrites
            </h2>
            <p className="text-xs text-text-2 mt-0.5">
              Missing figures are marked with visible placeholders. Replace them with verified numbers before partner meetings.
            </p>
          </div>

          <div className="space-y-3.5">
            {strongerAnswers.map((sa, idx) => (
              <div key={idx} className="p-4 rounded-field border border-border bg-white space-y-2 shadow-subtle">
                <span className="text-xs font-bold text-text-2 block">
                  Question: &ldquo;{sa.question}&rdquo;
                </span>

                <div className="p-3 bg-slate-50 border border-border/80 rounded-field text-xs leading-relaxed text-text">
                  <span className="text-[10px] uppercase font-bold text-gold-dark block mb-1">
                    Stronger Revision
                  </span>
                  <p className="font-mono text-xs whitespace-pre-wrap">
                    {sa.rewrite.split(/(\[insert [^\]]+\])/g).map((part, pIdx) => {
                      if (part.startsWith("[insert")) {
                        return (
                          <mark
                            key={pIdx}
                            className="bg-amber-100 text-gold-dark font-bold px-1 py-0.5 rounded border border-amber-300"
                          >
                            {part}
                          </mark>
                        );
                      }
                      return <span key={pIdx}>{part}</span>;
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
