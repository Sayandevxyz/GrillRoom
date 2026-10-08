"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Printer } from "lucide-react";
import { PitchRadar } from "@/components/features/radar/PitchRadar";
import { ComparisonTable } from "@/components/compare/ComparisonTable";
import { CriteriaProgressionGrid } from "@/components/compare/CriteriaProgressionGrid";

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

/** Comparative audit report displaying partner conviction shifts between pitch iterations. */
export default function CompareReportPage() {
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
          throw new Error(err.error || "Failed to load comparative audit");
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

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-3 border-navy/20 border-t-navy rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="font-serif font-bold text-navy text-base">
            Evaluating Pitch Progression
          </p>
          <p className="text-xs text-text-2">
            Calculating conviction deltas, diligence criteria shifts, and resolved threads...
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-field max-w-md text-center text-xs text-danger font-medium">
          {errorMsg || "Unable to display comparison"}
        </div>
        <Link href="/" className="text-xs text-navy font-semibold underline">
          &larr; Return to GrillRoom
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Header */}
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
              Comparative Diligence Audit
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

            {data.retrySessionId && (
              <Link href={`/session/${data.retrySessionId}`}>
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Resume Retry Stage
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Memo */}
      <main id="main-content" className="flex-1 max-w-page mx-auto w-full px-4 md:px-6 py-8 md:py-12">
        <article className="panel bg-white p-6 sm:p-10 md:p-12 space-y-8 shadow-panel">
          {/* Memo Header */}
          <header className="border-b border-border pb-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark">
                Progression Telemetry
              </span>
              <span className="text-xs font-mono tabular-nums text-text-2">
                Audit Delta: {data.overallDelta > 0 ? `+${data.overallDelta}%` : `${data.overallDelta}%`}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy tracking-tight">
              Comparative Diligence Audit
            </h1>
            <p className="text-xs text-text-2">
              Side-by-side progression between initial pitch and revised iteration.
            </p>
          </header>

          {/* Overall Delta Highlight Banner */}
          <section className="bg-surface-2/60 border border-border rounded-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-text-2 block">
                Overall Conviction Progression
              </span>
              <h2 className="text-2xl font-serif font-bold text-navy">
                {data.overallDelta >= 0 ? "Credibility Strengthened" : "Divergence Detected"}
              </h2>
              <p className="text-xs text-text max-w-xl">
                Comparing verified claim evidence and partner conviction between sessions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-white border border-border rounded-field text-center">
                <span className="text-[10px] uppercase font-bold text-text-2 block">Net Conviction Delta</span>
                <span
                  className={`text-2xl font-bold font-sans tabular-nums ${
                    data.overallDelta >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {data.overallDelta >= 0 ? `+${data.overallDelta}%` : `${data.overallDelta}%`}
                </span>
              </div>
            </div>
          </section>

          {/* Pitch DNA Radar (Feature Flagged) */}
          <PitchRadar sessionId={data.retrySessionId || sessionId} className="no-print" />

          {/* Side-by-Side Conviction Table */}
          <ComparisonTable
            originalConvictions={data.convictions.original}
            retryConvictions={data.convictions.retry}
          />

          {/* Diligence Criteria Progression */}
          <CriteriaProgressionGrid
            originalScores={data.criteriaScores.original}
            retryScores={data.criteriaScores.retry}
          />

          {/* Legal Footer */}
          <footer className="border-t border-border pt-4 text-center text-xs text-text-2">
            <p>GrillRoom uses simulated investors for practice. Verdicts do not predict real investment decisions.</p>
          </footer>
        </article>
      </main>
    </div>
  );
}
