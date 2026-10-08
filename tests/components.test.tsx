/**
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Stepper } from "@/components/ui/Stepper";
import { Tabs } from "@/components/ui/Tabs";
import { Meter } from "@/components/ui/Meter";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Dialog } from "@/components/ui/Dialog";
import { DueDiligenceLedger } from "@/components/DueDiligenceLedger";
import { getReaction } from "@/lib/features/reactions/getReaction";

describe("UI Components Accessibility and Behavior Suite", () => {
  describe("Stepper Component", () => {
    it("renders steps with proper aria-current='step' on active round", () => {
      render(<Stepper currentRound="deep_dive" />);
      const nav = screen.getByRole("navigation", { name: /review progress/i });
      expect(nav).toBeInTheDocument();

      const deepDiveStep = screen.getByText("Deep Dive").closest("[aria-current='step']");
      expect(deepDiveStep).toBeInTheDocument();

      const openingStep = screen.getByText("Opening").closest("[aria-current]");
      expect(openingStep).toBeNull();
    });
  });

  describe("Tabs Component", () => {
    const sampleTabs = [
      { id: "all", label: "All Items", count: 5 },
      { id: "verified", label: "Verified", count: 2 },
      { id: "needs-proof", label: "Needs Proof", count: 3 },
    ];

    it("renders with tablist and tab roles and sets aria-selected properly", () => {
      const handleChange = vi.fn();
      render(<Tabs tabs={sampleTabs} activeTab="verified" onChange={handleChange} />);

      const tablist = screen.getByRole("tablist");
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(3);

      const verifiedTab = screen.getByRole("tab", { name: /verified/i });
      expect(verifiedTab).toHaveAttribute("aria-selected", "true");

      const allTab = screen.getByRole("tab", { name: /all items/i });
      expect(allTab).toHaveAttribute("aria-selected", "false");
    });

    it("navigates tabs with ArrowRight and ArrowLeft keyboard keys", () => {
      const handleChange = vi.fn();
      render(<Tabs tabs={sampleTabs} activeTab="all" onChange={handleChange} />);

      const allTab = screen.getByRole("tab", { name: /all items/i });
      fireEvent.keyDown(allTab, { key: "ArrowRight" });
      expect(handleChange).toHaveBeenCalledWith("verified");

      fireEvent.keyDown(allTab, { key: "ArrowLeft" });
      expect(handleChange).toHaveBeenCalledWith("needs-proof");
    });
  });

  describe("Meter Component", () => {
    it("renders role='meter' with accessible value attributes and labels", () => {
      render(<Meter value={68} label="Conviction" />);
      const meter = screen.getByRole("meter");
      expect(meter).toBeInTheDocument();
      expect(meter).toHaveAttribute("aria-valuenow", "68");
      expect(meter).toHaveAttribute("aria-valuemin", "0");
      expect(meter).toHaveAttribute("aria-valuemax", "100");
      expect(meter).toHaveAttribute("aria-label", expect.stringContaining("68%"));
    });

    it("clamps meter values strictly between 0 and 100", () => {
      const { rerender } = render(<Meter value={120} />);
      let meter = screen.getByRole("meter");
      expect(meter).toHaveAttribute("aria-valuenow", "100");

      rerender(<Meter value={-25} />);
      meter = screen.getByRole("meter");
      expect(meter).toHaveAttribute("aria-valuenow", "0");
    });
  });

  describe("DueDiligenceLedger Component", () => {
    const claims = [
      {
        id: 1,
        claim_text: "Our CAC is $300 across paid search",
        category: "unit_economics",
        status: "unverified",
        source_turn: 1,
      },
      {
        id: 2,
        claim_text: "Gross margins are 85% with hosting cost at $1/seat",
        category: "unit_economics",
        status: "evidenced",
        source_turn: 1,
      },
      {
        id: 3,
        claim_text: "We have 100 enterprise customers paying upfront",
        category: "traction",
        status: "contradicted",
        source_turn: 2,
      },
    ];

    it("categorizes Unverified and Contradicted into Needs Proof / Attention counts", () => {
      render(<DueDiligenceLedger claims={claims} />);

      // Evidenced = 1 verified
      // Unverified (1) + Contradicted (1) = 2 Needs Attention / Proof
      const tablist = screen.getByRole("tablist");
      expect(tablist).toBeInTheDocument();
      expect(screen.getByText("All Claims")).toBeInTheDocument();
      expect(screen.getAllByText("Verified").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Needs Attention")).toBeInTheDocument();
    });

    it("filters claims when clicking tabs", () => {
      render(<DueDiligenceLedger claims={claims} />);
      const verifiedTab = screen.getByRole("tab", { name: /verified/i });
      fireEvent.click(verifiedTab);

      // Verified tab should show the gross margin claim
      expect(screen.getByText(/Gross margins are 85%/i)).toBeInTheDocument();
    });
  });

  describe("Reaction Thresholds (getReaction)", () => {
    it("maps conviction deltas correctly to investor moods", () => {
      expect(getReaction(-10)?.mood).toBe("furious");
      expect(getReaction(-8)?.mood).toBe("furious");
      expect(getReaction(-5)?.mood).toBe("skeptical");
      expect(getReaction(-3)?.mood).toBe("skeptical");
      expect(getReaction(0)?.mood).toBe("neutral");
      expect(getReaction(2)?.mood).toBe("neutral");
      expect(getReaction(5)?.mood).toBe("interested");
      expect(getReaction(7)?.mood).toBe("interested");
      expect(getReaction(10)?.mood).toBe("impressed");
      expect(getReaction(undefined)).toBeNull();
    });
  });

  describe("Button Component", () => {
    it("renders with correct states and disables button when loading or disabled", () => {
      const handleClick = vi.fn();
      const { rerender } = render(
        <Button onClick={handleClick}>Submit Pitch</Button>
      );
      const btn = screen.getByRole("button", { name: /submit pitch/i });
      expect(btn).toBeEnabled();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);

      rerender(<Button isLoading onClick={handleClick}>Submit Pitch</Button>);
      expect(btn).toBeDisabled();

      rerender(<Button disabled onClick={handleClick}>Submit Pitch</Button>);
      expect(btn).toBeDisabled();
    });
  });

  describe("Field Component", () => {
    it("associates label with form input via htmlFor and id", () => {
      render(
        <Field id="pitch-input" label="Your Startup Idea" error="Must be 50 characters minimum">
          <textarea id="pitch-input" />
        </Field>
      );
      const label = screen.getByText(/your startup idea/i);
      expect(label).toHaveAttribute("for", "pitch-input");
      expect(screen.getByText("Must be 50 characters minimum")).toBeInTheDocument();
    });
  });

  describe("Dialog Component", () => {
    it("closes on Escape key press", () => {
      const handleClose = vi.fn();
      render(
        <Dialog isOpen={true} onClose={handleClose} title="Panel Deliberation">
          <p>Deliberation content</p>
        </Dialog>
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
