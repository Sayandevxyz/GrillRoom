"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { DebriefHeader } from "@/components/debrief/DebriefHeader";
import { ReadinessHero } from "@/components/debrief/ReadinessHero";
import { TermSheetSection, VerdictItem } from "@/components/debrief/TermSheetSection";
import {
  WeaknessesSection,
  WeaknessItem,
  StrongerAnswerItem,
  ContradictionItem,
} from "@/components/debrief/WeaknessesSection";
import { ActionSprintSection } from "@/components/debrief/ActionSprintSection";
import { RetryPitchModal } from "@/components/debrief/RetryPitchModal";

const PitchRadar = dynamic(
  () => import("@/components/features/radar/PitchRadar").then((mod) => mod.PitchRadar),
  { ssr: false }
);

const BehindDoorsScene = dynamic(
  () =>
    import("@/components/features/behind-doors/BehindDoorsScene").then(
      (mod) => mod.BehindDoorsScene
    ),
  { ssr: false }
);

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

/** Comprehensive investor debrief report with partner term sheets and evidence checklists. */
export default function DebriefReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [report, setReport] = useState<DebriefReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

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

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <DebriefHeader
        sessionId={sessionId}
        readinessScore={report.readiness_score}
        onOpenRetry={() => setShowRetryModal(true)}
      />

      {/* Main Memo Container */}
      <main id="main-content" className="flex-1 max-w-page mx-auto w-full px-4 md:px-6 py-8 md:py-12">
        <article className="panel bg-white p-6 sm:p-10 md:p-12 space-y-10 shadow-panel">
          {/* Section 1 & 2: Memo Header & Readiness Score Ring */}
          <ReadinessHero sessionId={sessionId} score={report.readiness_score} />

          {/* Section 2.5: Pitch DNA Radar (Feature Flagged) */}
          <PitchRadar sessionId={sessionId} className="no-print" />

          {/* Section 3: Investor Verdicts Table */}
          <TermSheetSection verdicts={report.verdicts} />

          {/* Section 4, 5, 6: Key Risks, Contradictions, Stronger Rewrites */}
          <WeaknessesSection
            weaknesses={report.top_weaknesses}
            contradictions={report.contradictions}
            strongerAnswers={report.stronger_answers}
          />

          {/* Section 7, 8, 9: Anticipated Questions, 7-Day Plan, Tightened Pitch */}
          <ActionSprintSection
            expectedQuestions={report.expected_questions}
            evidencePlan={report.evidence_plan}
            tightenedPitch={report.tightened_pitch}
          />

          {/* Behind Closed Doors: Partner Deliberation Scene (Feature Flagged) */}
          <BehindDoorsScene sessionId={sessionId} className="no-print" />

          {/* Section 10: Legal Footer Disclaimer */}
          <footer className="border-t border-border pt-4 text-center text-xs text-text-2">
            <p>GrillRoom uses simulated investors for practice. Verdicts do not predict real investment decisions.</p>
          </footer>
        </article>
      </main>

      {/* Retry Modal Dialog */}
      <RetryPitchModal
        isOpen={showRetryModal}
        onClose={() => setShowRetryModal(false)}
        revisedPitch={revisedPitch}
        setRevisedPitch={setRevisedPitch}
        isRetrying={isRetrying}
        onExecuteRetry={handleExecuteRetry}
      />
    </div>
  );
}
