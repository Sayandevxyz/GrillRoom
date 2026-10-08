import { query } from "./db";

/**
 * Sanitizes untrusted founder input:
 * 1. Clamps character lengths
 * 2. Neutralizes attempts to close `<founder_text>` tags prematurely
 * 3. Enforces delimiters
 */
export function sanitizeFounderText(input: string, maxLength: number = 4000): string {
  if (!input || typeof input !== "string") return "";
  const sliced = input.slice(0, maxLength);
  // Prevent escaping the custom XML-style delimiter
  return sliced.replace(/<\/founder_text>/gi, "&lt;/founder_text&gt;");
}

export function wrapFounderText(rawText: string, maxLength: number = 4000): string {
  const clean = sanitizeFounderText(rawText, maxLength);
  return `<founder_text>\n${clean}\n</founder_text>`;
}

/**
 * IP-based rate limiter using rate_limits table
 */
export async function checkRateLimit(
  ip: string,
  limitPerMin: number = 30
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
  const key = `ip:${ip}`;

  try {
    const existing = await query<{ count: number }>(
      `SELECT count FROM rate_limits WHERE key = $1 AND window_start = $2`,
      [key, windowStart]
    );

    let currentCount = 0;
    if (existing && existing.length > 0) {
      currentCount = Number(existing[0].count) || 0;
    }

    if (currentCount >= limitPerMin) {
      return { allowed: false, remaining: 0 };
    }

    const nextCount = currentCount + 1;
    await query(
      `INSERT INTO rate_limits (key, window_start, count)
       VALUES ($1, $2, $3)
       ON CONFLICT (key, window_start) DO UPDATE SET count = $3`,
      [key, windowStart, nextCount]
    );

    return { allowed: true, remaining: limitPerMin - nextCount };
  } catch (err) {
    // If rate limit table check fails, allow traffic to prevent blocking the user
    console.warn("[Rate Limit Check Warning]", err);
    return { allowed: true, remaining: limitPerMin };
  }
}
