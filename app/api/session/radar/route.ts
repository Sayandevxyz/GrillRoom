import { NextRequest, NextResponse } from "next/server";
import { getSessionRadar } from "@/lib/features/radar/getSessionRadar";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 });
    }

    const radar = await getSessionRadar(sessionId);
    return NextResponse.json({ radar });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load radar scores";
    console.warn("[Radar Route Error]", message);
    return NextResponse.json({ radar: null, error: message }, { status: 500 });
  }
}
