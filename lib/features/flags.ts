/**
 * Feature Flags
 * 
 * NEXT_PUBLIC_FEATURE_INTRO_GATE: Controls whether the animated investor
 * boardroom gate screen is displayed before the main app.
 * Default: OFF (false)
 */
export function isFlagEnabled(envVar: string | undefined, defaultValue: boolean = true): boolean {
  if (envVar === undefined || envVar === "") return defaultValue;
  return envVar !== "false" && envVar !== "0" && envVar !== "off";
}

export const FEATURE_INTRO_GATE =
  typeof process !== "undefined"
    ? isFlagEnabled(process.env.NEXT_PUBLIC_FEATURE_INTRO_GATE, true)
    : true;

export const FEATURE_REACTIONS =
  typeof process !== "undefined"
    ? isFlagEnabled(process.env.NEXT_PUBLIC_FEATURE_REACTIONS, true)
    : true;

export const FEATURE_RADAR =
  typeof process !== "undefined"
    ? isFlagEnabled(process.env.NEXT_PUBLIC_FEATURE_RADAR, true)
    : true;

export const FEATURE_SHARE_CARD =
  typeof process !== "undefined"
    ? isFlagEnabled(process.env.NEXT_PUBLIC_FEATURE_SHARE_CARD, true)
    : true;

export const FEATURE_BEHIND_DOORS =
  typeof process !== "undefined"
    ? isFlagEnabled(process.env.NEXT_PUBLIC_FEATURE_BEHIND_DOORS, true)
    : true;


