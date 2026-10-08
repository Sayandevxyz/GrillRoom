"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import {
  Printer,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  CalendarCheck,
  HelpCircle,
} from "lucide-react";
import { PitchRadar } from "@/components/features/radar/PitchRadar";
import { ShareCardButton } from "@/components/features/share-card/ShareCardButton";

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

const INVESTOR_PROFILES: Record<
  string,
  { name: string; title: string; initials: string }
> = {
  rohan: { name: "Rohan Mehta", title: "Unit Economics Partner", initials: "RM" },
  meera: { name: "Meera Shah", title: "Market and GTM Investor", initials: "MS" },
  arjun: { name: "Dr. Arjun Rao", title: "Product and Technical Moat", initials: "AR" },
  kavya: { name: "Kavya Sen", title: "Customer Proof Analyst", initials: "KS" },
  sam: { name: "Sam Kapoor", title: "Founder and Deal Terms Partner", initials: "SK" },
};

export default function DebriefReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [report, setReport] = useState<DebriefReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});

  // Retry modal state
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [revisedPitch, setRevisedPitch] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    async function fetchDebrief() {
      try {
        setLoading(true);
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

  const copyPitch = () => {
    if (!report?.tightened_pitch) return;
    navigator.clipboard.writeText(report.tightened_pitch);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const toggleTask = (index: number) => {
    setCompletedTasks((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleExecuteRetry = async () => {
    if (!revisedPitch.trim() || revisedPitch.length < 50) return;
    setIsRetrying(true);
    try {
      const res = await fetch("/api/session/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, revisedPitch }),
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-3 border-navy/20 border-t-navy rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="font-serif font-bold text-navy text-base">
            Compiling Investor Readiness Report
          </p>
          <p className="text-xs text-text-2">
            Evaluating evidence scores, resolving claim states, and calibrating final term sheets...
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-field max-w-md text-center text-xs text-danger font-medium">
          {errorMsg || "Unable to display debrief report"}
        </div>
        <Link href={`/session/${sessionId}`} className="text-xs text-navy font-semibold underline">
          &larr; Return to session stage
        </Link>
      </div>
    );
  }

  const score = report.readiness_score;
  const scoreRating =
    score >= 70
      ? "Investor-ready"
      : score >= 50
      ? "Approaching ready"
      : "Not yet ready";

  // Score Ring calculation (radius 52)
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (score / 100) * circumference;

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="bg-navy text-white px-6 py-3.5 border-b border-slate-800 sticky top-0 z-30 shadow-md no-print">
        <div className="max-w-page mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center" aria-label="GrillRoom Home">
              <Image
                src="/brand/grillroom-logo.png"
                alt="GrillRoom"
                width={120}
                height={30}
                priority
                className="h-7 w-auto object-contain"
              />
            </Link>
            <span className="text-xs text-slate-400 border-l border-slate-700 pl-4 hidden sm:inline">
              Investor Readiness Report
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Save as PDF
            </Button>

            <ShareCardButton sessionId={sessionId} readinessScore={score} />

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowRetryModal(true)}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Retry with Improved Pitch
            </Button>
          </div>
        </div>
      </header>

      {/* Main Memo Container */}
      <main id="main-content" className="flex-1 max-w-page mx-auto w-full px-4 md:px-6 py-8 md:py-12">
        <article className="panel bg-white p-6 sm:p-10 md:p-12 space-y-10 shadow-panel">
          {/* Section 1: Memo Header */}
          <header className="border-b border-border pb-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark">
                Confidential Partner Memo
              </span>
              <span className="text-xs font-mono tabular-nums text-text-2">
                Ref: #GR-{sessionId.slice(0, 8).toUpperCase()}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-4xl font-serif font-bold text-navy tracking-tight">
                Investor Readiness Report
              </h1>
              <p className="text-xs sm:text-sm text-text-2 mt-1">
                Formal investment readiness audit and simulated partner deliberation.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs border-t border-border/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-text-2 block">Evaluation Date</span>
                <span className="font-semibold text-text">
                  {new Date().toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-text-2 block">Panel Composition</span>
                <span className="font-semibold text-text">5 Venture Partners</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-text-2 block">Interrogation Scope</span>
                <span className="font-semibold text-text">Unit Economics & Moat</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-text-2 block">Audit Assessment</span>
                <span className="font-semibold text-navy">{scoreRating}</span>
              </div>
            </div>
          </header>

          {/* Section 2: Readiness Score Ring */}
          <section className="bg-surface-2/60 border border-border rounded-panel p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            {/* SVG Score Ring */}
            <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="stroke-slate-200 fill-none"
                  strokeWidth="10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="stroke-navy fill-none transition-all duration-700 ease-out"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold font-sans tabular-nums text-navy">
                  {score}
                </span>
                <span className="text-[10px] uppercase font-semibold text-text-2">Out of 100</span>
              </div>
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-lg font-serif font-bold text-navy">
                  {scoreRating}
                </span>
                <Chip
                  variant={score >= 70 ? "verified" : score >= 50 ? "warning" : "danger"}
                  size="sm"
                  label={`${score} / 100`}
                />
              </div>
              <p className="text-xs sm:text-sm text-text leading-relaxed">
                {score >= 70
                  ? "Your pitch demonstrated defensible unit economics, observed customer traction, and quantitative rigor. The panel validated your core assertions with minimal unresolved risk."
                  : score >= 50
                  ? "Your narrative carries market potential but lacks rigorous customer proof points and unit payback validation. Several key claims were left unevidenced under pressure."
                  : "Critical diligence vulnerabilities detected. Contradictions in reported metrics or unsupported TAM statements lowered partner conviction."}
              </p>
            </div>
          </section>

          {/* Section 2.5: Pitch DNA Radar (Feature Flagged) */}
          <PitchRadar sessionId={sessionId} className="no-print" />

          {/* Section 3: Investor Verdicts Table */}
          <section className="space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark block">
                Partner Deliberation
              </span>
              <h2 className="text-xl font-serif font-bold text-navy">
                Investor Verdicts
              </h2>
            </div>

            <div className="overflow-x-auto border border-border rounded-panel">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-2 border-b border-border text-text-2 uppercase text-[10px] tracking-wider">
                    <th className="p-3.5 font-bold">Investor</th>
                    <th className="p-3.5 font-bold">Focus</th>
                    <th className="p-3.5 font-bold">Verdict</th>
                    <th className="p-3.5 font-bold">Primary Rationale</th>
                    <th className="p-3.5 font-bold">Simulated Offer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.verdicts.map((v) => {
                    const prof = INVESTOR_PROFILES[v.investor_id] || {
                      name: v.investor_id,
                      title: "Partner",
                      initials: v.investor_id.charAt(0).toUpperCase(),
                    };

                    const verdictVariant =
                      v.decision === "In"
                        ? "verified"
                        : v.decision === "Conditional"
                        ? "warning"
                        : "danger";

                    return (
                      <tr key={v.investor_id} className="hover:bg-slate-50/60 transition-subtle">
                        <td className="p-3.5 font-bold text-navy whitespace-nowrap">
                          {prof.name}
                        </td>
                        <td className="p-3.5 text-text-2 whitespace-nowrap">
                          {prof.title}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <Chip variant={verdictVariant} size="sm" label={v.decision} />
                        </td>
                        <td className="p-3.5 text-text max-w-xs leading-relaxed">
                          {v.reason}
                          {v.condition && (
                            <span className="block text-[11px] text-text-2 mt-1 italic">
                              Condition: {v.condition}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {v.simulated_offer ? (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-navy block tabular-nums">
                                {v.simulated_offer}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                Simulated
                              </span>
                            </div>
                          ) : (
                            <span className="text-text-2 italic">Passed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4: Key Risks */}
          {report.top_weaknesses && report.top_weaknesses.length > 0 && (
            <section className="space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark block">
                  Diligence Vulnerabilities
                </span>
                <h2 className="text-xl font-serif font-bold text-navy">
                  Key Risks & Objections
                </h2>
              </div>

              <div className="space-y-3">
                {report.top_weaknesses.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-field border border-border bg-white flex flex-col sm:flex-row items-start justify-between gap-3 shadow-subtle"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Chip
                          variant={idx === 0 ? "danger" : "warning"}
                          size="sm"
                          label={idx === 0 ? "High Severity" : "Medium Severity"}
                        />
                        <span className="text-xs font-bold text-navy">
                          Criterion: {w.failed_criterion}
                        </span>
                        <span className="text-xs text-text-2">• {w.exchange}</span>
                      </div>
                      <p className="text-xs text-text leading-relaxed font-medium">
                        {w.explanation}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0 text-[11px] text-text-2">
                      <span>Raised by: </span>
                      <strong className="text-navy">{w.most_affected_investor}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 5: Contradiction Resolution Matrix (if any) */}
          {report.contradictions && report.contradictions.length > 0 && (
            <section className="space-y-3 p-5 rounded-panel bg-red-50/40 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-danger" aria-hidden="true" />
                <h3 className="text-sm font-bold text-danger uppercase tracking-wider">
                  Contradiction Resolution Matrix
                </h3>
              </div>
              <p className="text-xs text-text-2 leading-relaxed">
                The panel noted discrepancies across statements. Adopt the consistent positions below in future partner calls:
              </p>
              <div className="space-y-2 mt-2">
                {report.contradictions.map((c, i) => (
                  <div key={i} className="p-3 bg-white border border-red-200 rounded-field text-xs space-y-1">
                    <span className="font-bold text-navy block">Turn {c.turn_numbers}</span>
                    <p className="text-text font-medium">{c.suggested_consistent_position}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 6: Stronger Rewrites (with visible gold placeholders) */}
          {report.stronger_answers && report.stronger_answers.length > 0 && (
            <section className="space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark block">
                  Evidence-Grounded Corrections
                </span>
                <h2 className="text-xl font-serif font-bold text-navy">
                  Weakest Answers & Stronger Rewrites
                </h2>
                <p className="text-xs text-text-2 mt-0.5">
                  Missing figures are marked with visible placeholders. Replace them with verified numbers before partner meetings.
                </p>
              </div>

              <div className="space-y-3.5">
                {report.stronger_answers.map((sa, idx) => (
                  <div key={idx} className="p-4 rounded-field border border-border bg-white space-y-2 shadow-subtle">
                    <span className="text-xs font-bold text-text-2 block">
                      Question: &ldquo;{sa.question}&rdquo;
                    </span>

                    <div className="p-3 bg-slate-50 border border-border/80 rounded-field text-xs leading-relaxed text-text">
                      <span className="text-[10px] uppercase font-bold text-gold-dark block mb-1">
                        Stronger Revision
                      </span>
                      <p className="font-mono text-xs whitespace-pre-wrap">
                        {sa.rewrite.split(/(\[insert [^\]]+\])/g).map((part, pIdx) => {
                          if (part.startsWith("[insert")) {
                            return (
                              <mark
                                key={pIdx}
                                className="bg-amber-100 text-gold-dark font-bold px-1 py-0.5 rounded border border-amber-300"
                              >
                                {part}
                              </mark>
                            );
                          }
                          return <span key={pIdx}>{part}</span>;
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 7: Anticipated Questions & 7-Day Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Anticipated Diligence Questions */}
            {report.expected_questions && report.expected_questions.length > 0 && (
              <section className="space-y-3 p-5 rounded-panel border border-border bg-surface-2/40">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-navy" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                    Questions to Expect Next
                  </h3>
                </div>
                <ul className="space-y-2 text-xs text-text">
                  {report.expected_questions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2 p-2 bg-white rounded-field border border-border">
                      <span className="font-bold text-text-2 tabular-nums">{idx + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 7-Day Evidence Action Plan */}
            {report.evidence_plan && report.evidence_plan.length > 0 && (
              <section className="space-y-3 p-5 rounded-panel border border-border bg-surface-2/40">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-navy" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                    7-Day Evidence Action Plan
                  </h3>
                </div>
                <ul className="space-y-2 text-xs text-text">
                  {report.evidence_plan.map((item, idx) => {
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

          {/* Section 8: Tightened 30-Second Elevator Pitch */}
          {report.tightened_pitch && (
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
                &ldquo;{report.tightened_pitch}&rdquo;
              </blockquote>
            </section>
          )}

          {/* Section 9: Recommended Next Step Callout Card */}
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

          {/* Section 10: Legal Footer Disclaimer */}
          <footer className="border-t border-border pt-4 text-center text-xs text-text-2">
            <p>GrillRoom uses simulated investors for practice. Verdicts do not predict real investment decisions.</p>
          </footer>
        </article>
      </main>

      {/* Retry Modal Dialog */}
      <Dialog
        isOpen={showRetryModal}
        onClose={() => setShowRetryModal(false)}
        title="Retry with Improved Pitch"
        description="Launch a linked child session with your tightened numbers to evaluate pitch progression."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="retry-pitch-input" className="text-xs font-bold uppercase text-text-2 block">
              Revised Pitch Brief
            </label>
            <textarea
              id="retry-pitch-input"
              rows={6}
              value={revisedPitch}
              onChange={(e) => setRevisedPitch(e.target.value)}
              placeholder="Paste your strengthened pitch brief incorporating verified metrics..."
              className="w-full bg-white border border-border rounded-field p-3 text-xs text-text focus:outline-none focus:border-navy"
            />
            <span className="text-[11px] text-text-2">
              Minimum 50 characters required. The panel will test your revisions against past assertions.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowRetryModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleExecuteRetry}
              isLoading={isRetrying}
              disabled={revisedPitch.trim().length < 50}
            >
              Launch Retry Session
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
