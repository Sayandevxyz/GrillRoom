import React from "react";
import { Card } from "@/components/ui/Card";
import { ReactionBadge } from "@/components/features/reactions/ReactionBadge";
import { INVESTOR_PROFILES } from "@/lib/constants";

interface InvestorPanelStripProps {
  convictions: Record<string, number>;
  previousConvictions: Record<string, number>;
  activeSpeaker: string | null;
}

/** Renders top investor panel cards with live conviction meters and reaction badges. */
export function InvestorPanelStrip({
  convictions,
  previousConvictions,
  activeSpeaker,
}: InvestorPanelStripProps) {
  return (
    <section aria-label="Investor Panelists">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(INVESTOR_PROFILES).map(([key, prof]) => {
          const meter = convictions[key] ?? 50;
          const prev = previousConvictions[key] ?? meter;
          const delta = meter - prev;
          const isSpeaking = activeSpeaker === key;

          return (
            <Card
              key={key}
              className={`p-3 transition-subtle flex flex-col justify-between ${
                isSpeaking
                  ? "ring-2 ring-cta shadow-md bg-orange-50/20"
                  : activeSpeaker
                  ? "opacity-80 bg-surface"
                  : "bg-surface"
              }`}
            >
              <div>
                {/* Top row: Avatar + Name/Role on left, Conviction % on right */}
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-sans flex-shrink-0 ${
                        isSpeaking ? "bg-cta text-white" : "bg-navy text-white"
                      }`}
                      aria-hidden="true"
                    >
                      {prof.initials}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-navy truncate block">
                        {prof.name}
                      </span>
                      <span className="text-[10px] text-text-2 truncate block">
                        {prof.title.split(" ")[0]}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-bold font-sans tabular-nums text-navy block">
                      {meter}%
                    </span>
                    {delta !== 0 && (
                      <span
                        className={`text-[10px] font-bold tabular-nums block ${
                          delta > 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                  </div>
                </div>

                {/* Thin Conviction Meter Bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      meter > 50 ? "bg-cta" : meter < 50 ? "bg-danger" : "bg-slate-400"
                    }`}
                    style={{ width: `${Math.min(Math.max(meter, 0), 100)}%` }}
                  />
                </div>
              </div>

              {/* Single Status Chip Row + Reaction Badge */}
              <div className="mt-2 pt-1.5 border-t border-border/60 flex items-center justify-between min-h-[22px]">
                <div className="flex items-center gap-1.5">
                  <ReactionBadge investorId={key} delta={delta} />
                </div>

                {isSpeaking ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cta bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-cta animate-ping" aria-hidden="true" />
                    Speaking
                  </span>
                ) : (
                  <span className="text-[10px] text-text-2 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    Listening
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
