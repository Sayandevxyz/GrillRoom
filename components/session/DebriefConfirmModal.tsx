import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FileCheck2 } from "lucide-react";

interface DebriefConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  turnCount: number;
  claimsCount: number;
}

/** Confirmation dialog when the founder requests debrief generation. */
export function DebriefConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  turnCount,
  claimsCount,
}: DebriefConfirmModalProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Investor Debrief?"
      description="Conclude live partner interrogation and compute formal investment readiness."
    >
      <div className="space-y-4">
        <p className="text-xs text-text leading-relaxed">
          Generating the debrief will formally end this pitch session. The panel will deliberate, evaluate all extracted claims in your Due Diligence Ledger, compute code-evaluated verdicts (In, Conditional, or Out), and compile your comprehensive Investor Readiness Report.
        </p>

        <div className="p-3 bg-surface-2 rounded-field border border-border text-xs text-text-2 space-y-1">
          <p>
            <strong>Total Exchanges Completed:</strong> {turnCount}
          </p>
          <p>
            <strong>Claims Recorded in Ledger:</strong> {claimsCount}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
          >
            Continue Pitch
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onConfirm}
            leftIcon={<FileCheck2 className="w-4 h-4" aria-hidden="true" />}
          >
            Conclude & Generate Debrief
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
