/**
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import HomePage from "@/app/page";
import SessionStagePage from "@/app/session/[id]/page";
import DebriefReportPage from "@/app/session/[id]/debrief/page";
import CompareReportPage from "@/app/compare/[id]/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: "mock-session-id-123" }),
}));

describe("Page Components Integration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Home Page (app/page.tsx)", () => {
    it("renders landing pitch lobby with textarea and CTA", () => {
      render(<HomePage />);
      expect(screen.getByText("AI INVESTOR PANEL · PITCH PRACTICE")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Paste your investor pitch/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Enter the GrillRoom/i })).toBeInTheDocument();
    });
  });

  describe("Session Stage Page (app/session/[id]/page.tsx)", () => {
    it("renders live boardroom dialogue when session fetch succeeds", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          session: { turn_count: 2, intensity: "tough", idea_text: "Logistics SaaS" },
          turns: [
            { role: "chair", speaker_id: "chair", text: "Welcome", round: "opening" },
            { role: "investor", speaker_id: "rohan", text: "What is your gross margin?", round: "opening" },
          ],
          claims: [{ id: 1, claim_text: "Margin is 85%", category: "unit_economics", status: "unverified", source_turn: 1 }],
          meters: { rohan: 50 },
        }),
      });

      render(<SessionStagePage />);
      expect(screen.getByText("Live Panel Dialogue")).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText("What is your gross margin?")).toBeInTheDocument();
      });
    });
  });

  describe("Debrief Page (app/session/[id]/debrief/page.tsx)", () => {
    it("renders loading indicator and then completed debrief report", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          readiness_score: 80,
          verdicts: [
            {
              investor_id: "rohan",
              decision: "In",
              reason: "Defensible numbers",
              condition: "",
              simulated_offer: "$500k for 10%",
            },
          ],
          top_weaknesses: [],
          stronger_answers: [],
          contradictions: [],
          expected_questions: ["What is next year CAC?"],
          evidence_plan: ["Validate pipeline"],
          tightened_pitch: "We deliver 10x ROI on logistics audits.",
        }),
      });

      render(<DebriefReportPage />);
      expect(screen.getByText("Compiling Investor Readiness Report")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getAllByText("Investor Readiness Report").length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByText("Defensible numbers")).toBeInTheDocument();
    });
  });

  describe("Compare Page (app/compare/[id]/page.tsx)", () => {
    it("renders comparative progression audit", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          originalSessionId: "mock-session-id-123",
          retrySessionId: "retry-session-id-456",
          panelIds: ["rohan"],
          convictions: {
            original: { rohan: 50 },
            retry: { rohan: 65 },
          },
          unresolvedThreads: { original: 2, retry: 0 },
          criteriaScores: {
            original: { directness: 60 },
            retry: { directness: 80 },
          },
          overallDelta: 15,
        }),
      });

      render(<CompareReportPage />);
      expect(screen.getByText("Evaluating Pitch Progression")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getAllByText("Comparative Diligence Audit").length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getAllByText("+15%").length).toBeGreaterThanOrEqual(1);
    });
  });
});
