import { useState } from "react";
import { useRouter } from "next/navigation";
import { MIN_EXCHANGES_FOR_DEBRIEF } from "@/lib/constants";

/** Hook to manage verdict flow, debrief modal, and mobile drawer state. */
export function useVerdictFlow(sessionId: string, founderExchangeCount: number) {
  const router = useRouter();
  const [showLedgerDrawer, setShowLedgerDrawer] = useState(false);
  const [showDebriefConfirm, setShowDebriefConfirm] = useState(false);

  const canGenerateDebrief = founderExchangeCount >= MIN_EXCHANGES_FOR_DEBRIEF;

  const navigateToDebrief = () => {
    router.push(`/session/${sessionId}/debrief`);
  };

  return {
    showLedgerDrawer,
    setShowLedgerDrawer,
    showDebriefConfirm,
    setShowDebriefConfirm,
    canGenerateDebrief,
    navigateToDebrief,
  };
}
