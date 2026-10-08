"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IntensityMode } from "@/lib/types";

export default function LandingPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [industry, setIndustry] = useState("Technology / AI");
  const [stage, setStage] = useState("Seed");
  const [ask, setAsk] = useState("$750,000 for 10%");
  const [intensity, setIntensity] = useState<IntensityMode>("tough");
  const [pdfText, setPdfText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim().length < 50) {
      setErrorMsg("Your pitch must be at least 50 characters to face the panel.");
      return;
    }

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
        throw new Error(data.error || "Failed to enter GrillRoom");
      }

      if (data.sessionId) {
        router.push(`/session/${data.sessionId}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong entering the boardroom.";
      setErrorMsg(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col justify-between selection:bg-shark-orange selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-surface-border/60 bg-surface/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-shark-orange flex items-center justify-center font-bold text-white shadow-lg shadow-shark-orange/30">
            🔥
          </div>
          <span className="font-bold text-lg tracking-tight text-white">GRILLROOM</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Panel Active & Assembled</span>
        </div>
      </header>

      {/* Main Pitch Form Container */}
      <main id="main-content" className="max-w-4xl mx-auto w-full px-6 py-10 flex-1">
        <div className="space-y-4 text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-surface-elevated border border-shark-orange/40 text-xs font-semibold text-shark-orange tracking-wider uppercase">
            <span>High-Stakes Interrogation Engine</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Pitch the AI Boardroom.
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base md:text-lg">
            Five autonomous AI investor archetypes. A hidden Claim Ledger tracking every number,
            contradiction, and dodge. Will you close the round or be torn apart?
          </p>
        </div>

        <form
          onSubmit={handleStartSession}
          className="bg-surface-card border border-surface-border rounded-xl p-6 md:p-8 space-y-6 shadow-2xl glow-subtle"
        >
          {errorMsg && (
            <div role="alert" className="p-4 rounded-lg bg-red-950/50 border border-red-500/50 text-red-200 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Pitch Textarea */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <label htmlFor="pitch-input" className="text-slate-200">
                Your Startup Pitch <span className="text-shark-orange">*</span>
              </label>
              <span className={`text-xs ${idea.length < 50 ? "text-amber-400" : "text-slate-400"}`}>
                {idea.length} / 6,000 chars (min 50)
              </span>
            </div>
            <textarea
              id="pitch-input"
              rows={6}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe your startup: What urgent problem do you solve? Who is the customer? What is your pricing and traction? (e.g. We built an automated AI compliance copilot for fintech lenders. We charge $3,000/mo and have 8 signed pilot customers with a $400 CAC...)"
              className="w-full bg-background border border-surface-border focus:border-shark-orange rounded-lg p-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-shark-orange transition-all font-sans text-sm md:text-base resize-y"
              required
            />
          </div>

          {/* PDF Drop-zone */}
          <div className="space-y-2">
            <label htmlFor="pdf-upload" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Optional Pitch Deck (.pdf, max 10MB)</span>
              {pdfText && <span className="text-emerald-400 font-normal">Deck extracted ({pdfText.length} chars)</span>}
            </label>
            <div className="border border-dashed border-surface-border hover:border-shark-orange/80 rounded-lg p-4 bg-background/50 text-center transition-all">
              <input
                type="file"
                id="pdf-upload"
                accept=".pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  try {
                    setErrorMsg("");
                    const res = await fetch("/api/extract-pdf", { method: "POST", body: fd });
                    const d = (await res.json()) as { text?: string; error?: string };
                    if (!res.ok) throw new Error(d.error || "Failed to parse PDF");
                    if (d.text) {
                      setPdfText(d.text);
                      if (!idea.trim()) {
                        setIdea(`[Extracted from ${file.name}]:\n${d.text.slice(0, 500)}...`);
                      }
                    }
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : "Failed to upload PDF";
                    setErrorMsg(message);
                  }
                }}
                className="hidden"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center space-y-1.5">
                <span className="text-2xl" aria-hidden="true">📄</span>
                <span className="text-xs font-medium text-slate-300">
                  {pdfText ? "Replace uploaded deck PDF" : "Drop your deck PDF here, or browse files"}
                </span>
                <span className="text-[10px] text-slate-500">Supports .pdf up to 10 MB</span>
              </label>
            </div>
          </div>

          {/* Core Metadata Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="industry-select" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Industry
              </label>
              <select
                id="industry-select"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-surface-elevated border border-surface-border rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-shark-orange"
              >
                <option value="Technology / AI">Technology / AI</option>
                <option value="Enterprise SaaS">Enterprise SaaS</option>
                <option value="Fintech">Fintech</option>
                <option value="Healthcare & Bio">Healthcare & Bio</option>
                <option value="Consumer / Social">Consumer / Social</option>
                <option value="Climate / DeepTech">Climate / DeepTech</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="stage-select" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Current Stage
              </label>
              <select
                id="stage-select"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full bg-surface-elevated border border-surface-border rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-shark-orange"
              >
                <option value="Pre-seed / Idea">Pre-seed / Idea</option>
                <option value="Seed (Pilots live)">Seed (Pilots live)</option>
                <option value="Late Seed / Pre-Series A">Late Seed / Pre-Series A</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ask-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Stated Ask & Terms
              </label>
              <input
                id="ask-input"
                type="text"
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                placeholder="$500,000 for 10%"
                className="w-full bg-surface-elevated border border-surface-border rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-shark-orange"
              />
            </div>
          </div>

          {/* Intensity Selector */}
          <fieldset className="space-y-2 border-0 p-0 m-0">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Interrogation Intensity
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: "friendly" as IntensityMode,
                  title: "Friendly Angel",
                  desc: "Constructive feedback, patient laddering, supportive tone.",
                },
                {
                  id: "tough" as IntensityMode,
                  title: "Tough Institutional VC",
                  desc: "Rigorous unit economics, quick dodge callouts, realistic stress.",
                },
                {
                  id: "shark" as IntensityMode,
                  title: "The GrillRoom",
                  desc: "All 5 investors sit. Aggressive interrupts, brutal contradiction attacks.",
                },
              ].map((lvl) => (
                <label
                  key={lvl.id}
                  htmlFor={`intensity-${lvl.id}`}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all block ${
                    intensity === lvl.id
                      ? "bg-shark-orange/10 border-shark-orange text-white glow-orange-sm"
                      : "bg-surface-elevated border-surface-border/80 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-slate-200">{lvl.title}</span>
                    <input
                      id={`intensity-${lvl.id}`}
                      type="radio"
                      name="intensity"
                      value={lvl.id}
                      checked={intensity === lvl.id}
                      onChange={() => setIntensity(lvl.id)}
                      className="accent-shark-orange focus-visible:ring-2 focus-visible:ring-shark-orange"
                    />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{lvl.desc}</p>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Action Button */}
          <div className="pt-2">
            <button
              id="submit-pitch-btn"
              type="submit"
              disabled={isSubmitting || idea.trim().length < 50}
              className={`w-full py-4 px-6 rounded-lg font-bold text-base uppercase tracking-wider text-white shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                isSubmitting || idea.trim().length < 50
                  ? "bg-slate-700 opacity-60 cursor-not-allowed"
                  : "bg-gradient-to-r from-shark-orange to-amber-600 hover:from-orange-600 hover:to-amber-500 shadow-orange-950/50 glow-orange hover:scale-[1.01]"
              }`}
            >
              {isSubmitting ? "Assembling the Boardroom..." : "Face The Panel"}
            </button>
          </div>
        </form>
      </main>

      {/* Footer Disclaimer */}
      <footer className="border-t border-surface-border/50 py-6 px-6 text-center text-xs text-slate-500">
        Simulated investors for practice. Verdicts do not predict real investment decisions.
      </footer>
    </div>
  );
}
