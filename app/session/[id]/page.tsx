"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Stepper, StepState } from "@/components/ui/Stepper";
import { Dialog } from "@/components/ui/Dialog";
import { DueDiligenceLedger, LedgerClaimItem } from "@/components/DueDiligenceLedger";
import { IntensityMode, RoundType, TurnRole } from "@/lib/types";
import {
  AlertTriangle,
  Send,
  SlidersHorizontal,
  X,
  FileCheck2,
  ChevronDown,
} from "lucide-react";

interface Turn {
  id?: number;
  role: TurnRole;
  speakerId: string;
  speakerName: string;
  text: string;
  round: RoundType | string;
  questionType?: string | null;
  isInterrupt?: boolean;
}

interface StreamingMeta {
  speakerId: string;
  speakerName: string;
  questionType: string;
  isInterrupt: boolean;
  ladderLevel?: number;
  threadId?: number;
}

interface SSEStatePayload {
  meters?: Record<string, number>;
  turnCount?: number;
  round?: string;
  claims?: LedgerClaimItem[];
  shouldMoveToKillShot?: boolean;
}

interface StartSessionResponse {
  session?: {
    turn_count?: number;
    intensity?: IntensityMode;
    idea_text?: string;
  };
  turns?: Array<{
    role: TurnRole;
    speaker_id: string;
    text: string;
    round: RoundType;
    question_type?: string;
  }>;
  claims?: LedgerClaimItem[];
  meters?: Record<string, number>;
}

const INVESTOR_PROFILES: Record<
  string,
  { name: string; title: string; initials: string }
> = {
  rohan: {
    name: "Rohan Mehta",
    title: "Unit Economics Partner",
    initials: "RM",
  },
  meera: {
    name: "Meera Shah",
    title: "Market and GTM Investor",
    initials: "MS",
  },
  arjun: {
    name: "Dr. Arjun Rao",
    title: "Product and Technical Moat",
    initials: "AR",
  },
  kavya: {
    name: "Kavya Sen",
    title: "Customer Proof Analyst",
    initials: "KS",
  },
  sam: {
    name: "Sam Kapoor",
    title: "Founder and Deal Terms Partner",
    initials: "SK",
  },
};

const INTENSITY_NAMES: Record<IntensityMode, string> = {
  friendly: "Angel Review",
  tough: "Partner Meeting",
  shark: "Shark Tank Mode",
};

