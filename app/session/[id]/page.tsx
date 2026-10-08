"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { IntensityMode, RoundType, TurnRole } from "@/lib/types";

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

interface Claim {
  id: number;
  claim_text: string;
  category: string;
  status: string;
  severity: number;
  thread_state: string;
  ladder_level: number;
  followups_used: number;
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
  claims?: Claim[];
  shouldMoveToKillShot?: boolean;
}

interface StartSessionResponse {
  session?: {
    turn_count?: number;
    intensity?: IntensityMode;
  };
  turns?: Array<{
    role: TurnRole;
    speaker_id: string;
    text: string;
    round: RoundType;
    question_type?: string;
  }>;
  claims?: Claim[];
  meters?: Record<string, number>;
}

export default function SessionStagePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [convictions, setConvictions] = useState<Record<string, number>>({});
  const [turns, setTurns] = useState<Turn[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [currentRound, setCurrentRound] = useState("opening");
  const [turnCount, setTurnCount] = useState(0);
  const [intensity, setIntensity] = useState<IntensityMode>("tough");
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);

  // Streaming and user input states
  const [answerInput, setAnswerInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingMeta, setStreamingMeta] = useState<StreamingMeta | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLedgerPanel, setShowLedgerPanel] = useState(true);

  const [timerSeconds, setTimerSeconds] = useState(45);
  const isSharkMode = intensity === "shark";
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Shark mode timer tick
  useEffect(() => {
    if (!isSharkMode || isStreaming) return;
    setTimerSeconds(45);
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [turns.length, isSharkMode, isStreaming]);

  // Fetch initial session state
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
                    ? "Marcus Vance (Chair)"
                    : t.role === "founder"
                    ? "You (Founder)"
                    : t.speaker_id.charAt(0).toUpperCase() + t.speaker_id.slice(1),
                text: t.text,
                round: t.round,
                questionType: t.question_type,
              }))
            );
          }
          if (data.claims) setClaims(data.claims);
          if (data.meters) setConvictions(data.meters);
          if (data.session) {
            setTurnCount(data.session.turn_count || 0);
            setIntensity(data.session.intensity || "tough");
          }
        }
      } catch (err: unknown) {
        console.warn("Session fetch error", err);
      }
    }
    initSession();
  }, [sessionId]);

  // Auto-scroll transcript when turns update or text streams
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, streamingText]);

  // Handle founder answer submission via SSE
  const handleSendAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!answerInput.trim() || isStreaming) return;

    const userText = answerInput.trim();
    setAnswerInput("");
    setErrorMessage("");

    // Add user turn immediately to transcript
    const userTurn: Turn = {
      role: "founder",
      speakerId: "founder",
      speakerName: "You (Founder)",
      text: userText,
      round: currentRound,
    };
    setTurns((prev) => [...prev, userTurn]);

    setIsStreaming(true);
    setStreamingText("");
    setStreamingMeta(null);

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
            currentSpeakerName = meta.speakerName;
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
            if (stateData.round) setCurrentRound(stateData.round);
            if (stateData.claims) setClaims(stateData.claims);
            if (stateData.shouldMoveToKillShot) {
              setCurrentRound("kill_shot");
            }
          } else if (eventType === "done") {
            // Commit final investor message to turns
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
            setErrorMessage(parsed.message || "An interrogation engine error occurred");
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection lost. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col justify-between selection:bg-shark-orange selection:text-white">
      {/* Top Bar Landmark */}
      <header className="border-b border-surface-border bg-surface px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              <span aria-hidden="true">🔥</span> GRILLROOM
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-elevated border border-surface-border text-slate-300 font-semibold uppercase tracking-wider">
              {currentRound.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400 font-mono">Turn {turnCount}</span>
          <button
            onClick={() => setShowLedgerPanel(!showLedgerPanel)}
            className="text-xs px-3 py-1.5 rounded-md bg-surface-elevated hover:bg-surface-border text-slate-200 border border-surface-border transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shark-orange"
            aria-expanded={showLedgerPanel}
            aria-controls="claim-ledger-drawer"
          >
            <span aria-hidden="true">📋</span>
            <span className="hidden sm:inline">Claim Ledger</span>
          </button>
          <button
            onClick={() => router.push(`/session/${sessionId}/debrief`)}
            className="text-xs px-3.5 py-1.5 rounded-md bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold shadow hover:opacity-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Pass to Verdict & Debrief
          </button>
        </div>
      </header>

      {/* Investor Panel Conviction Cards */}
      <section aria-label="Investor Panel Conviction Meters" className="bg-surface/80 border-b border-surface-border px-6 py-3">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { id: "rohan", name: "Rohan", archetype: "CFO / Numbers", color: "#EF4444" },
            { id: "meera", name: "Meera", archetype: "Growth VC", color: "#3B82F6" },
            { id: "arjun", name: "Dr. Arjun", archetype: "Deep Tech", color: "#8B5CF6" },
            { id: "kavya", name: "Kavya", archetype: "Customer Voice", color: "#10B981" },
            { id: "sam", name: "Sam", archetype: "Seed Angel", color: "#F59E0B" },
          ].map((inv) => {
            const score = convictions[inv.id] ?? 50;
            const isSpeaking = activeSpeaker === inv.id;
            return (
              <div
                key={inv.id}
                className={`p-3 rounded-lg border transition-all ${
                  isSpeaking
                    ? "bg-surface-elevated border-shark-orange shadow-lg glow-orange-sm ring-1 ring-shark-orange/50"
                    : "bg-surface-card border-surface-border/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2 truncate">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: inv.color }}
                      aria-hidden="true"
                    >
                      {inv.name[0]}
                    </div>
                    <span className="text-xs font-semibold text-slate-200 truncate">{inv.name}</span>
                  </div>
                  {isSpeaking && (
                    <span className="flex h-2 w-2 relative" title="Speaking now">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-shark-orange opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-shark-orange"></span>
                    </span>
                  )}
                </div>

                {/* WCAG Progressbar Conviction Meter */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>Conviction</span>
                    <span className="font-bold text-slate-200">{score}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${inv.name} conviction meter`}
                    aria-valuenow={score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden"
                  >
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${score}%`,
                        backgroundColor:
                          score >= 65 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Content Area: Transcript & Side Panel */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Transcript Container (3 cols) */}
        <section aria-label="Interrogation Transcript" className={`${showLedgerPanel ? "lg:col-span-3" : "lg:col-span-4"} space-y-4`}>
          <div
            className="bg-surface-card border border-surface-border rounded-xl p-4 md:p-6 min-h-[460px] max-h-[620px] overflow-y-auto space-y-4"
            tabIndex={0}
            role="region"
            aria-label="Discussion transcript"
          >
            {turns.length === 0 && (
              <div className="text-center py-16 text-slate-500 text-sm">
                The boardroom is silent. Take your seat and present your responses.
              </div>
            )}

            {turns.map((turn, idx) => (
              <article
                key={idx}
                className={`p-4 rounded-xl text-sm leading-relaxed transition-all ${
                  turn.role === "chair"
                    ? "bg-slate-900/90 border border-slate-700/60 text-slate-300 font-serif italic"
                    : turn.role === "founder"
                    ? "bg-surface-elevated border border-surface-border text-slate-100 ml-6 md:ml-12"
                    : "bg-surface/90 border border-surface-border/80 text-slate-200 mr-6 md:mr-12"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 text-xs font-semibold">
                  <div className="flex items-center space-x-2">
                    <span
                      className={
                        turn.role === "founder"
                          ? "text-shark-orange"
                          : turn.role === "chair"
                          ? "text-slate-400"
                          : "text-amber-400"
                      }
                    >
                      {turn.speakerName}
                    </span>
                    {turn.isInterrupt && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950 text-red-300 border border-red-500/40 uppercase font-bold tracking-wider">
                        Interrupting
                      </span>
                    )}
                    {turn.questionType && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-elevated text-slate-400 border border-surface-border">
                        {turn.questionType.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="whitespace-pre-wrap">{turn.text}</div>
              </article>
            ))}

            {/* Live Streaming Speech with aria-live="polite" */}
            {isStreaming && (
              <div
                aria-live="polite"
                aria-atomic="true"
                className="p-4 rounded-xl text-sm leading-relaxed bg-surface/90 border border-shark-orange/60 text-slate-200 mr-6 md:mr-12 shadow-lg glow-orange-sm animate-pulse"
              >
                <div className="flex items-center space-x-2 mb-1.5 text-xs font-semibold text-shark-orange">
                  <span>{streamingMeta?.speakerName || "Investor speaking..."}</span>
                  {streamingMeta?.isInterrupt && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950 text-red-300 border border-red-500/40 uppercase font-bold tracking-wider">
                      Interrupting
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap">
                  {streamingText || "Formulating inquiry..."}
                  <span className="inline-block w-1.5 h-4 ml-1 bg-shark-orange animate-bounce" aria-hidden="true"></span>
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Answer Input Console */}
          <form onSubmit={handleSendAnswer} className="space-y-2">
            {errorMessage && (
              <div role="alert" className="p-3 bg-red-950/60 border border-red-500/50 rounded-lg text-xs text-red-200">
                {errorMessage}
              </div>
            )}

            {isSharkMode && !isStreaming && (
              <div className="flex items-center justify-between px-3 py-1 bg-red-950/30 border border-red-500/30 rounded-lg text-xs text-red-300 font-mono">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" aria-hidden="true"></span>
                  GRILLROOM TIMER
                </span>
                <span className={timerSeconds <= 10 ? "text-red-400 font-extrabold animate-pulse" : ""}>
                  {timerSeconds}s remaining to answer
                </span>
              </div>
            )}
            <div className="relative">
              <label htmlFor="answer-input" className="sr-only">
                Your Answer to the Panel
              </label>
              <textarea
                id="answer-input"
                rows={3}
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                placeholder={
                  isStreaming
                    ? "The panel is questioning you..."
                    : "Respond directly. State your numbers, sources, and methods. (Ctrl+Enter to send)"
                }
                className="w-full bg-surface-card border border-surface-border focus:border-shark-orange rounded-xl p-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-shark-orange transition-all font-sans text-sm resize-none disabled:opacity-50"
              />
              <div className="absolute bottom-3 right-3 flex items-center space-x-3">
                <span className="text-[11px] text-slate-500 hidden sm:inline">Ctrl+Enter to send</span>
                <button
                  id="send-answer-btn"
                  type="submit"
                  disabled={isStreaming || !answerInput.trim()}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    isStreaming || !answerInput.trim()
                      ? "bg-slate-700 opacity-50 cursor-not-allowed"
                      : "bg-shark-orange hover:bg-orange-600 glow-orange-sm"
                  }`}
                >
                  {isStreaming ? "Listening..." : "Submit Answer"}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Claim Ledger Side Panel (1 col) */}
        {showLedgerPanel && (
          <aside
            id="claim-ledger-drawer"
            aria-label="What the Panel Noticed Claim Ledger"
            className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h2 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                <span aria-hidden="true">🔍</span> What The Panel Noticed
              </h2>
              <span className="text-xs text-slate-400 font-mono">{claims.length} claims</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Every assertion you make is tracked. Unverified numbers and evasions will be attacked.
            </p>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {claims.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-8">
                  No claims recorded yet. Present your opening pitch.
                </div>
              )}
              {claims.map((c) => (
                <div
                  key={c.id}
                  className={`p-2.5 rounded-lg border text-xs space-y-1 transition-all ${
                    c.status === "contradicted"
                      ? "bg-red-950/40 border-red-500/50 text-red-200"
                      : c.status === "evidenced"
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                      : "bg-surface-elevated border-surface-border text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono uppercase font-bold text-slate-400">
                      #{c.id} [{c.category}]
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-semibold uppercase ${
                        c.status === "evidenced"
                          ? "bg-emerald-900/60 text-emerald-300"
                          : c.status === "contradicted"
                          ? "bg-red-900/60 text-red-300"
                          : "bg-amber-900/60 text-amber-300"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2">{c.claim_text}</p>
                </div>
              ))}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
