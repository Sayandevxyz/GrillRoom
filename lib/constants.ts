/**
 * GrillRoom Central Application Constants
 *
 * Consolidates all engine thresholds, exchange limits, conviction bounds,
 * and input validation constraints in one single source of truth.
 */

// Exchange & Session Progression Limits
export const MAX_EXCHANGES = 14;
export const MIN_EXCHANGES_FOR_DEBRIEF = 3;

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
