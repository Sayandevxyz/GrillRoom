"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Application Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 font-serif">
      <div className="max-w-md w-full bg-[#FCF9F3] border border-gold/30 rounded-2xl p-8 shadow-xl text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-orange/10 border border-orange/30 flex items-center justify-center text-orange text-2xl font-bold">
          !
        </div>
        <h2 className="text-2xl font-bold text-navy mb-2">Deliberation Interrupted</h2>
        <p className="text-navy/70 text-sm mb-6 leading-relaxed">
          The investment panel encountered an unexpected system error. Your session data is safely preserved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-orange text-cream font-medium text-sm hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2"
          >
            Retry Session
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-navy/5 text-navy font-medium text-sm hover:bg-navy/10 transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            Return to Lobby
          </Link>
        </div>
      </div>
    </div>
  );
}
