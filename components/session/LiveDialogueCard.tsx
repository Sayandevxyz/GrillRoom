import React, { RefObject } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, Send, ChevronDown } from "lucide-react";
import { Turn } from "@/lib/hooks/useSessionState";
import { StreamingMeta } from "@/lib/hooks/useAnswerSubmit";
import { INVESTOR_PROFILES } from "@/lib/constants";

interface LiveDialogueCardProps {
  turns: Turn[];
  founderExchangeCount: number;
  pitchText: string;
  isPitchCollapsed: boolean;
  setIsPitchCollapsed: (collapsed: boolean) => void;
  isStreaming: boolean;
  streamingText: string;
  streamingMeta: StreamingMeta | null;
  errorMessage: string;
  answerInput: string;
  setAnswerInput: (val: string) => void;
  handleSendAnswer: (e?: React.FormEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  transcriptEndRef: RefObject<HTMLDivElement | null>;
}

function formatQuestionType(type?: string | null) {
  if (!type) return "Follow-up";
  const map: Record<string, string> = {
    clarification: "Clarification",
    pressure_test: "Pressure test",
    contradiction: "Contradiction probe",
    moat: "Defensibility",
    unit_economics: "Unit economics",
    followup: "Follow-up",
  };
  return map[type.toLowerCase()] || type.replace(/_/g, " ");
}

/** Renders the central interactive dialogue card and response composer. */
export function LiveDialogueCard({
  turns,
  founderExchangeCount,
  pitchText,
  isPitchCollapsed,
  setIsPitchCollapsed,
  isStreaming,
  streamingText,
  streamingMeta,
  errorMessage,
  answerInput,
  setAnswerInput,
  handleSendAnswer,
  handleKeyDown,
  textareaRef,
  transcriptEndRef,
}: LiveDialogueCardProps) {
  return (
    <Card className="p-4 md:p-5 flex flex-col h-[calc(100dvh-200px)] min-h-[540px]">
      {/* Dialogue Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3 flex-shrink-0">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark block">
            Live Panel Dialogue
          </span>
          <h2 className="text-base font-serif font-bold text-navy">
            Investor Review
          </h2>
        </div>
        <span className="text-xs text-text-2">
          {founderExchangeCount} exchange{founderExchangeCount === 1 ? "" : "s"} recorded
        </span>
      </div>

      {/* Collapsible Read-Only "Your Pitch" Chip */}
      {pitchText && (
        <div className="mb-3 pb-2 border-b border-border/70 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsPitchCollapsed(!isPitchCollapsed)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-2 hover:text-navy transition-subtle bg-surface-2 hover:bg-slate-200 px-2.5 py-1 rounded-full border border-border"
            aria-expanded={!isPitchCollapsed}
          >
            <span>Your Pitch</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isPitchCollapsed ? "" : "rotate-180"
              }`}
            />
          </button>
          {!isPitchCollapsed && (
            <div className="mt-2 p-3 bg-slate-50 border border-border rounded-field text-xs text-text leading-relaxed max-h-20 overflow-y-auto whitespace-pre-wrap">
              {pitchText}
            </div>
          )}
        </div>
      )}

      {/* Transcript Stream (Internally scrolling) */}
      <div
        className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0 scroll-smooth"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {turns.map((turn, idx) => {
          if (turn.role === "chair") {
            return (
              <div
                key={idx}
                className="p-3 rounded-field bg-slate-100 border border-border text-center text-xs text-text-2 space-y-0.5"
              >
                <span className="font-bold uppercase tracking-wider text-[10px] text-navy block">
                  Chair
                </span>
                <p className="leading-relaxed font-medium text-slate-700">{turn.text}</p>
              </div>
            );
          }

          if (turn.role === "founder") {
            return (
              <div key={idx} className="flex justify-end">
                <div className="max-w-[85%] bg-slate-50 border border-slate-200 rounded-field p-3.5 space-y-1 shadow-subtle">
                  <span className="text-[11px] font-bold text-navy block">
                    You
                  </span>
                  <p className="text-sm text-text leading-relaxed whitespace-pre-wrap font-sans">
                    {turn.text}
                  </p>
                </div>
              </div>
            );
          }

          // Investor turn
          return (
            <div key={idx} className="flex gap-3 items-start">
              <div
                className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1"
                aria-hidden="true"
              >
                {INVESTOR_PROFILES[turn.speakerId]?.initials ||
                  turn.speakerName.charAt(0)}
              </div>

              <div className="flex-1 bg-surface border border-border rounded-field p-3.5 space-y-1.5 shadow-subtle max-w-[70ch]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-navy">
                    {turn.speakerName}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {turn.isInterrupt && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-danger bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                        Interrupting
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-text-2 bg-slate-100 px-2 py-0.5 rounded">
                      {formatQuestionType(turn.questionType)}
                    </span>
                  </div>
                </div>

                <p className="text-sm md:text-base text-text leading-relaxed font-sans">
                  {turn.text}
                </p>
              </div>
            </div>
          );
        })}

        {/* Live Streaming Turn */}
        {isStreaming && (
          <div className="flex gap-3 items-start animate-in fade-in duration-150">
            <div
              className="w-7 h-7 rounded-full bg-gold text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1"
              aria-hidden="true"
            >
              {INVESTOR_PROFILES[streamingMeta?.speakerId || ""]?.initials || "•"}
            </div>

            <div className="flex-1 bg-surface border border-gold/60 rounded-field p-3.5 space-y-1.5 shadow-subtle max-w-[70ch]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-navy">
                  {streamingMeta?.speakerName || "Deliberating..."}
                </span>

                <div className="flex items-center gap-1.5">
                  {streamingMeta?.isInterrupt && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-danger bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                      Interrupting
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-text-2 bg-slate-100 px-2 py-0.5 rounded">
                    {formatQuestionType(streamingMeta?.questionType)}
                  </span>
                </div>
              </div>

              <p className="text-sm md:text-base text-text leading-relaxed font-sans">
                {streamingText || (
                  <span className="inline-flex items-center gap-1 text-text-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-200" />
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>

      {/* Composer (Sticky Bottom of Card) */}
      <div className="pt-3 border-t border-border space-y-2 flex-shrink-0">
        {errorMessage && (
          <div className="p-2 rounded-field bg-red-50 border border-red-200 text-danger text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSendAnswer} className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="response-input" className="text-xs font-bold uppercase tracking-wider text-text-2">
              Your Response
            </label>
            <span className="text-xs tabular-nums text-text-2">
              {answerInput.length} chars
            </span>
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              id="response-input"
              rows={3}
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder={
                isStreaming
                  ? "Investor speaking... please wait"
                  : "Directly answer the question. Cite concrete metrics, sources, and methods. (Ctrl+Enter to send)"
              }
              className="w-full bg-white border border-border focus:border-navy rounded-field p-3 text-text placeholder:text-slate-400 focus:outline-none transition-subtle text-sm leading-relaxed resize-none disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-text-2 hidden sm:block">
              Cite numbers, sources and methods. Ctrl+Enter to send.
            </p>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!answerInput.trim() || isStreaming}
              rightIcon={<Send className="w-3.5 h-3.5" aria-hidden="true" />}
              className="bg-cta hover:bg-cta-hover focus-visible:ring-gold text-white font-semibold shadow-subtle disabled:opacity-50 ml-auto"
            >
              {isStreaming ? "Investor speaking" : "Submit Response"}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
