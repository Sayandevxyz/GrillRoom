"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { FEATURE_INTRO_GATE } from "@/lib/features/flags";
import "./intro-gate.css";

const STORAGE_KEY = "grillroom_intro_seen";

interface IntroGateProps {
  onEnter?: () => void;
}

/**
 * Animated Boardroom Entrance Gate for GrillRoom.
 * 
 * Features:
 * - Controlled strictly via NEXT_PUBLIC_FEATURE_INTRO_GATE feature flag
 * - SessionStorage persistence per browser session
 * - Prevents double triggers
 * - Accessible: role="dialog", autofocus CTA, Enter & Escape listeners
 * - Locks body scroll while mounted
 * - Smooth cubic-bezier door opening transition with center flare
 * - Safe fallback if any client errors occur
 */
export const IntroGate: React.FC<IntroGateProps> = ({ onEnter }) => {
  // If feature flag is disabled at build/runtime, do not render anything
  if (!FEATURE_INTRO_GATE) {
    return null;
  }

  return <IntroGateClient onEnter={onEnter} />;
};

function IntroGateClient({ onEnter }: { onEnter?: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [hasError, setHasError] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const leftDoorRef = useRef<HTMLDivElement>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check sessionStorage on client mount
  useEffect(() => {
    try {
      setMounted(true);
      const seen = typeof window !== "undefined" && window.sessionStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setIsVisible(true);
      }
    } catch {
      // Storage blocked / incognito edge cases -> show intro once
      setIsVisible(true);
    }
  }, []);

  // Lock body scroll and set focus when intro is active
  useEffect(() => {
    if (isVisible) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      // Focus CTA button on mount
      const timer = setTimeout(() => {
        buttonRef.current?.focus();
      }, 50);

      return () => {
        document.body.style.overflow = originalOverflow;
        clearTimeout(timer);
      };
    }
  }, [isVisible]);

  const handleFinishEntry = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, "true");
      }
    } catch {
      // Ignore storage errors
    }

    setIsVisible(false);
    onEnter?.();
  }, [onEnter]);

  const handleEnterClick = useCallback(() => {
    if (isOpening || isFadingOut) return;

    setIsOpening(true);

    // Safety fallback: if transitionEnd doesn't fire, ensure clean completion
    safetyTimerRef.current = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(handleFinishEntry, 400);
    }, 1600);
  }, [isOpening, isFadingOut, handleFinishEntry]);

  // Handle CSS transition completion on the sliding door
  const handleDoorTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    // Check if the door's transform transition ended
    if (e.target === leftDoorRef.current && e.propertyName === "transform" && isOpening) {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
      }
      setIsFadingOut(true);
      setTimeout(handleFinishEntry, 400);
    }
  };

  // Keyboard navigation: Enter or Escape triggers entry
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        handleEnterClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, handleEnterClick]);

  // Cleanup safety timers
  useEffect(() => {
    return () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
      }
    };
  }, []);

  // Error boundary fallback
  if (hasError) {
    return null;
  }

  // Before client mount, render plain dark cover when flag is ON to prevent any flash of main app
  if (!mounted) {
    return <div className="intro-screen" style={{ background: "#080A0F" }} aria-hidden="true" />;
  }

  // Already entered during this session: render nothing
  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="GrillRoom entrance"
      className={`intro-screen ${isOpening ? "intro-opening" : ""} ${
        isFadingOut ? "intro-fading-out" : ""
      }`}
      onError={() => setHasError(true)}
    >
      {/* Edge Vignette */}
      <div className="intro-vignette" aria-hidden="true" />

      {/* Left Door Panel */}
      <div
        ref={leftDoorRef}
        className="intro-gate-panel intro-gate-left"
        onTransitionEnd={handleDoorTransitionEnd}
        aria-hidden="true"
      />

      {/* Right Door Panel */}
      <div className="intro-gate-panel intro-gate-right" aria-hidden="true" />

      {/* Center Split Hairline */}
      <div className="intro-split-line" aria-hidden="true" />

      {/* Center Radial Light Flare */}
      <div className="intro-center-light" aria-hidden="true" />

      {/* Centered Boardroom Content */}
      <div className="intro-content">
        {/* Brand Flame Logo */}
        <div className="intro-logo-wrap intro-animate-1">
          <Image
            src="/brand/logo-mark.png"
            alt="GrillRoom Flame"
            width={56}
            height={56}
            priority
            className="intro-logo-img"
            onError={(e) => {
              // Graceful inline fallback if asset has issues
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </div>

        {/* Tagline / Eyebrow */}
        <p className="intro-tagline intro-animate-2">
          Idea hai? Pehle GrillRoom mein survive karo.
        </p>

        {/* Main Headline */}
        <h1 className="intro-headline intro-animate-3">
          <span>Kya hua bhai, idea hai?</span>
          <span className="intro-headline-accent">Toh check karo na.</span>
        </h1>

        {/* Subtext */}
        <p className="intro-subtext intro-animate-4">
          Face the room before the room faces you.
        </p>

        {/* Action Button */}
        <div className="intro-animate-5 pt-2">
          <button
            ref={buttonRef}
            type="button"
            onClick={handleEnterClick}
            disabled={isOpening || isFadingOut}
            className="intro-enter-button"
            aria-label="Enter The GrillRoom"
          >
            <span>Enter The GrillRoom</span>
            <svg
              className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
