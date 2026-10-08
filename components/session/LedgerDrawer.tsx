import React from "react";
import { X } from "lucide-react";
import { DueDiligenceLedger, LedgerClaimItem } from "@/components/DueDiligenceLedger";

interface LedgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  claims: LedgerClaimItem[];
}

/** Responsive slide-out drawer rendering the Due Diligence Ledger on mobile/tablet. */
export function LedgerDrawer({ isOpen, onClose, claims }: LedgerDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm xl:hidden flex justify-end"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface max-w-md w-full h-full shadow-2xl p-5 overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-text-2">
            Diligence Drawer
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-2 hover:text-text"
            aria-label="Close ledger drawer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <DueDiligenceLedger claims={claims} />
      </div>
    </div>
  );
}
