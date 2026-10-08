import React from "react";
import Image from "next/image";
import Link from "next/link";

export interface HeaderProps {
  onHowItWorksClick?: () => void;
  className?: string;
}

/**
 * Top authority header: deep navy bar, official logo on left with clear space,
 * and quiet 'How it works' action on right.
 */
export const Header: React.FC<HeaderProps> = ({ onHowItWorksClick, className = "" }) => {
  return (
    <header
      className={`bg-navy text-white border-b border-slate-800 shadow-md ${className}`}
    >
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
            aria-label="GrillRoom Home"
          >
            <Image
              src="/brand/logo-mark.png"
              alt="GrillRoom Flame"
              width={36}
              height={36}
              priority
              className="h-9 w-auto object-contain rounded-md shadow-sm"
            />
            <span className="font-serif font-bold text-xl tracking-tight text-white">
              Grill<span className="text-cta">Room</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {onHowItWorksClick ? (
            <button
              onClick={onHowItWorksClick}
              className="text-xs font-semibold text-slate-300 hover:text-white transition-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded px-2 py-1"
            >
              How it works
            </button>
          ) : (
            <a
              href="#how-it-works"
              className="text-xs font-semibold text-slate-300 hover:text-white transition-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded px-2 py-1"
            >
              How it works
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
