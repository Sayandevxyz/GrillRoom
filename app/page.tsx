"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { IntensityMode } from "@/lib/types";
import {
  FileUp,
  FileCheck,
  Trash2,
  Check,
} from "lucide-react";
import dynamic from "next/dynamic";
import { PitchRulesSidebar } from "@/components/landing/PitchRulesSidebar";
import { HowItWorksModal } from "@/components/landing/HowItWorksModal";

const IntroGate = dynamic(() => import("@/components/features/intro-gate/IntroGate").then((mod) => mod.IntroGate), { ssr: false });

export default function SetupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [idea, setIdea] = useState("");
  const [industry, setIndustry] = useState("Technology / B2B SaaS");
  const [stage, setStage] = useState("Seed");
  const [ask, setAsk] = useState("$750,000 for 10%");
  const [intensity, setIntensity] = useState<IntensityMode>("tough");

  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [pdfText, setPdfText] = useState("");
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const samplePitch =
    "We have built ApexShield, an autonomous AI security scanner for fintech banks. We charge $4,000 per month on annual contracts. We have 12 signed pilot customers and $48,000 in monthly recurring revenue. Our customer acquisition cost is $650, which pays back in less than 2 months. We are seeking $750,000 for 10% equity.";

  const handleUseSamplePitch = () => {
    setIdea(samplePitch);
    setIndustry("Technology / B2B SaaS");
    setStage("Seed");
    setAsk("$750,000 for 10%");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        handlePdfUpload(file);
      } else {
        setErrorMsg("Only PDF files are supported for deck upload.");
      }
    }
  };

  const isPitchValid = idea.trim().length >= 50 && idea.length <= 6000;

  const handlePdfUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("PDF file exceeds the 10 MB limit.");
      return;
    }

    setIsUploadingPdf(true);
    setErrorMsg("");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/extract-pdf", { method: "POST", body: fd });
      const data = (await res.json()) as { text?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse pitch deck PDF.");
      }

      if (data.text) {
        setPdfText(data.text);
        setUploadedFile({
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        });

        // Pre-fill pitch if textarea is currently empty
        if (!idea.trim()) {
          setIdea(
            `[Extracted from ${file.name}]:\n${data.text.slice(0, 400).trim()}...`
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse PDF deck.";
      setErrorMsg(msg);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleRemovePdf = () => {
    setUploadedFile(null);
    setPdfText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleStartReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPitchValid) return;

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          industry,
          stage,
          ask,
          intensity,
          pdfText: pdfText || undefined,
        }),
      });

      const data = (await res.json()) as { sessionId?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to start investor review.");
      }

      if (data.sessionId) {
        router.push(`/session/${data.sessionId}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to convene the panel. Please retry.";
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Animated Investor Boardroom Gate (Feature-flagged) */}
      <IntroGate />

      {/* Top Authority Header */}
      <Header onHowItWorksClick={() => setIsHowItWorksOpen(true)} />

      <main id="main-content" className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-8 md:mb-10">
          <div>
            <span className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-gold-dark bg-amber-50/70 border border-amber-200/80 rounded-full">
              AI INVESTOR PANEL · PITCH PRACTICE
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight leading-[1.15]">
            <span className="text-navy">Friends say it&apos;s great. </span>
            <span className="text-cta">Investors won&apos;t.</span>
          </h1>
          <p className="text-text-2 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
            Pitch your idea. Five AI investors question every claim, catch your contradictions, and show you exactly what to fix.
          </p>

          {/* Investor Avatars Row */}
          <div className="pt-2 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            {[
              { name: "Rohan", role: "Numbers", initials: "RM" },
              { name: "Meera", role: "Market", initials: "MS" },
              { name: "Arjun", role: "Tech", initials: "AR" },
              { name: "Kavya", role: "Users", initials: "KS" },
              { name: "Sam", role: "Team", initials: "SK" },
            ].map((inv) => (
              <div
                key={inv.name}
                className="flex items-center gap-2 bg-white/80 border border-border px-3 py-1.5 rounded-full shadow-subtle"
              >
                <div className="w-6 h-6 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-cta/30">
                  {inv.initials}
                </div>
                <span className="text-xs font-semibold text-navy">
                  {inv.name} <span className="text-text-2 font-normal text-[11px]">· {inv.role}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust & Architecture Explainer Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="bg-white/80 border border-border rounded-field p-3.5 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-cta" aria-hidden="true" />
              <h3 className="text-xs font-bold text-navy">Deterministic Planner</h3>
            </div>
            <p className="text-[11px] text-text-2 leading-relaxed">
              Questions chosen by coverage gaps, not random hallucination.
            </p>
          </div>
          <div className="bg-white/80 border border-border rounded-field p-3.5 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-gold" aria-hidden="true" />
              <h3 className="text-xs font-bold text-navy">Due Diligence Ledger</h3>
            </div>
            <p className="text-[11px] text-text-2 leading-relaxed">
              Tracks claimed vs proven facts and flags contradictions.
            </p>
          </div>
          <div className="bg-white/80 border border-border rounded-field p-3.5 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true" />
              <h3 className="text-xs font-bold text-navy">Algorithmic Verdicts</h3>
            </div>
            <p className="text-[11px] text-text-2 leading-relaxed">
              Code-computed conviction scores and simulated term sheets.
            </p>
          </div>
          <div className="bg-white/80 border border-border rounded-field p-3.5 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-600" aria-hidden="true" />
              <h3 className="text-xs font-bold text-navy">100% Confidential</h3>
            </div>
            <p className="text-[11px] text-text-2 leading-relaxed">
              In-memory fallback & zero pitch retention. Practice risk-free.
            </p>
          </div>
        </div>

        {/* Two-Column Setup Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Form Card (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <Card goldTopRule={true} className="p-6 md:p-8 flex-1 flex flex-col justify-between">
              <form onSubmit={handleStartReview} className="space-y-8">
                {errorMsg && (
                  <Alert
                    variant="danger"
                    title="Review Initiation Error"
                    message={errorMsg}
                    onRetry={() => setErrorMsg("")}
                  />
                )}

                {/* Section 1: Pitch Brief */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-gold-dark">
                        1 Your Pitch
                      </span>
                      <button
                        type="button"
                        onClick={handleUseSamplePitch}
                        className="text-[11px] font-medium text-cta hover:text-cta-hover underline transition-subtle"
                      >
                        Try sample pitch
                      </button>
                    </div>
                    <span
                      className={`text-xs tabular-nums font-medium ${
                        idea.length > 6000
                          ? "text-danger font-bold"
                          : idea.length > 0 && idea.length < 50
                          ? "text-warning"
                          : "text-text-2"
                      }`}
                    >
                      {idea.length} / 6,000 (minimum 50)
                    </span>
                  </div>

                  <textarea
                    id="pitch-input"
                    rows={5}
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Paste your investor pitch or describe your startup: What urgent problem do you solve? Who is the customer? What is your pricing and traction? (e.g. $3,000/month, 8 signed pilot customers, $400 CAC...)"
                    className="w-full bg-white border border-border focus:border-navy rounded-field p-3.5 text-text placeholder:text-slate-400 focus:outline-none transition-subtle text-sm leading-relaxed resize-y"
                    required
                  />
                  <p className="text-xs text-text-2">
                    Include your customer profile, metrics, pricing, and observed traction for the sharpest review.
                  </p>
                </div>

                {/* Section 2: Deck Drop-zone */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-gold-dark">
                    2 Deck (Optional)
                  </span>

                  {!uploadedFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                      }}
                      onDrop={handleDrop}
                      className={`border border-dashed rounded-field p-6 text-center cursor-pointer transition-subtle focus-within:ring-2 focus-within:ring-info ${
                        isDragging
                          ? "border-gold bg-amber-50/60"
                          : "border-border hover:border-slate-400 bg-surface-2/60 hover:bg-surface-2"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="pdf-upload"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePdfUpload(file);
                        }}
                        className="sr-only"
                      />
                      <FileUp className="w-6 h-6 text-text-2 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-xs font-semibold text-text">
                        {isUploadingPdf
                          ? "Extracting slides and claims..."
                          : "Drop a PDF deck here or browse"}
                      </p>
                      <p className="text-[11px] text-text-2 mt-0.5">PDF format, up to 10 MB</p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-field bg-slate-50 border border-border flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileCheck className="w-5 h-5 text-success flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text truncate">{uploadedFile.name}</p>
                          <p className="text-[11px] text-text-2">{uploadedFile.size} • Slides extracted</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePdf}
                        className="p-1 text-text-2 hover:text-danger rounded transition-subtle"
                        title="Remove deck"
                        aria-label="Remove uploaded deck"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Section 3: Deal Context */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-gold-dark">
                    3 Deal Context
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="industry-select" className="block text-[11px] font-bold text-text-2 uppercase mb-1">
                        Industry
                      </label>
                      <select
                        id="industry-select"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full bg-white border border-border rounded-field px-3 py-2 text-xs text-text font-medium focus:border-navy focus:outline-none"
                      >
                        <option>Technology / B2B SaaS</option>
                        <option>Fintech / Insurtech</option>
                        <option>HealthTech / Biotech</option>
                        <option>Consumer / Marketplace</option>
                        <option>Climate / DeepTech</option>
                        <option>Hardware / Robotics</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="stage-select" className="block text-[11px] font-bold text-text-2 uppercase mb-1">
                        Current Stage
                      </label>
                      <select
                        id="stage-select"
                        value={stage}
                        onChange={(e) => setStage(e.target.value)}
                        className="w-full bg-white border border-border rounded-field px-3 py-2 text-xs text-text font-medium focus:border-navy focus:outline-none"
                      >
                        <option>Pre-seed / Idea</option>
                        <option>Seed / Live Product</option>
                        <option>Series A</option>
                        <option>Bridge Round</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="ask-input" className="block text-[11px] font-bold text-text-2 uppercase mb-1">
                        Stated Ask
                      </label>
                      <input
                        type="text"
                        id="ask-input"
                        value={ask}
                        onChange={(e) => setAsk(e.target.value)}
                        placeholder="$750,000 for 10%"
                        className="w-full bg-white border border-border rounded-field px-3 py-2 text-xs text-text font-medium focus:border-navy focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Review Intensity */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-gold-dark">
                    4 Review Intensity
                  </span>

                  <div className="space-y-2.5">
                    {[
                      {
                        id: "friendly" as IntensityMode,
                        title: "Angel Review",
                        desc: "Constructive questions, patient follow-ups, supportive tone.",
                      },
                      {
                        id: "tough" as IntensityMode,
                        title: "Partner Meeting",
                        desc: "Rigorous unit economics, direct callouts, realistic pressure.",
                      },
                      {
                        id: "shark" as IntensityMode,
                        title: "Shark Tank Mode",
                        desc: "All five investors. Interruptions and pointed contradiction challenges.",
                      },
                    ].map((mode) => {
                      const isSelected = intensity === mode.id;
                      return (
                        <label
                          key={mode.id}
                          htmlFor={`intensity-${mode.id}`}
                          className={`block p-3.5 rounded-field border transition-subtle cursor-pointer ${
                            isSelected
                              ? "bg-amber-50/20 border-border border-l-4 border-l-gold shadow-subtle"
                              : "bg-surface border-border hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <span className="text-sm font-bold text-navy block">
                                {mode.title}
                              </span>
                              <p className="text-xs text-text-2 leading-relaxed">{mode.desc}</p>
                            </div>

                            <div className="mt-0.5">
                              <input
                                type="radio"
                                id={`intensity-${mode.id}`}
                                name="review-intensity"
                                value={mode.id}
                                checked={isSelected}
                                onChange={() => setIntensity(mode.id)}
                                className="sr-only"
                              />
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? "border-gold bg-gold text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                                aria-hidden="true"
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* CTA Action */}
                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                    disabled={!isPitchValid}
                    className="w-full bg-cta hover:bg-cta-hover focus-visible:ring-gold text-white font-semibold py-3.5 shadow-subtle text-base"
                  >
                    {isSubmitting ? "Convening the panel..." : "Enter the GrillRoom →"}
                  </Button>

                  <p className="text-xs text-text-2 text-center">
                    {!isPitchValid ? (
                      idea.trim().length === 0
                        ? "Add at least 50 characters to begin."
                        : idea.trim().length < 50
                        ? `Add ${50 - idea.trim().length} more characters to begin.`
                        : "Pitch length exceeds the 6,000 character limit."
                    ) : (
                      "Practice tool. Verdicts are simulated, not predictions of real investor decisions."
                    )}
                  </p>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: "What you'll get" Panel (5 cols) */}
          <PitchRulesSidebar />
        </div>
      </main>

      {/* Persistent Legal Footer */}
      <footer className="border-t border-border bg-white px-6 py-4 text-center text-xs text-text-2">
        <p>GrillRoom uses simulated investors for practice. Verdicts do not predict real investment decisions.</p>
      </footer>

      {/* How It Works Explainer Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </div>
  );
}
