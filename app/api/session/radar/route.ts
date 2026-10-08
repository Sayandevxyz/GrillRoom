import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionRadar } from "@/lib/features/radar/getSessionRadar";
import { logServerError } from "@/lib/security";

const RadarQuerySchema = z.object({
  sessionId: z.string().uuid("Invalid sessionId parameter (must be a valid UUID)"),
});

export async function GET(req: NextRequest) {
  try {
    const rawSessionId = req.nextUrl.searchParams.get("sessionId");
    const parsed = RadarQuerySchema.safeParse({ sessionId: rawSessionId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid sessionId parameter" },
        { status: 400 }
      );
    }

    const radar = await getSessionRadar(parsed.data.sessionId);
    return NextResponse.json({ radar });
  } catch (err: unknown) {
    const errorId = logServerError(err, "Radar Route Error");
    return NextResponse.json({ radar: null, error: "Failed to load pitch radar metrics.", errorId }, { status: 500 });
  }
}
