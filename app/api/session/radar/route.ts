import { NextRequest, NextResponse } from "next/server";
import { getSessionRadar } from "@/lib/features/radar/getSessionRadar";
import { logServerError } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 });
    }

    const radar = await getSessionRadar(sessionId);
    return NextResponse.json({ radar });
  } catch (err: unknown) {
    const errorId = logServerError(err, "Radar Route Error");
    return NextResponse.json({ radar: null, error: "Failed to load pitch radar metrics.", errorId }, { status: 500 });
  }
}
