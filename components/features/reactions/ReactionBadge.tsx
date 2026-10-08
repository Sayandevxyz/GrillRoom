"use client";

import React, { useState, useEffect } from "react";
import { FEATURE_REACTIONS } from "@/lib/features/flags";
import { getReaction } from "@/lib/features/reactions/getReaction";

interface ReactionBadgeProps {
  investorId: string;
  delta?: number;
}

/**
 * ReactionBadge: displays investor reaction emoji and mood label based on conviction delta.
 * Features:
 * - Gated behind FEATURE_REACTIONS
 * - Subtle scale/shake animation when mood shifts
 * - Zero rendering if delta is undefined or flag is OFF
 */
export const ReactionBadge: React.FC<ReactionBadgeProps> = ({ delta }) => {
  if (!FEATURE_REACTIONS || delta === undefined || delta === null) {
    return null;
  }

  const reaction = getReaction(delta);
  if (!reaction) {
    return null;
  }

  return <ReactionBadgeClient reaction={reaction} delta={delta} />;
};

function ReactionBadgeClient({
  reaction,
  delta,
}: {
  reaction: { mood: string; emoji: string; label: string };
  delta: number;
}) {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 450);
    return () => clearTimeout(timer);
  }, [reaction.mood, delta]);

  const moodColors: Record<string, string> = {
    furious: "bg-red-50 text-red-700 border-red-200",
    skeptical: "bg-amber-50 text-amber-700 border-amber-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    interested: "bg-emerald-50 text-emerald-700 border-emerald-200",
    impressed: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const colorClass = moodColors[reaction.mood] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      title={`Panelist mood: ${reaction.label} (${delta > 0 ? `+${delta}` : delta} conviction shift)`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-transform duration-200 select-none ${colorClass} ${
        animating ? "scale-110 -rotate-3" : "scale-100 rotate-0"
      }`}
    >
      <span className="text-[11px] leading-none" aria-hidden="true">
        {reaction.emoji}
      </span>
      <span className="hidden sm:inline capitalize font-semibold">{reaction.label}</span>
    </span>
  );
}
