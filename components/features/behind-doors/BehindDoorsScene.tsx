"use client";

import React, { useState, useEffect } from "react";
import { FEATURE_BEHIND_DOORS } from "@/lib/features/flags";
import { BehindDoorsSceneData, BehindDoorsDialogueTurn } from "@/lib/features/behind-doors/normalizeScene";
import { INVESTOR_PERSONAS } from "@/lib/engine/personas";
import { Button } from "@/components/ui/Button";
import { Volume2, Play, Eye, Quote, ShieldAlert } from "lucide-react";
import { logger } from "@/lib/logger";

export interface BehindDoorsSceneProps {
  sessionId: string;
  className?: string;
}

const TONE_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  skeptical: {
    label: "Skeptical",
    bg: "bg-amber-950/60",
    text: "text-amber-300",
    border: "border-amber-700/50",
  },
  bullish: {
    label: "Bullish",
    bg: "bg-emerald-950/60",
    text: "text-emerald-300",
    border: "border-emerald-700/50",
  },
  intrigued: {
    label: "Intrigued",
    bg: "bg-cyan-950/60",
    text: "text-cyan-300",
    border: "border-cyan-700/50",
  },
  dismissive: {
    label: "Dismissive",
    bg: "bg-rose-950/60",
    text: "text-rose-300",
    border: "border-rose-700/50",
  },
  analytical: {
    label: "Analytical",
    bg: "bg-purple-950/60",
    text: "text-purple-300",
    border: "border-purple-700/50",
  },
};

export const BehindDoorsScene: React.FC<BehindDoorsSceneProps> = ({
  sessionId,
  className = "",
}) => {
  const [data, setData] = useState<BehindDoorsSceneData | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!FEATURE_BEHIND_DOORS || !sessionId) return;

    setLoading(true);
    fetch("/api/session/behind-doors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load scene");
        return res.json();
      })
      .then((json: BehindDoorsSceneData) => {
        setData(json);
        // By default reveal all or start at all
        setRevealedCount(json.dialogue.length);
      })
      .catch((err) => {
        logger.warn("Failed to load behind doors scene data", "BehindDoorsScene", { err: String(err) });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sessionId]);

  // Stepped playback effect
  useEffect(() => {
    if (!isPlaying || !data) return;

    if (revealedCount >= data.dialogue.length) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setRevealedCount((prev) => prev + 1);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isPlaying, revealedCount, data]);

  if (!FEATURE_BEHIND_DOORS) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-[#0B132B] text-slate-200 border border-[#D4AF37]/30 rounded-panel p-8 shadow-2xl animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-amber-400/80 animate-ping" />
          <span className="text-xs uppercase font-bold tracking-widest text-[#D4AF37]">
            Tapping confidential boardroom audio...
          </span>
        </div>
      </div>
    );
  }

  if (!data || !data.dialogue || data.dialogue.length === 0) {
    return null;
  }

  const handleReplay = () => {
    setRevealedCount(1);
    setIsPlaying(true);
  };

  const handleShowAll = () => {
    setIsPlaying(false);
    setRevealedCount(data.dialogue.length);
  };

  return (
    <section
      className={`bg-gradient-to-b from-[#0F172A] via-[#111C38] to-[#0A0F1D] text-slate-100 border border-[#D4AF37]/40 rounded-panel p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden ${className}`}
      aria-label="Behind Closed Doors Deliberation"
    >
      {/* Background Accent Flare */}
      <div
        className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Header Banner */}
      <div className="border-b border-slate-800/80 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-950/80 text-rose-300 border border-red-700/60 animate-pulse">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              CONFIDENTIAL EAVESDROP
            </span>
            <span className="text-xs text-slate-400 font-mono">
              [Off The Record]
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
            Behind Closed Doors: Partner Deliberation
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            What the investment panel said immediately after you disconnected from the room.
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 no-print">
          {revealedCount < data.dialogue.length ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShowAll}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
              className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            >
              Show All
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReplay}
              leftIcon={<Play className="w-3.5 h-3.5 text-cta" />}
              className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            >
              Replay Audio
            </Button>
          )}
        </div>
      </div>

      {/* Stage Setting Direction */}
      {data.scene_setting && (
        <div className="p-3.5 bg-slate-900/80 border-l-2 border-[#D4AF37] rounded-r text-xs text-slate-300 italic font-sans flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
          <span>{data.scene_setting}</span>
        </div>
      )}

      {/* Dialogue Stream */}
      <div className="space-y-4">
        {data.dialogue.slice(0, revealedCount).map((turn: BehindDoorsDialogueTurn, idx: number) => {
          const persona = INVESTOR_PERSONAS[turn.speaker] || {
            name: turn.speaker_name || "Partner",
            archetype: "Venture Partner",
            avatarColor: "#D4572B",
          };
          const toneStyle = TONE_STYLES[turn.tone] || TONE_STYLES.analytical;
          const speakerName = turn.speaker_name || persona.name || "Partner";

          return (
            <div
              key={idx}
              className="flex items-start gap-3.5 sm:gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {/* Partner Avatar Badge */}
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs text-white shadow-md border border-white/20"
                style={{ backgroundColor: persona.avatarColor }}
                title={`${speakerName} (${persona.archetype})`}
              >
                {speakerName.slice(0, 1)}
              </div>

              {/* Message Bubble */}
              <div className="flex-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl rounded-tl-sm p-4 space-y-2 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {speakerName}
                    </span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      • {persona.archetype}
                    </span>
                  </div>

                  {/* Tone indicator */}
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${toneStyle.bg} ${toneStyle.text} ${toneStyle.border}`}
                  >
                    {toneStyle.label}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                  &ldquo;{turn.text}&rdquo;
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deliberation Consensus & Parting Shot */}
      {revealedCount >= data.dialogue.length && (
        <div className="pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
          {/* Room Consensus */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-panel p-5 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37] block">
              Room Consensus
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {data.consensus}
            </p>
          </div>

          {/* Parting Shot Quote */}
          <div className="bg-slate-900/90 border border-[#D4AF37]/50 rounded-panel p-5 space-y-2 relative overflow-hidden">
            <Quote className="w-12 h-12 text-[#D4AF37]/10 absolute -bottom-2 -right-2 pointer-events-none" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-cta block">
              The Parting Shot
            </span>
            <p className="text-xs sm:text-sm font-serif italic text-amber-200 leading-relaxed">
              &ldquo;{data.parting_quote}&rdquo;
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
