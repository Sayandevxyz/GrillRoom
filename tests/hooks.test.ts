/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { useAnswerSubmit } from "@/lib/hooks/useAnswerSubmit";
import { useVerdictFlow } from "@/lib/hooks/useVerdictFlow";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: "mock-session-123" }),
}));

describe("Custom Hooks Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useVerdictFlow", () => {
    it("initializes with default drawer closed and debrief disabled when under 3 exchanges", () => {
      const { result } = renderHook(() => useVerdictFlow("sess-1", 2));
      expect(result.current.showLedgerDrawer).toBe(false);
      expect(result.current.showDebriefConfirm).toBe(false);
      expect(result.current.canGenerateDebrief).toBe(false);
    });

    it("enables debrief when exchange count >= 3 and navigates on debrief call", () => {
      const { result } = renderHook(() => useVerdictFlow("sess-1", 3));
      expect(result.current.canGenerateDebrief).toBe(true);

      act(() => {
        result.current.setShowLedgerDrawer(true);
        result.current.setShowDebriefConfirm(true);
      });
      expect(result.current.showLedgerDrawer).toBe(true);
      expect(result.current.showDebriefConfirm).toBe(true);

      act(() => {
        result.current.navigateToDebrief();
      });
      expect(mockPush).toHaveBeenCalledWith("/session/sess-1/debrief");
    });
  });

  describe("useSessionState", () => {
    it("loads session data successfully and updates initial state", async () => {
      const mockSessionData = {
        session: { turn_count: 4, intensity: "shark", idea_text: "AI SaaS for Logistics" },
        turns: [
          { role: "chair", speaker_id: "chair", text: "Welcome", round: "opening" },
          { role: "founder", speaker_id: "founder", text: "Hello", round: "opening" },
          { role: "investor", speaker_id: "rohan", text: "What is your CAC?", round: "opening" },
        ],
        claims: [{ id: 1, claim_text: "CAC is $200", category: "unit_economics", status: "unverified", source_turn: 1 }],
        meters: { rohan: 65, meera: 50 },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSessionData,
      });

      const { result } = renderHook(() => useSessionState("sess-abc"));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(result.current.turnCount).toBe(4);
      expect(result.current.intensity).toBe("shark");
      expect(result.current.pitchText).toBe("AI SaaS for Logistics");
      expect(result.current.turns.length).toBe(3);
      expect(result.current.convictions.rohan).toBe(65);
      expect(result.current.claims.length).toBe(1);

      act(() => {
        result.current.setIsPitchCollapsed(false);
      });
      expect(result.current.isPitchCollapsed).toBe(false);
    });

    it("handles fetch failure gracefully without crashing", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network failed"));
      const { result } = renderHook(() => useSessionState("sess-fail"));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(result.current.turns).toEqual([]);
      expect(result.current.turnCount).toBe(0);
    });
  });

  describe("useAnswerSubmit", () => {
    it("submits answer via SSE and streams responses into turns", async () => {
      const setTurns = vi.fn();
      const setConvictions = vi.fn();
      const setPreviousConvictions = vi.fn();
      const setTurnCount = vi.fn();
      const setCurrentRound = vi.fn();
      const setClaims = vi.fn();
      const setActiveSpeaker = vi.fn();

      const encoder = new TextEncoder();
      const sseChunks = [
        "event: meta\ndata: " + JSON.stringify({ speakerId: "rohan", speakerName: "Rohan Mehta", questionType: "unit_economics", isInterrupt: false }) + "\n\n",
        "event: token\ndata: " + JSON.stringify({ token: "Show " }) + "\n\n",
        "event: token\ndata: " + JSON.stringify({ token: "me data." }) + "\n\n",
        "event: state\ndata: " + JSON.stringify({ meters: { rohan: 55 }, turnCount: 2, round: "deep_dive", claims: [] }) + "\n\n",
        "event: done\ndata: {}\n\n",
      ];

      let streamIndex = 0;
      const readableStream = new ReadableStream({
        pull(controller) {
          if (streamIndex < sseChunks.length) {
            controller.enqueue(encoder.encode(sseChunks[streamIndex]));
            streamIndex++;
          } else {
            controller.close();
          }
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: readableStream,
      });

      const { result } = renderHook(() =>
        useAnswerSubmit({
          sessionId: "sess-1",
          currentRound: "opening",
          convictions: { rohan: 50 },
          setTurns,
          setConvictions,
          setPreviousConvictions,
          setTurnCount,
          setCurrentRound,
          setClaims,
          setActiveSpeaker,
          turns: [],
        })
      );

      act(() => {
        result.current.setAnswerInput("Our CAC is $150 based on 500 signups.");
      });

      await act(async () => {
        await result.current.handleSendAnswer();
      });

      expect(setTurns).toHaveBeenCalled();
      expect(setConvictions).toHaveBeenCalledWith({ rohan: 55 });
      expect(setTurnCount).toHaveBeenCalledWith(2);
      expect(setCurrentRound).toHaveBeenCalledWith("deep_dive");
      expect(result.current.answerInput).toBe("");
    });

    it("triggers handleSendAnswer on Ctrl+Enter keyboard event", async () => {
      const { result } = renderHook(() =>
        useAnswerSubmit({
          sessionId: "sess-1",
          currentRound: "opening",
          convictions: {},
          setTurns: vi.fn(),
          setConvictions: vi.fn(),
          setPreviousConvictions: vi.fn(),
          setTurnCount: vi.fn(),
          setCurrentRound: vi.fn(),
          setClaims: vi.fn(),
          setActiveSpeaker: vi.fn(),
          turns: [],
        })
      );

      const fakeEvent = {
        ctrlKey: true,
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      act(() => {
        result.current.setAnswerInput("Test Answer");
        result.current.handleKeyDown(fakeEvent);
      });

      expect(fakeEvent.preventDefault).toHaveBeenCalled();
    });

    it("handles submission error gracefully and displays error message", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Rate limit reached" }),
      });

      const { result } = renderHook(() =>
        useAnswerSubmit({
          sessionId: "sess-1",
          currentRound: "opening",
          convictions: {},
          setTurns: vi.fn(),
          setConvictions: vi.fn(),
          setPreviousConvictions: vi.fn(),
          setTurnCount: vi.fn(),
          setCurrentRound: vi.fn(),
          setClaims: vi.fn(),
          setActiveSpeaker: vi.fn(),
          turns: [],
        })
      );

      act(() => {
        result.current.setAnswerInput("Valid text");
      });

      await act(async () => {
        await result.current.handleSendAnswer();
      });

      expect(result.current.errorMessage).toBe("Rate limit reached");
    });
  });
});
