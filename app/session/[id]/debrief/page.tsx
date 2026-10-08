"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface VerdictItem {
  investor_id: string;
  decision: "In" | "Conditional" | "Out";
  reason: string;
  condition: string;
  simulated_offer: string;
}

interface WeaknessItem {
  exchange: string;
  failed_criterion: string;
  explanation: string;
  most_affected_investor: string;
}

interface StrongerAnswerItem {
  question: string;
  rewrite: string;
}

interface ContradictionItem {
  turn_numbers: string;
  suggested_consistent_position: string;
}

interface DebriefReport {
  readiness_score: number;
  verdicts: VerdictItem[];
  top_weaknesses: WeaknessItem[];
  stronger_answers: StrongerAnswerItem[];
  contradictions: ContradictionItem[];
  expected_questions: string[];
  evidence_plan: string[];
  tightened_pitch: string;
}

export default function DebriefPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [report, setReport] = useState<DebriefReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Retry modal state
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [revisedPitch, setRevisedPitch] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    async function fetchDebrief() {
      try {
        setLoading(true);
        // Call debrief endpoint
        const res = await fetch("/api/session/debrief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to load debrief report");
        }

        const data: DebriefReport = await res.json();
        setReport(data);
        if (data.tightened_pitch) {
          setRevisedPitch(data.tightened_pitch);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load report";
        setErrorMsg(message);
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) fetchDebrief();
  }, [sessionId]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExecuteRetry = async () => {
    if (!revisedPitch.trim() || revisedPitch.length < 50) return;
    setIsRetrying(true);
    try {
      const res = await fetch("/api/session/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          revisedPitch,
        }),
      });

      const data = (await res.json()) as { newSessionId?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Retry failed");

      if (data.newSessionId) {
        router.push(`/session/${data.newSessionId}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error creating retry session";
      alert(message);
      setIsRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-shark-orange/30 border-t-shark-orange rounded-full animate-spin"></div>
        <p className="text-slate-400 font-mono text-sm">Compiling Boardroom Debrief & Simulated Offers...</p>
      </div>
    );
  }

  if (errorMsg || !report) {
    return (
      <div className="min-h-screen bg-background text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-4 bg-red-950/60 border border-red-500/50 rounded-xl max-w-md text-center text-sm text-red-200">
          {errorMsg || "Unable to display debrief"}
        </div>
        <Link
          href={`/session/${sessionId}`}
          className="text-xs text-shark-orange hover:underline font-mono"
        >
          &larr; Return to Stage
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
          <span className="text-xs text-slate-500 font-mono">/ Debrief Dossier</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowRetryModal(true)}
            className="text-xs px-4 py-2 rounded-lg bg-gradient-to-r from-shark-orange to-amber-600 text-white font-bold uppercase tracking-wider shadow glow-orange-sm hover:scale-[1.02] transition-all"
          >
            Retry with Improved Pitch
          </button>
        </div>
      </header>

      {/* Main Debrief Container */}
      <main id="main-content" className="max-w-5xl mx-auto w-full px-4 md:px-6 py-8 space-y-10 flex-1">
        {/* Readiness Score & Verdict Overview */}
        <section aria-label="The Boardroom Verdict" className="bg-surface-card border border-surface-border rounded-xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-surface-border pb-6">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold font-mono">
                Executive Diligence Summary
              </span>
              <h1 className="text-3xl font-extrabold text-white">The Boardroom Verdict</h1>
              <p className="text-sm text-slate-400">
                Final algorithmic decisions computed strictly from conviction thresholds and claim verification.
              </p>
            </div>

            {/* Readiness Gauge */}
            <div className="flex items-center space-x-4 bg-surface-elevated border border-surface-border p-4 rounded-xl">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-border"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={
                      report.readiness_score >= 65
                        ? "text-emerald-500"
                        : report.readiness_score >= 40
                        ? "text-amber-500"
                        : "text-red-500"
                    }
                    strokeDasharray={`${report.readiness_score}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-bold font-mono text-white">{report.readiness_score}</span>
                  <span className="text-[9px] block text-slate-400 font-mono">/ 100</span>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-300 block">Investor Readiness</span>
                <span className="text-[11px] text-slate-400">
                  {report.readiness_score >= 65
                    ? "Fundable with diligence"
                    : report.readiness_score >= 40
                    ? "Conditional interest"
                    : "Pass - Needs rework"}
                </span>
              </div>
            </div>
          </div>

          {/* Investor Verdict Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.verdicts.map((v) => {
              const badgeClass =
                v.decision === "In"
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/60"
                  : v.decision === "Conditional"
                  ? "bg-amber-950/80 text-amber-300 border-amber-500/60"
                  : "bg-red-950/80 text-red-300 border-red-500/60";

              return (
                <div
                  key={v.investor_id}
                  className="bg-surface-elevated border border-surface-border rounded-xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {v.investor_id}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${badgeClass}`}>
                      {v.decision}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="text-slate-300 leading-relaxed font-sans">{v.reason}</p>
                    {v.condition && (
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-surface-border/40">
                        <span className="font-semibold text-slate-300">Condition: </span>
                        {v.condition}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-surface-border/60">
                    <div className="text-[10px] uppercase font-mono text-slate-500">Simulated Offer</div>
                    <div className="text-xs font-bold text-shark-orange truncate">{v.simulated_offer}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Top 3 Diligence Weaknesses */}
        <section className="bg-surface-card border border-surface-border rounded-xl p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <span>⚠️</span> Top 3 Diligence Weaknesses
            </h2>
            <span className="text-xs text-slate-400">Anchored in Claim Ledger</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {report.top_weaknesses.map((w, idx) => (
              <div
                key={idx}
                className="bg-surface-elevated border border-surface-border rounded-xl p-4 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/40">
                      Failed: {w.failed_criterion}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Impacts {w.most_affected_investor}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200">{w.exchange}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{w.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Evidence-Only Stronger Rewrites */}
        <section className="bg-surface-card border border-surface-border rounded-xl p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div>
              <h2 className="font-bold text-lg text-white flex items-center gap-2">
                <span>🎯</span> Evidence-Only Rewrites
              </h2>
              <p className="text-xs text-slate-400">
                Rewrites strictly use facts you provided or visible placeholders. Zero invented metrics.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {report.stronger_answers.map((sa, idx) => (
              <div key={idx} className="bg-surface-elevated border border-surface-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span className="text-amber-400">Q: &ldquo;{sa.question}&rdquo;</span>
                  <button
                    onClick={() => copyToClipboard(sa.rewrite, `rewrite-${idx}`)}
                    className="text-[11px] text-shark-orange hover:underline flex items-center gap-1 font-mono"
                  >
                    {copiedKey === `rewrite-${idx}` ? "✓ Copied" : "Copy Rewrite"}
                  </button>
                </div>
                <div className="p-3 bg-background rounded-lg text-xs leading-relaxed text-slate-200 border border-surface-border/60 font-mono">
                  {sa.rewrite}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contradictions & Anticipated Questions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contradictions */}
          <section className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <span>⚡</span> Contradiction Resolution
            </h3>
            {report.contradictions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No major contradictions detected across turns.</p>
            ) : (
              <div className="space-y-3">
                {report.contradictions.map((c, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-surface-elevated border border-surface-border text-xs space-y-1">
                    <span className="font-mono text-red-400 font-bold block">{c.turn_numbers}</span>
                    <p className="text-slate-300 leading-relaxed">{c.suggested_consistent_position}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Expected Questions */}
          <section className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <span>❓</span> 5 Questions to Prepare For Next
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
              {report.expected_questions.map((q, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span className="text-slate-200">{q}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 7-Day Evidence Plan */}
        <section className="bg-surface-card border border-surface-border rounded-xl p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <span>📅</span> 7-Day Evidence Action Plan
            </h2>
            <span className="text-xs text-slate-400">Pre-investment sprint checklist</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {report.evidence_plan.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-3 p-3 rounded-lg bg-surface-elevated border border-surface-border text-xs text-slate-300"
              >
                <input type="checkbox" id={`task-${idx}`} className="mt-0.5 accent-shark-orange rounded" />
                <label htmlFor={`task-${idx}`} className="cursor-pointer leading-relaxed">
                  {item}
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Tightened 30-Second Pitch */}
        <section className="bg-surface-card border border-shark-orange/40 rounded-xl p-6 md:p-8 space-y-4 glow-subtle">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <span>🚀</span> Tightened 30-Second Elevator Pitch
            </h2>
            <button
              onClick={() => copyToClipboard(report.tightened_pitch, "tightened-pitch")}
              className="text-xs text-shark-orange hover:underline font-mono"
            >
              {copiedKey === "tightened-pitch" ? "✓ Copied" : "Copy Pitch"}
            </button>
          </div>

          <div className="p-4 bg-background border border-surface-border rounded-xl text-sm leading-relaxed text-slate-200 font-mono">
            {report.tightened_pitch}
          </div>
        </section>
      </main>

      {/* Retry Modal */}
      {showRetryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="font-bold text-lg text-white">Retry with Improved Pitch</h3>
              <button
                onClick={() => setShowRetryModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Use your tightened 30-second pitch or revised numbers. A new linked session will be created
              allowing side-by-side conviction and thread comparison.
            </p>

            <textarea
              rows={6}
              value={revisedPitch}
              onChange={(e) => setRevisedPitch(e.target.value)}
              className="w-full bg-background border border-surface-border focus:border-shark-orange rounded-lg p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none resize-none font-sans"
              placeholder="Paste your improved pitch..."
            />

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowRetryModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 border border-surface-border"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRetry}
                disabled={isRetrying || revisedPitch.length < 50}
                className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-shark-orange hover:bg-orange-600 transition-all glow-orange-sm disabled:opacity-50"
              >
                {isRetrying ? "Launching New Session..." : "Launch Retry Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-surface-border/50 py-6 px-6 text-center text-xs text-slate-500">
        Simulated investors for practice. Verdicts do not predict real investment decisions.
      </footer>
    </div>
  );
}
