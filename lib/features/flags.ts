/**
 * Feature Flags
 * 
 * NEXT_PUBLIC_FEATURE_INTRO_GATE: Controls whether the animated investor
 * boardroom gate screen is displayed before the main app.
 * Default: OFF (false)
 */
export const FEATURE_INTRO_GATE =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_FEATURE_INTRO_GATE === "true";

export const FEATURE_REACTIONS =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_FEATURE_REACTIONS === "true";

export const FEATURE_RADAR =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_FEATURE_RADAR === "true";

export const FEATURE_SHARE_CARD =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_FEATURE_SHARE_CARD === "true";

