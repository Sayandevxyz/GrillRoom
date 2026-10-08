"use client";

import React from "react";
import { useParams } from "next/navigation";
import { DueDiligenceLedger } from "@/components/DueDiligenceLedger";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { useAnswerSubmit } from "@/lib/hooks/useAnswerSubmit";
import { useVerdictFlow } from "@/lib/hooks/useVerdictFlow";
import { SessionHeader } from "@/components/session/SessionHeader";
import { InvestorPanelStrip } from "@/components/session/InvestorPanelStrip";
import { LiveDialogueCard } from "@/components/session/LiveDialogueCard";
import { DebriefConfirmModal } from "@/components/session/DebriefConfirmModal";
import { LedgerDrawer } from "@/components/session/LedgerDrawer";

/** Main live board interrogation page coordinating panel dialogue, meters, and diligence ledger. */
export default function SessionStagePage() {
  const params = useParams();
  const sessionId = params.id as string;

  const {
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
    activeSpeaker,
    setActiveSpeaker,
    pitchText,
    isPitchCollapsed,
    setIsPitchCollapsed,
  } = useSessionState(sessionId);

  const {
    answerInput,
    setAnswerInput,
    isStreaming,
    streamingText,
    streamingMeta,
    errorMessage,
    transcriptEndRef,
    textareaRef,
    handleSendAnswer,
    handleKeyDown,
  } = useAnswerSubmit({
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
  });

  const founderExchangeCount = turns.filter((t) => t.role === "founder").length;

  const {
    showLedgerDrawer,
    setShowLedgerDrawer,
    showDebriefConfirm,
    setShowDebriefConfirm,
    canGenerateDebrief,
    navigateToDebrief,
  } = useVerdictFlow(sessionId, founderExchangeCount);

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* 1. Shared Authority Top Bar */}
      <SessionHeader
        currentRound={currentRound}
        founderExchangeCount={founderExchangeCount}
        intensity={intensity}
        claimsCount={claims.length}
        showLedgerDrawer={showLedgerDrawer}
        onToggleLedgerDrawer={() => setShowLedgerDrawer(!showLedgerDrawer)}
        canGenerateDebrief={canGenerateDebrief}
        onRequestDebrief={() => {
          if (canGenerateDebrief) setShowDebriefConfirm(true);
        }}
      />

      {/* Main Review Area */}
      <main id="main-content" className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-4 space-y-4">
        <h1 className="sr-only">GrillRoom Live Due Diligence Boardroom</h1>

        {/* 2. Investor Panel Strip (5 compact executive cards) */}
        <InvestorPanelStrip
          convictions={convictions}
          previousConvictions={previousConvictions}
          activeSpeaker={activeSpeaker}
        />

        {/* 3. Conversation & Ledger Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Conversation Column (8 cols on XL) */}
          <div className="xl:col-span-8 space-y-4">
            <LiveDialogueCard
              turns={turns}
              founderExchangeCount={founderExchangeCount}
              pitchText={pitchText}
              isPitchCollapsed={isPitchCollapsed}
              setIsPitchCollapsed={setIsPitchCollapsed}
              isStreaming={isStreaming}
              streamingText={streamingText}
              streamingMeta={streamingMeta}
              errorMessage={errorMessage}
              answerInput={answerInput}
              setAnswerInput={setAnswerInput}
              handleSendAnswer={handleSendAnswer}
              handleKeyDown={handleKeyDown}
              textareaRef={textareaRef}
              transcriptEndRef={transcriptEndRef}
            />
          </div>

          {/* Due Diligence Ledger Column (Desktop 4 cols, sticky) */}
          <div className="hidden xl:block xl:col-span-4 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-230px)] xl:overflow-y-auto">
            <DueDiligenceLedger claims={claims} />
          </div>
        </div>
      </main>

      {/* Drawer Overlay for Tablet/Mobile Due Diligence Ledger */}
      <LedgerDrawer
        isOpen={showLedgerDrawer}
        onClose={() => setShowLedgerDrawer(false)}
        claims={claims}
      />

      {/* Confirmation Dialog: Conclude & Generate Debrief */}
      <DebriefConfirmModal
        isOpen={showDebriefConfirm}
        onClose={() => setShowDebriefConfirm(false)}
        onConfirm={navigateToDebrief}
        turnCount={turnCount}
        claimsCount={claims.length}
      />

      {/* Persistent Legal Footer */}
      <footer className="border-t border-border bg-white px-6 py-4 text-center text-xs text-text-2">
        <p>GrillRoom uses simulated investors for practice. Verdicts do not predict real investment decisions.</p>
      </footer>
    </div>
  );
}
