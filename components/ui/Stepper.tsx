import React from "react";
import { Check } from "lucide-react";

export type StepState = "opening" | "deep_dive" | "kill_shot" | "verdict";

export interface StepperProps {
  currentRound: StepState;
  className?: string;
}

const STEPS: Array<{ id: StepState; label: string }> = [
  { id: "opening", label: "Opening" },
  { id: "deep_dive", label: "Deep Dive" },
  { id: "kill_shot", label: "Kill Shot" },
  { id: "verdict", label: "Verdict" },
];

/**
 * Accessible review stage progress stepper.
 * Responsive: on mobile (<768px), shows dots for inactive steps and label only for active step.
 */
export const Stepper: React.FC<StepperProps> = ({ currentRound, className = "" }) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentRound);

  return (
    <nav aria-label="Review Progress" className={`flex items-center ${className}`}>
      <ol className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <li key={step.id} className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
              <div
                className={`flex items-center gap-1.5 px-1.5 sm:px-2 py-1 rounded-full text-xs transition-colors ${
                  isCurrent
                    ? "text-white font-bold"
                    : isCompleted
                    ? "text-slate-300"
                    : "text-slate-400"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {/* Active step: orange ring/dot; Inactive: muted dots/check */}
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                ) : isCurrent ? (
                  <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D4572B] opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#D4572B] ring-2 ring-[#D4572B]/40" />
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-500/80 shrink-0" aria-hidden="true" />
                )}

                {/* Hide labels of inactive steps on <768px, show active label + dots */}
                <span
                  className={
                    isCurrent
                      ? "inline font-bold text-white whitespace-nowrap"
                      : "hidden md:inline text-slate-400 whitespace-nowrap"
                  }
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line: white at 20% opacity */}
              {idx < STEPS.length - 1 && (
                <div className="w-1.5 sm:w-2 md:w-3 h-[1px] bg-white/20 shrink-0" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
