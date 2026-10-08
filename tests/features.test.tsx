/**
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PitchRadar } from "@/components/features/radar/PitchRadar";
import { ReactionBadge } from "@/components/features/reactions/ReactionBadge";
import { ShareCardButton } from "@/components/features/share-card/ShareCardButton";
import { IntroGate } from "@/components/features/intro-gate/IntroGate";

vi.mock("@/lib/features/flags", () => ({
  FEATURE_INTRO_GATE: true,
  FEATURE_REACTIONS: true,
  FEATURE_RADAR: true,
  FEATURE_SHARE_CARD: true,
  FEATURE_BEHIND_DOORS: true,
}));

describe("Feature Components Suite", () => {
  describe("ReactionBadge", () => {
    it("renders reaction badge with mood and emoji on positive delta", () => {
      render(<ReactionBadge investorId="rohan" delta={6} />);
      expect(screen.getByText("Interested")).toBeInTheDocument();
    });

    it("renders skeptical mood badge on negative delta", () => {
      render(<ReactionBadge investorId="rohan" delta={-5} />);
      expect(screen.getByText("Skeptical")).toBeInTheDocument();
    });

    it("returns null if delta is undefined", () => {
      const { container } = render(<ReactionBadge investorId="rohan" delta={undefined} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("PitchRadar", () => {
    const mockScores = {
      directness: 75,
      specificity: 80,
      evidence: 65,
      logic: 85,
      honesty: 70,
    };

    it("renders SVG polygon radar chart with all 5 DNA axes", () => {
      render(<PitchRadar current={mockScores} />);
      expect(screen.getByText("Pitch DNA Radar")).toBeInTheDocument();
      expect(screen.getByText("Directness")).toBeInTheDocument();
      expect(screen.getByText("Specificity")).toBeInTheDocument();
      expect(screen.getByText("Evidence")).toBeInTheDocument();
      expect(screen.getByText("Logic")).toBeInTheDocument();
      expect(screen.getByText("Honesty")).toBeInTheDocument();
    });

    it("renders delta comparison metrics when previous attempt exists", () => {
      const previousScores = {
        directness: 60,
        specificity: 70,
        evidence: 50,
        logic: 75,
        honesty: 65,
      };
      render(<PitchRadar current={mockScores} previous={previousScores} />);
      const deltas15 = screen.getAllByText("+15");
      expect(deltas15.length).toBeGreaterThanOrEqual(1);
      const deltas10 = screen.getAllByText("+10");
      expect(deltas10.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("ShareCardButton", () => {
    it("renders share button and opens verdict preview modal", () => {
      render(<ShareCardButton sessionId="test-session-123" readinessScore={82} />);
      const btn = screen.getByRole("button", { name: /share verdict card/i });
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Shareable Investment Verdict Card")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /download png/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /copy to linkedin/i })).toBeInTheDocument();
    });

    it("copies share caption to clipboard when copy button is clicked", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<ShareCardButton sessionId="test-session-123" readinessScore={85} />);
      fireEvent.click(screen.getByRole("button", { name: /share verdict card/i }));

      const copyBtn = screen.getByRole("button", { name: /copy to linkedin/i });
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("85/100"));
      });
    });
  });

  describe("IntroGate", () => {
    it("renders boardroom gate briefing and triggers opening on enter click", () => {
      const handleEnter = vi.fn();
      render(<IntroGate onEnter={handleEnter} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(/kya hua bhai, idea hai/i)).toBeInTheDocument();

      const enterBtn = screen.getByRole("button", { name: /enter the grillroom/i });
      fireEvent.click(enterBtn);
      expect(dialog).toHaveClass("intro-opening");
    });
  });
});
