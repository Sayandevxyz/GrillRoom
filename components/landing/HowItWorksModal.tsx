import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="How GrillRoom Works"
      description="A deterministic simulator preparing you for real venture capital conversations."
    >
      <div className="space-y-4 text-xs text-text leading-relaxed">
        <div className="space-y-1">
          <h3 className="font-bold text-navy text-sm">1. Submit Your Brief or Pitch Deck</h3>
          <p className="text-text-2">
            Provide your value proposition, customer traction, and capital ask (or upload your pitch deck PDF).
          </p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-navy text-sm">2. Enter the Boardroom</h3>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-dark bg-amber-50 border border-amber-200 rounded-full">
              5 Venture Archetypes
            </span>
          </div>
          <p className="text-text-2">
            Face five distinct venture archetypes (The Numbers Hawk, The Skeptic, The Visionary, The Customer Voice, and The Chair). They grill your assumptions in real time.
          </p>
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-navy text-sm">3. Due Diligence Ledger & Conviction</h3>
          <p className="text-text-2">
            Every statement is logged into an immutable ledger. Contradictions trigger instant investor interrupts and conviction drops.
          </p>
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-navy text-sm">4. Algorithmic Investor Debrief</h3>
          <p className="text-text-2">
            Receive simulated term sheets, line-by-line evidence rewrites, and a 7-day action sprint before real investor meetings.
          </p>
        </div>
        <div className="pt-2 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            Understood, enter boardroom
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
