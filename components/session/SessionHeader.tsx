import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Stepper, StepState } from "@/components/ui/Stepper";
import { SlidersHorizontal } from "lucide-react";
import { INTENSITY_NAMES, getMaxExchanges } from "@/lib/constants";
import { IntensityMode } from "@/lib/types";

interface SessionHeaderProps {
  currentRound: StepState;
  founderExchangeCount: number;
  intensity: IntensityMode;
  claimsCount: number;
  showLedgerDrawer: boolean;
  onToggleLedgerDrawer: () => void;
  canGenerateDebrief: boolean;
  onRequestDebrief: () => void;
}

/** Sticky authority header with stepper progress, exchange status, and debrief trigger. */
export function SessionHeader({
  currentRound,
  founderExchangeCount,
  intensity,
  claimsCount,
  showLedgerDrawer,
  onToggleLedgerDrawer,
  canGenerateDebrief,
  onRequestDebrief,
}: SessionHeaderProps) {
  const maxExchanges = getMaxExchanges(intensity);

  return (
    <header className="bg-[#14284F] text-white border-t border-[#D4AF37]/30 border-b-2 border-[#D4572B] sticky top-0 z-30 shadow-[0_4px_16px_rgba(0,0,0,0.25)] h-20 min-h-[5rem] flex items-center">
      <div className="w-full max-w-6xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          <Link
            href="/"
            className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-xl shrink-0"
            aria-label="GrillRoom Home"
          >
            <div className="bg-[#F6EFE1] p-1.5 rounded-xl border border-[rgba(212,175,55,0.35)] flex items-center shrink-0 shadow-sm">
              <Image
                src="/brand/grillroom-logo.png"
                alt="GrillRoom"
                width={180}
                height={48}
                priority
                className="h-10 md:h-12 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Stepper (Desktop and Mobile) */}
          <Stepper currentRound={currentRound} />
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold tabular-nums text-slate-200 block">
              Exchange {founderExchangeCount} of {maxExchanges}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Investor Panel · {INTENSITY_NAMES[intensity] || intensity}
            </span>
          </div>

          {/* Ledger Drawer Toggle for Tablets & Mobile */}
          <button
            onClick={onToggleLedgerDrawer}
            aria-expanded={showLedgerDrawer}
            aria-controls="ledger-drawer"
            className={`xl:hidden inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-field text-xs font-semibold border transition-subtle shrink-0 ${
              showLedgerDrawer
                ? "bg-slate-700 text-white border-gold ring-1 ring-gold/40 shadow-sm"
                : "bg-slate-800 text-slate-200 hover:text-white border-slate-700"
            }`}
            aria-label="Toggle Due Diligence Ledger"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Ledger</span>
            <span className="tabular-nums font-mono text-[11px] bg-slate-700 px-1.5 py-0.2 rounded-full">
              {claimsCount}
            </span>
          </button>

          {/* Conclude Action */}
          <Button
            variant="secondary"
            size="sm"
            disabled={!canGenerateDebrief}
            title={!canGenerateDebrief ? "Answer at least 3 questions first" : "Generate Investor Debrief"}
            onClick={onRequestDebrief}
            className="text-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <span className="hidden sm:inline">Generate Investor Debrief</span>
            <span className="sm:hidden">Debrief</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
