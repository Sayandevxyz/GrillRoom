import React from "react";
import { Chip } from "@/components/ui/Chip";

interface ReadinessHeroProps {
  sessionId: string;
  score: number;
}

/** Renders executive memo header and SVG animated readiness score gauge. */
export function ReadinessHero({ sessionId, score }: ReadinessHeroProps) {
  const scoreRating =
    score >= 70
      ? "Investor-ready"
      : score >= 50
      ? "Approaching ready"
      : "Not yet ready";

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (score / 100) * circumference;

  return (
    <>
      {/* Section 1: Memo Header */}
      <header className="border-b border-border pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark">
            Confidential Partner Memo
          </span>
          <span className="text-xs font-mono tabular-nums text-text-2">
            Ref: #GR-{sessionId.slice(0, 8).toUpperCase()}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-navy tracking-tight">
            Investor Readiness Report
          </h1>
          <p className="text-xs sm:text-sm text-text-2 mt-1">
            Formal investment readiness audit and simulated partner deliberation.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs border-t border-border/60">
          <div>
            <span className="text-[10px] uppercase font-bold text-text-2 block">Evaluation Date</span>
            <span className="font-semibold text-text">
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-text-2 block">Panel Composition</span>
            <span className="font-semibold text-text">5 Venture Partners</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-text-2 block">Interrogation Scope</span>
            <span className="font-semibold text-text">Unit Economics & Moat</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-text-2 block">Audit Assessment</span>
            <span className="font-semibold text-navy">{scoreRating}</span>
          </div>
        </div>
      </header>

      {/* Section 2: Readiness Score Ring */}
      <section className="bg-surface-2/60 border border-border rounded-panel p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
        <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-slate-200 fill-none"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-navy fill-none transition-all duration-700 ease-out"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold font-sans tabular-nums text-navy">
              {score}
            </span>
            <span className="text-[10px] uppercase font-semibold text-text-2">Out of 100</span>
          </div>
        </div>

        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-lg font-serif font-bold text-navy">
              {scoreRating}
            </span>
            <Chip
              variant={score >= 70 ? "verified" : score >= 50 ? "warning" : "danger"}
              size="sm"
              label={`${score} / 100`}
            />
          </div>
          <p className="text-xs sm:text-sm text-text leading-relaxed">
            {score >= 70
              ? "Your pitch demonstrated defensible unit economics, observed customer traction, and quantitative rigor. The panel validated your core assertions with minimal unresolved risk."
              : score >= 50
              ? "Your narrative carries market potential but lacks rigorous customer proof points and unit payback validation. Several key claims were left unevidenced under pressure."
              : "Critical diligence vulnerabilities detected. Contradictions in reported metrics or unsupported TAM statements lowered partner conviction."}
          </p>
        </div>
      </section>
    </>
  );
}
