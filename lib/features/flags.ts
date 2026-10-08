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
