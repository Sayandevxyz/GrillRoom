import { useState, useEffect } from "react";
import { IntensityMode, RoundType, TurnRole } from "@/lib/types";
import { LedgerClaimItem } from "@/components/DueDiligenceLedger";
import { StepState } from "@/components/ui/Stepper";
import { INVESTOR_PROFILES } from "@/lib/constants";
import { logger } from "@/lib/logger";

export interface Turn {
  id?: number;
  role: TurnRole;
  speakerId: string;
  speakerName: string;
  text: string;
  round: RoundType | string;
  questionType?: string | null;
  isInterrupt?: boolean;
}

export interface StartSessionResponse {
  session?: {
    turn_count?: number;
    intensity?: IntensityMode;
    idea_text?: string;
  };
  turns?: Array<{
    role: TurnRole;
    speaker_id: string;
    text: string;
    round: RoundType;
    question_type?: string;
  }>;
  claims?: LedgerClaimItem[];
  meters?: Record<string, number>;
}

/** Hook to fetch and manage live interrogation board state for a session. */
export function useSessionState(sessionId: string) {
  const [convictions, setConvictions] = useState<Record<string, number>>({});
  const [previousConvictions, setPreviousConvictions] = useState<Record<string, number>>({});
  const [turns, setTurns] = useState<Turn[]>([]);
  const [claims, setClaims] = useState<LedgerClaimItem[]>([]);
  const [currentRound, setCurrentRound] = useState<StepState>("opening");
  const [turnCount, setTurnCount] = useState(0);
  const [intensity, setIntensity] = useState<IntensityMode>("tough");
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [pitchText, setPitchText] = useState("");
  const [isPitchCollapsed, setIsPitchCollapsed] = useState(true);

  useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch(`/api/session/start?sessionId=${sessionId}`);
        if (res.ok) {
          const data = (await res.json()) as StartSessionResponse;
          if (data.turns) {
            setTurns(
              data.turns.map((t) => ({
                role: t.role,
                speakerId: t.speaker_id,
                speakerName:
                  t.role === "chair"
                    ? "Independent Chair"
                    : t.role === "founder"
                    ? "You"
                    : INVESTOR_PROFILES[t.speaker_id]?.name || t.speaker_id,
                text: t.text,
                round: t.round,
                questionType: t.question_type,
              }))
            );
          }
          if (data.claims) setClaims(data.claims);
          if (data.meters) {
            setConvictions(data.meters);
            setPreviousConvictions(data.meters);
          }
          if (data.session) {
            setTurnCount(data.session.turn_count || 0);
            setIntensity(data.session.intensity || "tough");
            if (data.session.idea_text) {
              setPitchText(data.session.idea_text);
            }
          }
        }
      } catch (err: unknown) {
        logger.warn("Session fetch error", "initSession", { err: String(err) });
      }
    }
    initSession();
  }, [sessionId]);

  return {
    convictions,
    setConvictions,
    previousConvictions,
    setPreviousConvictions,
    turns,
    setTurns,
    claims,
    setClaims,
    currentRound,
    setCurrentRound,
    turnCount,
    setTurnCount,
    intensity,
    setIntensity,
    activeSpeaker,
    setActiveSpeaker,
    pitchText,
    setPitchText,
    isPitchCollapsed,
    setIsPitchCollapsed,
  };
}
