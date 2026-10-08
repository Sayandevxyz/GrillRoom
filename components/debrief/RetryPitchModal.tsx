import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface RetryPitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  revisedPitch: string;
  setRevisedPitch: (val: string) => void;
  isRetrying: boolean;
  onExecuteRetry: () => void;
}

/** Dialog prompting founder to refine pitch text before launching a linked retry session. */
export function RetryPitchModal({
  isOpen,
  onClose,
  revisedPitch,
  setRevisedPitch,
  isRetrying,
  onExecuteRetry,
}: RetryPitchModalProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Retry with Improved Pitch"
      description="Launch a linked child session with your tightened numbers to evaluate pitch progression."
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="retry-pitch-input" className="text-xs font-bold uppercase text-text-2 block">
            Revised Pitch Brief
          </label>
          <textarea
            id="retry-pitch-input"
            rows={6}
            value={revisedPitch}
            onChange={(e) => setRevisedPitch(e.target.value)}
            placeholder="Paste your strengthened pitch brief incorporating verified metrics..."
            className="w-full bg-white border border-border rounded-field p-3 text-xs text-text focus:outline-none focus:border-navy"
          />
          <span className="text-[11px] text-text-2">
            Minimum 50 characters required. The panel will test your revisions against past assertions.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onExecuteRetry}
            isLoading={isRetrying}
            disabled={revisedPitch.trim().length < 50}
          >
            Launch Retry Session
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
