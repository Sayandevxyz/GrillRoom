import crypto from "crypto";
import { query } from "./db";
import { logger } from "./logger";

/**
 * Sanitizes untrusted founder input:
 * 1. Clamps character lengths
 * 2. Neutralizes attempts to close `<founder_text>` tags prematurely
 * 3. Enforces delimiters
 */
export function sanitizeFounderText(input: string, maxLength: number = 4000): string {
  if (!input || typeof input !== "string") return "";
  const sliced = input.slice(0, maxLength).replace(/\0/g, "");
  // Prevent escaping the custom XML-style delimiter
  return sliced.replace(/<\/founder_text>/gi, "&lt;/founder_text&gt;");
}

export function wrapFounderText(rawText: string, maxLength: number = 4000): string {
  const clean = sanitizeFounderText(rawText, maxLength);
  return `<founder_text>\n${clean}\n</founder_text>`;
}

export function wrapFounderPrompt(rawText: string, maxLength: number = 4000): string {
  return wrapFounderText(rawText, maxLength);
}

/**
 * Defensive client IP derivation.
 */
export function getClientIp(headers: Headers | { get(name: string): string | null }): string {
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim().slice(0, 45);

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim().slice(0, 45);

  const vercelIp = headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim().slice(0, 45);

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim().slice(0, 45);

  return "127.0.0.1";
}

/**
 * IP-based rate limiter using atomic PostgreSQL upsert.
 */
export async function checkRateLimit(
  ip: string,
  limitPerMin: number = 30
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
  const safeIp = (ip || "127.0.0.1").trim().slice(0, 45);
  const key = `ip:${safeIp}`.slice(0, 64);

  try {
    const rows = await query<{ count: number }>(
      `INSERT INTO rate_limits (key, window_start, count)
       VALUES ($1, $2, 1)
       ON CONFLICT (key, window_start)
       DO UPDATE SET count = rate_limits.count + 1
       RETURNING count`,
      [key, windowStart]
    );

    const currentCount = rows && rows.length > 0 ? Number(rows[0].count) : 1;

    if (currentCount > limitPerMin) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: Math.max(0, limitPerMin - currentCount) };
  } catch (err) {
    // Fail-open defensively so unexpected DB hiccups never block founders
    logger.warn("Rate limit check query failed, failing open", "checkRateLimit", { err: String(err) });
    return { allowed: true, remaining: limitPerMin };
  }
}

/**
 * Generates a short random error reference ID and logs the full internal error
 * safely using structured logger.
 */
export function logServerError(err: unknown, context: string): string {
  const errorId = "err_" + crypto.randomUUID().slice(0, 8);
  logger.error(err instanceof Error ? err.message : String(err), context, err, { errorId });
  return errorId;
}