export default function SessionStagePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [convictions, setConvictions] = useState<Record<string, number>>({});
  const [previousConvictions, setPreviousConvictions] = useState<Record<string, number>>({});
  const [turns, setTurns] = useState<Turn[]>([]);
  const [claims, setClaims] = useState<LedgerClaimItem[]>([]);
  const [currentRound, setCurrentRound] = useState<StepState>("opening");
  const [turnCount, setTurnCount] = useState(0);
  const [intensity, setIntensity] = useState<IntensityMode>("tough");
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [pitchText, setPitchText] = useState("");
  const [isPitchCollapsed, setIsPitchCollapsed] = useState(true);

  // Streaming and user input states
  const [answerInput, setAnswerInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingMeta, setStreamingMeta] = useState<StreamingMeta | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLedgerDrawer, setShowLedgerDrawer] = useState(false);
  const [showDebriefConfirm, setShowDebriefConfirm] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize session
  useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch(`/api/session/start?sessionId=${sessionId}`);
        if (res.ok) {
          const data = (await res.json()) as StartSessionResponse;
          if (data.turns) {
            setTurns(
              data.turns.map((t) => ({
                role: t.role,
                speakerId: t.speaker_id,
                speakerName:
                  t.role === "chair"
                    ? "Independent Chair"
                    : t.role === "founder"
                    ? "You"
                    : INVESTOR_PROFILES[t.speaker_id]?.name || t.speaker_id,
                text: t.text,
                round: t.round,
                questionType: t.question_type,
              }))
            );
          }
          if (data.claims) setClaims(data.claims);
          if (data.meters) {
            setConvictions(data.meters);
            setPreviousConvictions(data.meters);
          }
          if (data.session) {
            setTurnCount(data.session.turn_count || 0);
            setIntensity(data.session.intensity || "tough");
            if (data.session.idea_text) {
              setPitchText(data.session.idea_text);
            }
          }
        }
      } catch (err: unknown) {
        console.warn("Session fetch error", err);
      }
    }
    initSession();
  }, [sessionId]);

  // Auto-scroll transcript on turns or stream
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, streamingText]);

  // Handle founder response submission via SSE
  const handleSendAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!answerInput.trim() || isStreaming) return;

    const userText = answerInput.trim();
    setAnswerInput("");
    setErrorMessage("");

    // Add user turn immediately
    const userTurn: Turn = {
      role: "founder",
      speakerId: "founder",
      speakerName: "You",
      text: userText,
      round: currentRound,
    };
    setTurns((prev) => [...prev, userTurn]);

    setIsStreaming(true);
    setStreamingText("");
    setStreamingMeta(null);

    // Save previous convictions before update
    setPreviousConvictions(convictions);

    try {
      const response = await fetch("/api/session/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answer: userText }),
      });

      if (!response.ok) {
        const errJson = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || "Failed to process turn");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("SSE Stream connection failed");

      const decoder = new TextDecoder();
      let buffer = "";

      let currentSpeakerId = "";
      let currentSpeakerName = "";
      let currentQuestionType = "";
      let isInterrupt = false;
      let accumulatedSpeech = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          let eventType = "message";
          let eventData = "";

          for (const subLine of line.split("\n")) {
            if (subLine.startsWith("event: ")) {
              eventType = subLine.slice(7).trim();
            } else if (subLine.startsWith("data: ")) {
              eventData = subLine.slice(6).trim();
            }
          }

          if (!eventData) continue;
          const parsed = JSON.parse(eventData);

          if (eventType === "meta") {
            const meta = parsed as StreamingMeta;
            setStreamingMeta(meta);
            currentSpeakerId = meta.speakerId;
            currentSpeakerName =
              INVESTOR_PROFILES[meta.speakerId]?.name || meta.speakerName;
            currentQuestionType = meta.questionType;
            isInterrupt = meta.isInterrupt;
            setActiveSpeaker(meta.speakerId);
          } else if (eventType === "token") {
            const tokenPiece = String(parsed.token || "");
            accumulatedSpeech += tokenPiece;
            setStreamingText((prev) => prev + tokenPiece);
          } else if (eventType === "state") {
            const stateData = parsed as SSEStatePayload;
            if (stateData.meters) setConvictions(stateData.meters);
            if (stateData.turnCount !== undefined) setTurnCount(stateData.turnCount);
            if (stateData.round) setCurrentRound(stateData.round as StepState);
            if (stateData.claims) setClaims(stateData.claims);
            if (stateData.shouldMoveToKillShot) {
              setCurrentRound("kill_shot");
            }
          } else if (eventType === "done") {
            setTurns((prev) => [
              ...prev,
              {
                role: "investor",
                speakerId: currentSpeakerId,
                speakerName: currentSpeakerName,
                text: accumulatedSpeech,
                round: currentRound,
                questionType: currentQuestionType,
                isInterrupt,
              },
            ]);
            setStreamingText("");
            setStreamingMeta(null);
            setActiveSpeaker(null);
          } else if (eventType === "error") {
            setErrorMessage(parsed.message || "An interrogation error occurred");
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection lost. Please retry.";
      setErrorMessage(message);
    } finally {
      setIsStreaming(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  const navigateToDebrief = () => {
    router.push(`/session/${sessionId}/debrief`);
  };

  const formatQuestionType = (type?: string | null) => {
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
  };

  const founderExchangeCount = turns.filter((t) => t.role === "founder").length;
  const canGenerateDebrief = founderExchangeCount >= 3;

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* 1. Shared Authority Top Bar */}
      <header className="bg-navy text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
              aria-label="GrillRoom Home"
            >
              <Image
                src="/brand/logo-mark.png"
                alt="GrillRoom Flame"
                width={36}
                height={36}
                priority
                className="h-9 w-auto object-contain"
              />
              <span className="font-serif font-bold text-xl tracking-tight text-white">
                Grill<span className="text-cta">Room</span>
              </span>
            </Link>

            {/* Stepper (Desktop) */}
            <div className="hidden md:block">
              <Stepper currentRound={currentRound} />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right">
              <span className="text-xs font-semibold tabular-nums text-slate-200 block">
                Exchange {founderExchangeCount} of 14
              </span>
              <span className="text-[11px] text-slate-400 block">
                Investor Panel · {INTENSITY_NAMES[intensity]}
              </span>
            </div>

            {/* Ledger Drawer Toggle for Tablets & Mobile */}
            <button
              onClick={() => setShowLedgerDrawer(!showLedgerDrawer)}
              className="xl:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-field bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700 transition-subtle"
              aria-label="Toggle Due Diligence Ledger"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Ledger</span>
              <span className="tabular-nums font-mono text-[11px] bg-slate-700 px-1.5 py-0.2 rounded-full">
                {claims.length}
              </span>
            </button>

            {/* Conclude Action */}
            <Button
              variant="secondary"
              size="sm"
              disabled={!canGenerateDebrief}
              title={!canGenerateDebrief ? "Answer at least 3 questions first" : "Generate Investor Debrief"}
              onClick={() => {
                if (canGenerateDebrief) setShowDebriefConfirm(true);
              }}
              className="text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Investor Debrief
            </Button>
          </div>
        </div>
      </header>

      {/* Main Review Area */}
      <main id="main-content" className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-4 space-y-4">
        {/* 2. Investor Panel Strip (5 compact executive cards) */}
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

                  {/* Single Status Chip Row + Reserved spot for Step 4 reaction badge */}
                  <div className="mt-2 pt-1.5 border-t border-border/60 flex items-center justify-between min-h-[22px]">
                    <div className="flex items-center gap-1.5">
                      {/* Clear spot reserved for reaction badge in Step 4 */}
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

        {/* 3. Conversation & Ledger Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Conversation Column (8 cols on XL) */}
          <div className="xl:col-span-8 space-y-4">
            <Card className="p-4 md:p-5 flex flex-col h-[calc(100dvh-230px)] min-h-[480px] max-h-[760px]">
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
                    <div className="mt-2 p-3 bg-slate-50 border border-border rounded-field text-xs text-text leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">
                      {pitchText}
                    </div>
                  )}
                </div>
              )}

              {/* Transcript Stream (Internally scrolling) */}
              <div
                className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0"
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
          </div>

          {/* Due Diligence Ledger Column (Desktop 4 cols, sticky) */}
          <div className="hidden xl:block xl:col-span-4 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-230px)] xl:overflow-y-auto">
            <DueDiligenceLedger claims={claims} />
          </div>
        </div>
      </main>

      {/* Drawer Overlay for Tablet/Mobile Due Diligence Ledger */}
      {showLedgerDrawer && (
        <div
          className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm xl:hidden flex justify-end"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLedgerDrawer(false);
          }}
        >
          <div className="bg-surface max-w-md w-full h-full shadow-2xl p-5 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-text-2">
                Diligence Drawer
              </span>
              <button
                onClick={() => setShowLedgerDrawer(false)}
                className="p-1 rounded text-text-2 hover:text-text"
                aria-label="Close ledger drawer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <DueDiligenceLedger claims={claims} />
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Conclude & Generate Debrief */}
      <Dialog
        isOpen={showDebriefConfirm}
        onClose={() => setShowDebriefConfirm(false)}
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
              <strong>Claims Recorded in Ledger:</strong> {claims.length}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowDebriefConfirm(false)}
            >
              Continue Pitch
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={navigateToDebrief}
              leftIcon={<FileCheck2 className="w-4 h-4" aria-hidden="true" />}
            >
              Conclude & Generate Debrief
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Persistent Legal Footer */}
      <footer className="border-t border-border bg-white px-6 py-4 text-center text-xs text-text-2">
        <p>GrillRoom uses simulated investors for practice. Verdicts do not predict real investment decisions.</p>
      </footer>
    </div>
  );
}
