/**
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers";
import "vitest-axe/extend-expect";

import { HowItWorksModal } from "@/components/landing/HowItWorksModal";
import { PitchRulesSidebar } from "@/components/landing/PitchRulesSidebar";
import { ComparisonTable } from "@/components/compare/ComparisonTable";
import { CriteriaProgressionGrid } from "@/components/compare/CriteriaProgressionGrid";
import { DebriefHeader } from "@/components/debrief/DebriefHeader";
import { ReadinessHero } from "@/components/debrief/ReadinessHero";
import { TermSheetSection } from "@/components/debrief/TermSheetSection";
import { WeaknessesSection } from "@/components/debrief/WeaknessesSection";
import { ActionSprintSection } from "@/components/debrief/ActionSprintSection";
import { RetryPitchModal } from "@/components/debrief/RetryPitchModal";
import { DebriefConfirmModal } from "@/components/session/DebriefConfirmModal";
import { InvestorPanelStrip } from "@/components/session/InvestorPanelStrip";
import { LedgerDrawer } from "@/components/session/LedgerDrawer";
import { LiveDialogueCard } from "@/components/session/LiveDialogueCard";
import { SessionHeader } from "@/components/session/SessionHeader";
import { BehindDoorsScene } from "@/components/features/behind-doors/BehindDoorsScene";
import { Header } from "@/components/Header";
import type { IntensityMode } from "@/lib/types";

vi.mock("@/lib/features/flags", () => ({
  FEATURE_INTRO_GATE: true,
  FEATURE_REACTIONS: true,
  FEATURE_RADAR: true,
  FEATURE_SHARE_CARD: true,
  FEATURE_BEHIND_DOORS: true,
}));

expect.extend(matchers);

describe("Extracted Components & A11y Suite", () => {
  describe("Landing Components", () => {
    it("renders HowItWorksModal when open and closes on action", async () => {
      const handleClose = vi.fn();
      const { container } = render(
        <HowItWorksModal isOpen={true} onClose={handleClose} />
      );
      expect(screen.getByText("How GrillRoom Works")).toBeInTheDocument();
      expect(screen.getByText("5 Venture Archetypes")).toBeInTheDocument();

      const closeBtn = screen.getByRole("button", { name: /understood, enter boardroom/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("renders PitchRulesSidebar with cards and guidelines", async () => {
      const { container } = render(<PitchRulesSidebar />);
      expect(screen.getByText("What Happens in the Room")).toBeInTheDocument();
      expect(screen.getByText("Live investor panel")).toBeInTheDocument();
      expect(screen.getByText("Claim-by-claim ledger")).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Compare Components", () => {
    it("renders ComparisonTable with partner names and deltas", async () => {
      const original = { rohan: 50, meera: 40 };
      const retry = { rohan: 65, meera: 35 };
      const { container } = render(
        <ComparisonTable originalConvictions={original} retryConvictions={retry} />
      );
      expect(screen.getByText("Partner Conviction Shift")).toBeInTheDocument();
      expect(screen.getByText("Rohan Mehta")).toBeInTheDocument();
      expect(screen.getByText("+15%")).toBeInTheDocument();
      expect(screen.getByText("-5%")).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("renders CriteriaProgressionGrid with criteria deltas", async () => {
      const originalScores = { directness: 60, evidence: 40 };
      const retryScores = { directness: 75, evidence: 30 };
      const { container } = render(
        <CriteriaProgressionGrid originalScores={originalScores} retryScores={retryScores} />
      );
      expect(screen.getByText("Diligence Criteria Progression")).toBeInTheDocument();
      expect(screen.getByText("+15")).toBeInTheDocument();
      expect(screen.getByText("-10")).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Debrief Components", () => {
    it("renders DebriefHeader and triggers retry callback", () => {
      const handleRetry = vi.fn();
      render(
        <DebriefHeader sessionId="session-123" readinessScore={75} onOpenRetry={handleRetry} />
      );
      expect(screen.getByText("Investor Readiness Report")).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /retry with improved pitch/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalled();
    });

    it("renders ReadinessHero with calculated rating and gauge", async () => {
      const { container } = render(<ReadinessHero sessionId="sess-abc" score={85} />);
      expect(screen.getAllByText("Investor-ready").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("85")).toBeInTheDocument();
      expect(screen.getByText("Ref: #GR-SESS-ABC")).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("renders TermSheetSection with partner decisions and offers", async () => {
      const verdicts = [
        {
          investor_id: "rohan",
          decision: "In" as const,
          reason: "Strong margins",
          condition: "Verify CAC",
          simulated_offer: "$500k for 10%",
        },
        {
          investor_id: "meera",
          decision: "Out" as const,
          reason: "Small TAM",
          condition: "",
          simulated_offer: "",
        },
      ];
      const { container } = render(<TermSheetSection verdicts={verdicts} />);
      expect(screen.getByText("Investor Verdicts")).toBeInTheDocument();
      expect(screen.getByText("Rohan Mehta")).toBeInTheDocument();
      expect(screen.getByText("In")).toBeInTheDocument();
      expect(screen.getByText("$500k for 10%")).toBeInTheDocument();
      expect(screen.getByText("Passed")).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("renders WeaknessesSection with contradictions and rewrites", async () => {
      const weaknesses = [
        {
          exchange: "Turn 2",
          failed_criterion: "evidence",
          explanation: "No CAC breakdown",
          most_affected_investor: "Rohan Mehta",
        },
      ];
      const contradictions = [
        { turn_numbers: "1 vs 4", suggested_consistent_position: "Stick to $200 CAC" },
      ];
      const strongerAnswers = [
        { question: "What is your churn?", rewrite: "Monthly churn is [insert churn]%." },
      ];

      const { container } = render(
        <WeaknessesSection
          weaknesses={weaknesses}
          contradictions={contradictions}
          strongerAnswers={strongerAnswers}
        />
      );

      expect(screen.getByText("Key Risks & Objections")).toBeInTheDocument();
      expect(screen.getByText("Criterion: evidence")).toBeInTheDocument();
      expect(screen.getByText("Contradiction Resolution Matrix")).toBeInTheDocument();
      expect(screen.getByText("[insert churn]")).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("renders ActionSprintSection and toggles task completion", async () => {
      const expectedQuestions = ["What is the LTV?"];
      const evidencePlan = ["Interview 5 enterprise customers"];
      const tightenedPitch = "We built the default orchestration layer.";

      const { container } = render(
        <ActionSprintSection
          expectedQuestions={expectedQuestions}
          evidencePlan={evidencePlan}
          tightenedPitch={tightenedPitch}
        />
      );

      expect(screen.getByText("Questions to Expect Next")).toBeInTheDocument();
      expect(screen.getByText("7-Day Evidence Action Plan")).toBeInTheDocument();
      expect(screen.getByText("Tightened 30-Second Elevator Pitch")).toBeInTheDocument();

      const task = screen.getByText("Interview 5 enterprise customers");
      fireEvent.click(task);

      const copyBtn = screen.getByRole("button", { name: /copy pitch/i });
      fireEvent.click(copyBtn);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("renders RetryPitchModal and triggers retry", () => {
      const handleClose = vi.fn();
      const setRevisedPitch = vi.fn();
      const handleExecute = vi.fn();

      render(
        <RetryPitchModal
          isOpen={true}
          onClose={handleClose}
          revisedPitch="A very strong revised pitch that exceeds fifty characters easily to be valid."
          setRevisedPitch={setRevisedPitch}
          isRetrying={false}
          onExecuteRetry={handleExecute}
        />
      );

      expect(screen.getByText("Retry with Improved Pitch")).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /launch retry session/i });
      fireEvent.click(retryBtn);
      expect(handleExecute).toHaveBeenCalled();
    });
  });

  describe("Session Stage Components", () => {
    it("renders SessionHeader with exchange counter and debrief button", () => {
      const handleToggle = vi.fn();
      const handleDebrief = vi.fn();

      render(
        <SessionHeader
          currentRound="opening"
          founderExchangeCount={4}
          intensity="tough"
          claimsCount={3}
          showLedgerDrawer={false}
          onToggleLedgerDrawer={handleToggle}
          canGenerateDebrief={true}
          onRequestDebrief={handleDebrief}
        />
      );

      expect(screen.getByText("Exchange 4 of 7")).toBeInTheDocument();
      const debriefBtn = screen.getByRole("button", { name: /generate investor debrief/i });
      fireEvent.click(debriefBtn);
      expect(handleDebrief).toHaveBeenCalled();
    });

    it("renders SessionHeader with custom exchange limits per intensity mode", () => {
      const { rerender } = render(
        <SessionHeader
          currentRound="opening"
          founderExchangeCount={2}
          intensity="friendly"
          claimsCount={1}
          showLedgerDrawer={false}
          onToggleLedgerDrawer={vi.fn()}
          canGenerateDebrief={false}
          onRequestDebrief={vi.fn()}
        />
      );
      expect(screen.getByText("Exchange 2 of 5")).toBeInTheDocument();

      rerender(
        <SessionHeader
          currentRound="opening"
          founderExchangeCount={2}
          intensity="shark"
          claimsCount={1}
          showLedgerDrawer={false}
          onToggleLedgerDrawer={vi.fn()}
          canGenerateDebrief={false}
          onRequestDebrief={vi.fn()}
        />
      );
      expect(screen.getByText("Exchange 2 of 12")).toBeInTheDocument();

      rerender(
        <SessionHeader
          currentRound="opening"
          founderExchangeCount={2}
          intensity={"custom" as unknown as IntensityMode}
          claimsCount={1}
          showLedgerDrawer={false}
          onToggleLedgerDrawer={vi.fn()}
          canGenerateDebrief={false}
          onRequestDebrief={vi.fn()}
        />
      );
      expect(screen.getByText("Exchange 2 of 14")).toBeInTheDocument();
    });

    it("renders InvestorPanelStrip with speaking indicator and meters", () => {
      render(
        <InvestorPanelStrip
          convictions={{ rohan: 70, meera: 45 }}
          previousConvictions={{ rohan: 60, meera: 45 }}
          activeSpeaker="rohan"
        />
      );

      expect(screen.getByText("Rohan Mehta")).toBeInTheDocument();
      expect(screen.getByText("70%")).toBeInTheDocument();
      expect(screen.getByText("+10")).toBeInTheDocument();
      expect(screen.getByText("Speaking")).toBeInTheDocument();
    });

    it("renders LiveDialogueCard with turns and handles input submission", () => {
      const handleSend = vi.fn();
      const handleKey = vi.fn();
      const setInput = vi.fn();
      const textareaRef = { current: null };
      const transcriptEndRef = { current: null };

      render(
        <LiveDialogueCard
          turns={[
            { role: "chair", speakerId: "chair", speakerName: "Chair", text: "Welcome founder.", round: "opening" },
            { role: "founder", speakerId: "founder", speakerName: "You", text: "Our CAC is $100.", round: "opening" },
            { role: "investor", speakerId: "rohan", speakerName: "Rohan Mehta", text: "Explain your payback.", round: "opening" },
          ]}
          founderExchangeCount={1}
          pitchText="Initial Pitch Text"
          isPitchCollapsed={false}
          setIsPitchCollapsed={vi.fn()}
          isStreaming={false}
          streamingText=""
          streamingMeta={null}
          errorMessage=""
          answerInput="Our payback is 3 months."
          setAnswerInput={setInput}
          handleSendAnswer={handleSend}
          handleKeyDown={handleKey}
          textareaRef={textareaRef}
          transcriptEndRef={transcriptEndRef}
        />
      );

      expect(screen.getByText("Live Panel Dialogue")).toBeInTheDocument();
      expect(screen.getByText("Welcome founder.")).toBeInTheDocument();
      expect(screen.getByText("Our CAC is $100.")).toBeInTheDocument();
      expect(screen.getByText("Explain your payback.")).toBeInTheDocument();

      const submitBtn = screen.getByRole("button", { name: /submit response/i });
      fireEvent.click(submitBtn);
      expect(handleSend).toHaveBeenCalled();
    });

    it("renders DebriefConfirmModal and confirms debrief generation", () => {
      const handleClose = vi.fn();
      const handleConfirm = vi.fn();

      render(
        <DebriefConfirmModal
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          turnCount={5}
          claimsCount={4}
        />
      );

      expect(screen.getByText("Generate Investor Debrief?")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      const confirmBtn = screen.getByRole("button", { name: /conclude & generate debrief/i });
      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalled();
    });

    it("renders LedgerDrawer when open and handles close click", () => {
      const handleClose = vi.fn();
      render(
        <LedgerDrawer
          isOpen={true}
          onClose={handleClose}
          claims={[{ id: 1, claim_text: "Gross margin 80%", category: "unit_economics", status: "evidenced", source_turn: 1 }]}
        />
      );

      expect(screen.getByText("Diligence Drawer")).toBeInTheDocument();
      const closeBtn = screen.getByRole("button", { name: /close ledger drawer/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe("BehindDoorsScene Component", () => {
    it("renders behind-doors deliberation dialogue with playback controls", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          dialogue: [
            {
              speakerId: "rohan",
              speakerName: "Rohan Mehta",
              statement: "The margins seem high given acquisition friction.",
              tone: "skeptical",
              unfilteredThought: "I need to see cohort retention.",
            },
            {
              speakerId: "meera",
              speakerName: "Meera Shah",
              statement: "Market dynamics are favorable.",
              tone: "bullish",
              unfilteredThought: "Could capture early enterprise.",
            },
          ],
          consensus: "Hold for audit",
          mood: "Cautious",
          verdictPreview: "Conditional",
        }),
      });

      const { container } = render(<BehindDoorsScene sessionId="sess-test" />);
      
      // Wait for fetch to load dialogue
      await screen.findByText(/Behind Closed Doors/i);
      expect(screen.getByText(/Partner Deliberation/i)).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Header Component", () => {
    it("renders Header brand logo and navigation", async () => {
      const { container } = render(<Header />);
      expect(screen.getByRole("banner")).toBeInTheDocument();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
