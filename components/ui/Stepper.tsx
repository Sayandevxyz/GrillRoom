import React from "react";
import { Check, CircleDot, Circle } from "lucide-react";

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
 */
export const Stepper: React.FC<StepperProps> = ({ currentRound, className = "" }) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentRound);

  return (
    <nav aria-label="Review Progress" className={`flex items-center gap-2 ${className}`}>
      <ol className="flex items-center gap-2">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <li key={step.id} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isCurrent
                    ? "bg-navy text-white shadow-subtle"
                    : isCompleted
                    ? "bg-slate-100 text-text-2 border border-border"
                    : "text-slate-400 bg-transparent"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3 text-success" aria-hidden="true" />
                ) : isCurrent ? (
                  <CircleDot className="w-3 h-3 text-gold" aria-hidden="true" />
                ) : (
                  <Circle className="w-3 h-3 text-slate-300" aria-hidden="true" />
                )}
                <span>{step.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="w-2.5 h-[1px] bg-border" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
