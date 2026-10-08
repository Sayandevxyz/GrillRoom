"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Root Error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F6EFE1] flex items-center justify-center px-4 font-sans text-[#14284F]">
        <div className="max-w-md w-full bg-[#FCF9F3] border border-[#D4AF37]/30 rounded-2xl p-8 shadow-xl text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#D4572B]/10 border border-[#D4572B]/30 flex items-center justify-center text-[#D4572B] text-2xl font-bold">
            !
          </div>
          <h2 className="text-2xl font-bold text-[#14284F] mb-2">Critical System Error</h2>
          <p className="text-[#14284F]/70 text-sm mb-6 leading-relaxed">
            GrillRoom encountered an unrecoverable root layout exception. Please reload the application.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 rounded-xl bg-[#D4572B] text-[#F6EFE1] font-semibold text-sm hover:opacity-95 transition-opacity"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
