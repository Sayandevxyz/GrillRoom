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
      className={`bg-navy text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shadow-md ${className}`}
    >
      <div className="flex items-center">
        <Link
          href="/"
          className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy rounded"
          aria-label="GrillRoom Home"
        >
          <Image
            src="/brand/grillroom-logo.png"
            alt="GrillRoom Logo"
            width={128}
            height={32}
            priority
            className="h-8 w-auto object-contain"
          />
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
    </header>
  );
};
