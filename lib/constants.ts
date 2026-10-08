/**
 * GrillRoom Central Application Constants
 *
 * Consolidates all engine thresholds, exchange limits, conviction bounds,
 * and input validation constraints in one single source of truth.
 */

// Exchange & Session Progression Limits
export const DEFAULT_MAX_EXCHANGES = 14;
export const MAX_EXCHANGES = DEFAULT_MAX_EXCHANGES;
export const MIN_EXCHANGES_FOR_DEBRIEF = 3;

/** Exchange limits mapped to review intensity modes. */
export const EXCHANGES_BY_INTENSITY: Record<string, number> = {
  friendly: 5,
  tough: 7,
  shark: 12,
};

/**
 * Returns the maximum allowed exchanges for a given session intensity mode.
 * Defaults to DEFAULT_MAX_EXCHANGES (14) if unspecified or unrecognized.
 */
export function getMaxExchanges(intensity?: string | null): number {
  if (intensity && intensity in EXCHANGES_BY_INTENSITY) {
    return EXCHANGES_BY_INTENSITY[intensity];
  }
  return DEFAULT_MAX_EXCHANGES;
}

// Conviction Meter Bounds & Caps
export const INITIAL_CONVICTION = 50;
export const MIN_CONVICTION = 0;
export const MAX_CONVICTION = 100;
export const MAX_TURN_DELTA_CAP = 12;

// Investment Verdict Thresholds
export const VERDICT_CONVICTION_THRESHOLD_IN = 65;
export const VERDICT_CONVICTION_THRESHOLD_CONDITIONAL = 40;

// Input Constraints & Limits
export const MIN_IDEA_CHARS = 50;
export const MAX_IDEA_CHARS = 6000;
export const MIN_ANSWER_CHARS = 1;
export const MAX_ANSWER_CHARS = 4000;
export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PDF_TEXT_CHARS = 15000;

// Rate Limiting
export const RATE_LIMIT_REQUESTS_PER_MINUTE = 30;

/** Investor profile directory used across board sessions and debrief views. */
export const INVESTOR_PROFILES: Record<
  string,
  { name: string; title: string; initials: string }
> = {
  rohan: {
    name: "Rohan Mehta",
    title: "Unit Economics Partner",
    initials: "RM",
  },
  meera: {
    name: "Meera Shah",
    title: "Market and GTM Investor",
    initials: "MS",
  },
  arjun: {
    name: "Dr. Arjun Rao",
    title: "Product and Technical Moat",
    initials: "AR",
  },
  kavya: {
    name: "Kavya Sen",
    title: "Customer Proof Analyst",
    initials: "KS",
  },
  sam: {
    name: "Sam Kapoor",
    title: "Founder and Deal Terms Partner",
    initials: "SK",
  },
};

/** Formatted display titles for session intensity modes. */
export const INTENSITY_NAMES: Record<string, string> = {
  friendly: "Angel Review",
  tough: "Partner Meeting",
  shark: "Shark Tank Mode",
};
