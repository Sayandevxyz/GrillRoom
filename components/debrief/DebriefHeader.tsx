import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Printer, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";

const ShareCardButton = dynamic(
  () =>
    import("@/components/features/share-card/ShareCardButton").then(
      (mod) => mod.ShareCardButton
    ),
  { ssr: false }
);

interface DebriefHeaderProps {
  sessionId: string;
  readinessScore: number;
  onOpenRetry: () => void;
}

/** Sticky navigation header for debrief report with PDF print and retry actions. */
export function DebriefHeader({
  sessionId,
  readinessScore,
  onOpenRetry,
}: DebriefHeaderProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <header className="bg-navy text-white px-6 py-3.5 border-b border-slate-800 sticky top-0 z-30 shadow-md no-print">
      <div className="max-w-page mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center" aria-label="GrillRoom Home">
            <Image
              src="/brand/grillroom-logo.png"
              alt="GrillRoom"
              width={120}
              height={30}
              priority
              className="h-7 w-auto object-contain"
            />
          </Link>
          <span className="text-xs text-slate-400 border-l border-slate-700 pl-4 hidden sm:inline">
            Investor Readiness Report
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Save as PDF
          </Button>

          <ShareCardButton sessionId={sessionId} readinessScore={readinessScore} />

          <Button
            variant="primary"
            size="sm"
            onClick={onOpenRetry}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Retry with Improved Pitch
          </Button>
        </div>
      </div>
    </header>
  );
}
