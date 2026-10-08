import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { HelpCircle, CalendarCheck, Check, Copy } from "lucide-react";

interface ActionSprintSectionProps {
  expectedQuestions: string[];
  evidencePlan: string[];
  tightenedPitch: string;
}

/** Renders anticipated questions, 7-day checklist, tightened pitch, and next steps. */
export function ActionSprintSection({
  expectedQuestions,
  evidencePlan,
  tightenedPitch,
}: ActionSprintSectionProps) {
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});
  const [copiedPitch, setCopiedPitch] = useState(false);

  const toggleTask = (index: number) => {
    setCompletedTasks((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const copyPitch = () => {
    if (!tightenedPitch) return;
    navigator.clipboard?.writeText(tightenedPitch);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  return (
    <>
      {/* Anticipated Questions & 7-Day Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Anticipated Diligence Questions */}
        {expectedQuestions && expectedQuestions.length > 0 && (
          <section className="space-y-3 p-5 rounded-panel border border-border bg-surface-2/40">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-navy" aria-hidden="true" />
              <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                Questions to Expect Next
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-text">
              {expectedQuestions.map((q, idx) => (
                <li key={idx} className="flex items-start gap-2 p-2 bg-white rounded-field border border-border">
                  <span className="font-bold text-text-2 tabular-nums">{idx + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 7-Day Evidence Action Plan */}
        {evidencePlan && evidencePlan.length > 0 && (
          <section className="space-y-3 p-5 rounded-panel border border-border bg-surface-2/40">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-navy" aria-hidden="true" />
              <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                7-Day Evidence Action Plan
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-text">
              {evidencePlan.map((item, idx) => {
                const isDone = !!completedTasks[idx];
                return (
                  <li
                    key={idx}
                    onClick={() => toggleTask(idx)}
                    className={`flex items-start gap-2.5 p-2 rounded-field border cursor-pointer transition-subtle ${
                      isDone ? "bg-green-50/60 border-green-200 text-slate-600 line-through" : "bg-white border-border"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isDone ? "border-success bg-success text-white" : "border-slate-300"
                      }`}
                      aria-hidden="true"
                    >
                      {isDone && <Check className="w-3 h-3" />}
                    </div>
                    <span className="select-none">{item}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {/* Tightened 30-Second Elevator Pitch */}
      {tightenedPitch && (
        <section className="space-y-3 p-6 rounded-panel border border-border bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark block">
                Execution Asset
              </span>
              <h3 className="text-base font-serif font-bold text-navy">
                Tightened 30-Second Elevator Pitch
              </h3>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={copyPitch}
              leftIcon={copiedPitch ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              className="no-print"
            >
              {copiedPitch ? "Copied" : "Copy Pitch"}
            </Button>
          </div>

          <blockquote className="p-4 bg-white border border-border rounded-field text-xs sm:text-sm text-text leading-relaxed font-sans italic">
            &ldquo;{tightenedPitch}&rdquo;
          </blockquote>
        </section>
      )}

      {/* Recommended Next Step Callout Card */}
      <section className="p-6 rounded-panel bg-navy text-white space-y-2 shadow-panel">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold block">
          Recommended Next Step
        </span>
        <h3 className="text-lg font-serif font-bold">
          Tighten Unit Economics Cohorts & Re-test
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Incorporate verified CAC numbers and observed customer interview quotes into your pitch, then run a retry session to confirm whether partner conviction crosses the 70% threshold.
        </p>
      </section>
    </>
  );
}
