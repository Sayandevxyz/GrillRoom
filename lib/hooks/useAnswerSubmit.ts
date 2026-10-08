import { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";
import { StepState } from "@/components/ui/Stepper";
import { LedgerClaimItem } from "@/components/DueDiligenceLedger";
import { INVESTOR_PROFILES } from "@/lib/constants";
import { Turn } from "./useSessionState";

export interface StreamingMeta {
  speakerId: string;
  speakerName: string;
  questionType: string;
  isInterrupt: boolean;
  ladderLevel?: number;
  threadId?: number;
}

export interface SSEStatePayload {
  meters?: Record<string, number>;
  turnCount?: number;
  round?: string;
  claims?: LedgerClaimItem[];
  shouldMoveToKillShot?: boolean;
}

interface UseAnswerSubmitProps {
  sessionId: string;
  currentRound: StepState;
  convictions: Record<string, number>;
  setTurns: Dispatch<SetStateAction<Turn[]>>;
  setConvictions: Dispatch<SetStateAction<Record<string, number>>>;
  setPreviousConvictions: Dispatch<SetStateAction<Record<string, number>>>;
  setTurnCount: Dispatch<SetStateAction<number>>;
  setCurrentRound: Dispatch<SetStateAction<StepState>>;
  setClaims: Dispatch<SetStateAction<LedgerClaimItem[]>>;
  setActiveSpeaker: Dispatch<SetStateAction<string | null>>;
  turns: Turn[];
}

/** Hook to handle SSE streaming response submission and keyboard controls. */
export function useAnswerSubmit({
  sessionId,
  currentRound,
  convictions,
  setTurns,
  setConvictions,
  setPreviousConvictions,
  setTurnCount,
  setCurrentRound,
  setClaims,
  setActiveSpeaker,
  turns,
}: UseAnswerSubmitProps) {
  const [answerInput, setAnswerInput] = useState(() => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        return window.sessionStorage.getItem(`grillroom_draft_${sessionId}`) || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingMeta, setStreamingMeta] = useState<StreamingMeta | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist draft to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        if (answerInput) {
          window.sessionStorage.setItem(`grillroom_draft_${sessionId}`, answerInput);
        } else {
          window.sessionStorage.removeItem(`grillroom_draft_${sessionId}`);
        }
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [answerInput, sessionId]);

  // Auto-scroll transcript on turns or stream updates respecting manual scroll
  useEffect(() => {
    if (!transcriptEndRef.current) return;
    const container = transcriptEndRef.current.parentElement;
    if (container) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 180;
      if (isNearBottom || isStreaming) {
        transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [turns, streamingText, isStreaming]);

  const handleSendAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!answerInput.trim() || isStreaming) return;

    const userText = answerInput.trim();
    setAnswerInput("");
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem(`grillroom_draft_${sessionId}`);
      } catch {
        // Ignore
      }
    }
    setErrorMessage("");

    const userTurn: Turn = {
      role: "founder",
      speakerId: "founder",
      speakerName: "You",
      text: userText,
      round: currentRound,
    };
    setTurns((prev) => [...prev, userTurn]);

    setIsStreaming(true);
    setStreamingText("");
    setStreamingMeta(null);
    setPreviousConvictions(convictions);

    try {
      const response = await fetch("/api/session/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answer: userText }),
      });

      if (!response.ok) {
        const errJson = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || "Failed to process turn");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("SSE Stream connection failed");

      const decoder = new TextDecoder();
      let buffer = "";

      let currentSpeakerId = "";
      let currentSpeakerName = "";
      let currentQuestionType = "";
      let isInterrupt = false;
      let accumulatedSpeech = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          let eventType = "message";
          let eventData = "";

          for (const subLine of line.split("\n")) {
            if (subLine.startsWith("event: ")) {
              eventType = subLine.slice(7).trim();
            } else if (subLine.startsWith("data: ")) {
              eventData = subLine.slice(6).trim();
            }
          }

          if (!eventData) continue;
          const parsed = JSON.parse(eventData);

          if (eventType === "meta") {
            const meta = parsed as StreamingMeta;
            setStreamingMeta(meta);
            currentSpeakerId = meta.speakerId;
            currentSpeakerName =
              INVESTOR_PROFILES[meta.speakerId]?.name || meta.speakerName;
            currentQuestionType = meta.questionType;
            isInterrupt = meta.isInterrupt;
            setActiveSpeaker(meta.speakerId);
          } else if (eventType === "token") {
            const tokenPiece = String(parsed.token || "");
            accumulatedSpeech += tokenPiece;
            setStreamingText((prev) => prev + tokenPiece);
          } else if (eventType === "state") {
            const stateData = parsed as SSEStatePayload;
            if (stateData.meters) setConvictions(stateData.meters);
            if (stateData.turnCount !== undefined) setTurnCount(stateData.turnCount);
            if (stateData.round) setCurrentRound(stateData.round as StepState);
            if (stateData.claims) setClaims(stateData.claims);
            if (stateData.shouldMoveToKillShot) {
              setCurrentRound("kill_shot");
            }
          } else if (eventType === "done") {
            setTurns((prev) => [
              ...prev,
              {
                role: "investor",
                speakerId: currentSpeakerId,
                speakerName: currentSpeakerName,
                text: accumulatedSpeech,
                round: currentRound,
                questionType: currentQuestionType,
                isInterrupt,
              },
            ]);
            setStreamingText("");
            setStreamingMeta(null);
            setActiveSpeaker(null);
          } else if (eventType === "error") {
            setErrorMessage(parsed.message || "An interrogation error occurred");
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection lost. Please retry.";
      setErrorMessage(message);
    } finally {
      setIsStreaming(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  return {
    answerInput,
    setAnswerInput,
    isStreaming,
    streamingText,
    streamingMeta,
    errorMessage,
    setErrorMessage,
    transcriptEndRef,
    textareaRef,
    handleSendAnswer,
    handleKeyDown,
  };
}
