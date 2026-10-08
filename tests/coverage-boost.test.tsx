/**
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { isFlagEnabled } from "@/lib/features/flags";
import { Field } from "@/components/ui/Field";
import { Meter } from "@/components/ui/Meter";
import { LiveDialogueCard } from "@/components/session/LiveDialogueCard";
import { GroqApiError, getGroqClient } from "@/lib/llm/groq";
import { getSessionRadar } from "@/lib/features/radar/getSessionRadar";
import { mockDb } from "@/lib/db";

describe("Coverage Boost & Component Branch Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Feature Flags Logic (lib/features/flags.ts)", () => {
    it("handles undefined, empty string, false, 0, off, and truthy values correctly", () => {
      expect(isFlagEnabled(undefined, true)).toBe(true);
      expect(isFlagEnabled(undefined, false)).toBe(false);
      expect(isFlagEnabled("", true)).toBe(true);
      expect(isFlagEnabled("", false)).toBe(false);
      expect(isFlagEnabled("false")).toBe(false);
      expect(isFlagEnabled("0")).toBe(false);
      expect(isFlagEnabled("off")).toBe(false);
      expect(isFlagEnabled("true")).toBe(true);
      expect(isFlagEnabled("1")).toBe(true);
      expect(isFlagEnabled("on")).toBe(true);
    });
  });

  describe("Groq Client Types and Utilities (lib/llm/groq.ts)", () => {
    it("instantiates GroqApiError with status and code", () => {
      const err = new GroqApiError("Rate limited", 429, "rate_limit_exceeded");
      expect(err.message).toBe("Rate limited");
      expect(err.status).toBe(429);
      expect(err.code).toBe("rate_limit_exceeded");
      expect(err.name).toBe("GroqApiError");
    });

    it("creates an OpenAI client instance with default options", () => {
      const client = getGroqClient();
      expect(client).toBeDefined();
      expect(client.chat).toBeDefined();
    });
  });

  describe("Field UI Component (components/ui/Field.tsx)", () => {
    it("renders required badge and error message", () => {
      render(
        <Field id="test-field" label="Email" required error="Email is invalid">
          <input id="test-field" />
        </Field>
      );
      expect(screen.getByText("*")).toBeInTheDocument();
      expect(screen.getByText("Email is invalid")).toBeInTheDocument();
    });

    it("renders helper text when error is not present", () => {
      render(
        <Field id="test-field" label="Username" helperText="Choose a unique handle">
          <input id="test-field" />
        </Field>
      );
      expect(screen.getByText("Choose a unique handle")).toBeInTheDocument();
    });

    it("displays over-limit character count warning", () => {
      render(
        <Field
          id="test-field"
          label="Bio"
          characterCount={{ current: 150, max: 100, min: 20 }}
        >
          <textarea id="test-field" />
        </Field>
      );
      const counter = screen.getByText(/150 \/ 100/);
      expect(counter).toHaveClass("text-danger");
    });

    it("displays under-min character count warning", () => {
      render(
        <Field
          id="test-field"
          label="Bio"
          characterCount={{ current: 10, max: 100, min: 20 }}
        >
          <textarea id="test-field" />
        </Field>
      );
      const counter = screen.getByText(/10 \/ 100/);
      expect(counter).toHaveClass("text-warning");
    });
  });

  describe("Meter UI Component (components/ui/Meter.tsx)", () => {
    it("renders negative delta and leaning out label", () => {
      render(<Meter value={35} previousValue={50} label="Risk" />);
      expect(screen.getByText("-15")).toBeInTheDocument();
      expect(screen.getByRole("meter")).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Leaning out")
      );
    });

    it("renders positive delta and leaning in label", () => {
      render(<Meter value={80} previousValue={60} label="Conviction" />);
      expect(screen.getByText("+20")).toBeInTheDocument();
      expect(screen.getByRole("meter")).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Leaning in")
      );
    });

    it("renders zero delta and undecided label", () => {
      render(<Meter value={55} previousValue={55} showBandLabel={false} />);
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByRole("meter")).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Undecided")
      );
    });
  });

  describe("LiveDialogueCard Component (components/session/LiveDialogueCard.tsx)", () => {
    it("renders varied question types, handles keyboard typing and Ctrl+Enter submit", () => {
      const handleSendAnswer = vi.fn();
      const handleKeyDown = vi.fn((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          handleSendAnswer();
        }
      });
      const setAnswerInput = vi.fn();

      render(
        <LiveDialogueCard
          turns={[
            {
              role: "chair",
              speakerId: "chair",
              speakerName: "Chair",
              text: "Welcome to GrillRoom.",
              round: "opening",
            },
            {
              role: "founder",
              speakerId: "founder",
              speakerName: "You",
              text: "We make AI analytics.",
              round: "opening",
            },
            {
              role: "investor",
              speakerId: "rohan",
              speakerName: "Rohan Mehta",
              text: "What is your gross margin?",
              questionType: "unit_economics",
              isInterrupt: true,
              round: "opening",
            },
            {
              role: "investor",
              speakerId: "meera",
              speakerName: "Meera Shah",
              text: "Who are competitors?",
              questionType: "moat",
              round: "opening",
            },
          ]}
          founderExchangeCount={1}
          pitchText="We do analytics"
          isPitchCollapsed={false}
          setIsPitchCollapsed={vi.fn()}
          isStreaming={false}
          streamingText=""
          streamingMeta={null}
          errorMessage="Network warning"
          answerInput="Our margin is 80%"
          setAnswerInput={setAnswerInput}
          handleSendAnswer={handleSendAnswer}
          handleKeyDown={handleKeyDown}
          textareaRef={{ current: null }}
          transcriptEndRef={{ current: null }}
        />
      );

      expect(screen.getByText("Interrupting")).toBeInTheDocument();
      expect(screen.getByText("Unit economics")).toBeInTheDocument();
      expect(screen.getByText("Defensibility")).toBeInTheDocument();
      expect(screen.getByText("Network warning")).toBeInTheDocument();

      const textarea = screen.getByRole("textbox", { name: /your response/i });
      fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });
      expect(handleSendAnswer).toHaveBeenCalled();
    });
  });

  describe("Session Radar Telemetry (lib/features/radar/getSessionRadar.ts)", () => {
    it("computes radar averages from mock evaluations including parent session retry comparison", async () => {
      const parentId = "parent-radar-session";
      const currentId = "current-radar-session";

      mockDb.sessions.set(parentId, { id: parentId, parent_session_id: null });
      mockDb.sessions.set(currentId, { id: currentId, parent_session_id: parentId });

      mockDb.evaluations.push(
        {
          id: 1,
          session_id: parentId,
          turn_id: 1,
          evaluator_id: "analyst",
          directness: 5,
          specificity: 6,
          evidence: 4,
          logic: 7,
          honesty: 8,
          created_at: new Date(),
        },
        {
          id: 2,
          session_id: currentId,
          turn_id: 2,
          evaluator_id: "analyst",
          directness: 8,
          specificity: 9,
          evidence: 7,
          logic: 8,
          honesty: 9,
          created_at: new Date(),
        }
      );

      const result = await getSessionRadar(currentId);
      expect(result).not.toBeNull();
      expect(result?.current.directness).toBe(8);
      expect(result?.previous?.directness).toBe(5);
      expect(result?.parentSessionId).toBe(parentId);
    });

    it("returns null if no evaluations exist for session", async () => {
      const result = await getSessionRadar("non-existent-session");
      expect(result).toBeNull();
    });
  });
});
