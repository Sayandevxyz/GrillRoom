"use client";

import React, { useState } from "react";
import { FEATURE_SHARE_CARD } from "@/lib/features/flags";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Share2, Download, Copy, Check } from "lucide-react";

export interface ShareCardButtonProps {
  sessionId: string;
  readinessScore?: number;
  className?: string;
}

export const ShareCardButton: React.FC<ShareCardButtonProps> = ({
  sessionId,
  readinessScore = 74,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!FEATURE_SHARE_CARD) {
    return null;
  }

  const imageUrl = `/api/share-card/${sessionId}`;
  const shareCaption = `Just pitched my startup to GrillRoom's AI investor panel. Survived multiple rounds of intense due diligence with a ${readinessScore}/100 readiness score! Try it here: https://grill-room-ten.vercel.app #GrillRoom #AIInvestors #PitchPractice #Hackathon`;

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(shareCaption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy caption", err);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grillroom-verdict-${sessionId.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.warn("Failed to download share card", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(true)}
        leftIcon={<Share2 className="w-3.5 h-3.5 text-cta" aria-hidden="true" />}
        className={className}
      >
        Share Verdict Card
      </Button>

      {isOpen && (
        <Dialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Shareable Investment Verdict Card"
        >
          <div className="space-y-5">
            <p className="text-xs text-text-2">
              Celebrate your diligence milestone. Download your high-resolution verified partner memo or copy a pre-formatted social caption.
            </p>

            {/* Card Preview Image */}
            <div className="relative rounded-lg overflow-hidden border border-border shadow-md bg-stone-100 aspect-[1200/627]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="GrillRoom Verdict Share Card"
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>

            {/* Actions Grid */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                isLoading={downloading}
                leftIcon={<Download className="w-4 h-4" aria-hidden="true" />}
                className="w-full sm:w-auto"
              >
                Download PNG
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCopyCaption}
                  leftIcon={
                    copied ? (
                      <Check className="w-4 h-4 text-emerald-300" aria-hidden="true" />
                    ) : (
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    )
                  }
                  className="w-full sm:w-auto"
                >
                  {copied ? "Copied to Clipboard!" : "Copy to LinkedIn / X"}
                </Button>
              </div>
            </div>

            {/* Toast feedback pill */}
            {copied && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs font-medium text-center flex items-center justify-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Social caption copied with hashtags and link!
              </div>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
};
