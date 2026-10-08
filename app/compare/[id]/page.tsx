"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { INVESTOR_PERSONAS } from "@/lib/engine/personas";

interface CompareData {
  originalSessionId: string;
  retrySessionId: string | null;
  panelIds: string[];
  convictions: {
    original: Record<string, number>;
    retry: Record<string, number>;
  };
  unresolvedThreads: {
    original: number;
    retry: number;
  };
  criteriaScores: {
    original: Record<string, number>;
    retry: Record<string, number>;
  };
  overallDelta: number;
}

export default function ComparePage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function fetchCompare() {
      try {
        setLoading(true);
        const res = await fetch(`/api/session/compare?sessionId=${sessionId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to load comparison");
        }
        const json = (await res.json()) as CompareData;
        setData(json);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load comparison";
        setErrorMsg(message);
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) fetchCompare();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-shark-orange/30 border-t-shark-orange rounded-full animate-spin"></div>
        <p className="text-slate-400 font-mono text-sm">Evaluating Pitch Progression & Conviction Deltas...</p>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-background text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-4 bg-red-950/60 border border-red-500/50 rounded-xl max-w-md text-center text-sm text-red-200">
          {errorMsg || "Unable to display comparison"}
        </div>
        <Link href="/" className="text-xs text-shark-orange hover:underline font-mono">
          &larr; Return to Pit
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col justify-between selection:bg-shark-orange selection:text-white">
      {/* Header */}
      <header className="border-b border-surface-border bg-surface px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-3">
          <Link href="/" className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
            <span>🔥</span> GRILLROOM
          </Link>
          <span className="text-xs text-slate-500 font-mono">/ Comparative Audit</span>
        </div>
        <div className="flex items-center space-x-3">
          {data.retrySessionId && (
            <Link
              href={`/session/${data.retrySessionId}`}
              className="text-xs px-4 py-2 rounded-lg bg-shark-orange text-white font-bold uppercase tracking-wider glow-orange-sm hover:bg-orange-600 transition-all"
            >
              Resume Retry Stage &rarr;
            </Link>
          )}
        </div>
      </header>

      {/* Main Comparison Container */}
      <main id="main-content" className="max-w-5xl mx-auto w-full px-4 md:px-6 py-8 space-y-10 flex-1">
        {/* Top Header Card with Overall Delta */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold font-mono">
              Before vs After Progression
            </span>
            <h1 className="text-3xl font-extrabold text-white">Simulation Comparison</h1>
            <p className="text-sm text-slate-400">
              Measuring the impact of your tightened pitch, verified claims, and eliminated contradictions.
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-surface-elevated border border-surface-border p-4 rounded-xl">
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-400 block font-mono">Overall Delta</span>
              <span
                className={`text-3xl font-extrabold font-mono ${
                  data.overallDelta >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {data.overallDelta >= 0 ? `+${data.overallDelta}` : data.overallDelta}%
              </span>
            </div>
            <div className="text-xs text-slate-400 border-l border-surface-border pl-4">
              <span>Unresolved Threads: </span>
              <span className="font-mono text-slate-200">
                {data.unresolvedThreads.original} &rarr; {data.unresolvedThreads.retry}
              </span>
            </div>
          </div>
        </div>

        {/* Per-Investor Conviction Comparison */}
        <section className="bg-surface-card border border-surface-border rounded-xl p-6 md:p-8 space-y-6">
          <div className="border-b border-surface-border pb-3">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <span>📈</span> Per-Investor Conviction Progression
            </h2>
            <p className="text-xs text-slate-400">
              How each panelist responded to your tightened narrative and validated metrics.
            </p>
          </div>

          <div className="space-y-5">
            {data.panelIds.map((id) => {
              const persona = INVESTOR_PERSONAS[id] || { name: id, archetype: "Investor" };
              const origScore = data.convictions.original[id] ?? 50;
              const retryScore = data.convictions.retry[id] ?? origScore;
              const delta = retryScore - origScore;

              return (
                <div key={id} className="bg-surface-elevated border border-surface-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-200 text-sm">{persona.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">({persona.archetype})</span>
                    </div>
                    <span
                      className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                        delta >= 0
                          ? "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                          : "bg-red-950 text-red-300 border-red-500/50"
                      }`}
                    >
                      {delta >= 0 ? `+${delta}%` : `${delta}%`}
                    </span>
                  </div>

                  {/* Dual Bar Comparison */}
                  <div className="space-y-2">
                    {/* Original Session Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>Original Pitch</span>
                        <span>{origScore}%</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-slate-500 rounded-full"
                          style={{ width: `${origScore}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Retry Session Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-shark-orange font-mono font-semibold">
                        <span>Revised Pitch</span>
                        <span>{retryScore}%</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-shark-orange rounded-full"
                          style={{ width: `${retryScore}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5 Diligence Criteria Progression */}
        <section className="bg-surface-card border border-surface-border rounded-xl p-6 md:p-8 space-y-6">
          <div className="border-b border-surface-border pb-3">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <span>🎯</span> Diligence Criteria Averages
            </h2>
            <p className="text-xs text-slate-400">
              Evaluated on anchored 0–10 rubrics across directness, specificity, evidence, logic, and honesty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { key: "directness", label: "Directness" },
              { key: "specificity", label: "Specificity" },
              { key: "evidence", label: "Evidence" },
              { key: "logic", label: "Logic" },
              { key: "honesty", label: "Honesty" },
            ].map((crit) => {
              const origVal = data.criteriaScores.original[crit.key] ?? 5;
              const retryVal = data.criteriaScores.retry[crit.key] ?? origVal;
              const diff = Math.round((retryVal - origVal) * 10) / 10;

              return (
                <div
                  key={crit.key}
                  className="bg-surface-elevated border border-surface-border rounded-xl p-4 text-center space-y-2"
                >
                  <span className="text-xs font-semibold text-slate-300 block">{crit.label}</span>
                  <div className="flex items-center justify-center space-x-2 font-mono">
                    <span className="text-sm text-slate-400">{origVal}</span>
                    <span className="text-xs text-slate-600">&rarr;</span>
                    <span className="text-base font-bold text-white">{retryVal}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono block ${
                      diff >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {diff >= 0 ? `+${diff}` : diff} pts
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border/50 py-6 px-6 text-center text-xs text-slate-500">
        Simulated investors for practice. Verdicts do not predict real investment decisions.
      </footer>
    </div>
  );
}
