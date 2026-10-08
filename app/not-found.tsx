import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 font-serif">
      <div className="max-w-md w-full bg-[#FCF9F3] border border-gold/30 rounded-2xl p-8 shadow-xl text-center">
        <span className="text-4xl font-mono font-bold text-orange mb-2 block">404</span>
        <h2 className="text-2xl font-bold text-navy mb-2">Pitch Not Found</h2>
        <p className="text-navy/70 text-sm mb-6 leading-relaxed">
          The requested interrogation session or briefing does not exist or has expired.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded-xl bg-navy text-cream font-medium text-sm hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          Return to Boardroom
        </Link>
      </div>
    </div>
  );
}
