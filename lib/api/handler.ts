import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, logServerError } from "@/lib/security";
import { ZodSchema } from "zod";

/**
 * Extracts client IP address with defensive header fallbacks.
 */
export function getRequestIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}

/**
 * Validates request rate limit against IP address.
 */
export async function enforceRateLimit(
  req: NextRequest,
  limitPerMin: number = 30
): Promise<NextResponse | null> {
  const ip = getRequestIp(req);
  const check = await checkRateLimit(ip, limitPerMin);
  if (!check.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  return null;
}

/**
 * Parses and validates request JSON body against a Zod schema.
 */
export async function parseAndValidateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data?: T; errorResponse?: NextResponse }> {
  try {
    const raw = await req.json();
    const result = schema.safeParse(raw);
    if (!result.success) {
      return {
        errorResponse: NextResponse.json(
          { error: "Validation failed", details: result.error.issues },
          { status: 400 }
        ),
      };
    }
    return { data: result.data };
  } catch {
    return {
      errorResponse: NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 }),
    };
  }
}

/**
 * Sanitizes and logs internal exceptions, returning safe error response with reference ID.
 */
export function handleApiError(err: unknown, context: string): NextResponse {
  const errorId = logServerError(err, context);
  return NextResponse.json(
    { error: "Internal server error. Please try again.", errorId },
    { status: 500 }
  );
}
