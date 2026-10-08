"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Alert } from "@/components/ui/Alert";
import { IntensityMode } from "@/lib/types";
import {
  FileUp,
  FileCheck,
  Trash2,
  Users,
  FileText,
  CheckCircle2,
  Award,
  Check,
} from "lucide-react";

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
      {/* Top Authority Header */}
      <Header />

      <main id="main-content" className="flex-1 max-w-setup mx-auto w-full px-6 py-10 md:py-14">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10 md:mb-12">
          <div>
            <span className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-gold-dark bg-amber-50/70 border border-amber-200/80 rounded-full">
              AI Investor Readiness Simulator
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-navy tracking-tight leading-[1.15]">
            Get Your Startup Pitch Investor-Ready.
          </h1>
          <p className="text-text-2 text-sm md:text-base leading-relaxed">
            Face an AI investor panel that challenges your numbers, flags weak claims, and prepares you for real fundraising conversations.
          </p>
        </div>

        {/* Two-Column Setup Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Card (7 cols) */}
          <div className="lg:col-span-7">
            <Card className="p-6 md:p-8">
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
                    <span className="text-xs font-bold uppercase tracking-[0.08em] text-gold-dark">
                      1 Your Pitch
                    </span>
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
                    rows={6}
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Describe your startup: What urgent problem do you solve? Who is the customer? What is your pricing and traction? (e.g. We built an automated compliance engine for fintech lenders. We charge $3,000/mo and have 8 signed pilot customers with a $400 CAC...)"
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
                      className="border border-dashed border-border hover:border-slate-400 bg-surface-2/60 hover:bg-surface-2 rounded-field p-6 text-center cursor-pointer transition-subtle focus-within:ring-2 focus-within:ring-info"
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
                    className="w-full"
                  >
                    {isSubmitting ? "Convening the panel..." : "Start Investor Review"}
                  </Button>

                  {!isPitchValid && (
                    <p className="text-xs text-text-2 text-center">
                      {idea.trim().length === 0
                        ? "Add at least 50 characters to begin."
                        : idea.trim().length < 50
                        ? `Add ${50 - idea.trim().length} more characters to begin.`
                        : "Pitch length exceeds the 6,000 character limit."}
                    </p>
                  )}
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Sticky "What You Will Get" Panel (5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-4">
            <Card goldTopRule={true} className="p-6 md:p-7 space-y-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark block mb-1">
                  Deliverables
                </span>
                <h2 className="text-lg font-serif font-bold text-navy">
                  What you will get
                </h2>
              </div>

              <ul className="space-y-3.5 text-xs text-text leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <Users className="w-4 h-4 text-navy flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong>A live five-investor panel</strong> with distinct diligence lenses and real-time conviction calibration.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-navy flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong>A Due Diligence Ledger</strong> that extracts every claim, flags contradictions, and records evidence gaps.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-navy flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong>Algorithmic verdicts</strong> computed strictly in code from conviction thresholds with simulated terms.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Award className="w-4 h-4 text-navy flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong>An Investor Readiness Report</strong> featuring evidence-only rewrites, top risks, and a 7-day action sprint.
                  </span>
                </li>
              </ul>

              {/* Static Preview of Due Diligence Ledger Row */}
              <div className="pt-2 border-t border-border space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-2 block">
                  Due Diligence Ledger Preview
                </span>
                <div className="p-3 bg-surface-2/70 border border-border rounded-field space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-navy">DD-01</span>
                    <Chip variant="verified" size="sm" label="Verified" />
                  </div>
                  <p className="text-xs font-semibold text-navy">
                    Customer acquisition payback under 6 months
                  </p>
                  <p className="text-[11px] text-text-2">
                    Category: Unit economics • Supported by stated cohorts
                  </p>
                </div>
              </div>
            </Card>

            {/* Quick Context Card */}
            <div className="p-4 bg-white/70 border border-border rounded-panel text-xs text-text-2 space-y-1">
              <span className="font-bold text-navy block">Confidential & Private</span>
              <p>Your session is stored locally with session-scoped cookie tokens. Data is never shared or used for public training.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Persistent Legal Footer */}
      <footer className="border-t border-border bg-white px-6 py-4 text-center text-xs text-text-2">
        <p>GrillRoom uses simulated investors for practice. Verdicts do not predict real investment decisions.</p>
      </footer>
    </div>
  );
}
