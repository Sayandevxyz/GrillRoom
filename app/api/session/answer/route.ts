import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, executeInterrogationTurn } from "@/lib/engine/session";
import { getSessionClaims } from "@/lib/engine/ledger";
import { checkRateLimit } from "@/lib/security";

const AnswerSchema = z.object({
  sessionId: z.string().uuid(),
  answer: z.string().min(1).max(4000),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rateCheck = await checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = AnswerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { sessionId, answer } = parsed.data;

    // Verify session & owner_token cookie
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const ownerCookie = req.cookies.get("owner_token")?.value;
    if (!ownerCookie || ownerCookie !== session.owner_token) {
      return NextResponse.json({ error: "Forbidden: invalid owner credentials" }, { status: 403 });
    }

    const encoder = new TextEncoder();

    // Create ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Execute interrogation turn
          const turnResult = await executeInterrogationTurn(session, answer);

          // 1. Emit metadata event
          sendEvent("meta", turnResult.meta as unknown as Record<string, unknown>);

          let fullInvestorSpeech = "";

          // 2. Stream tokens from LLM
          if (turnResult.investorSpeechStream) {
            for await (const chunk of turnResult.investorSpeechStream) {
              const token = chunk.choices[0]?.delta?.content || "";
              if (token) {
                fullInvestorSpeech += token;
                sendEvent("token", { token });
              }
            }
          } else if (turnResult.directSpeech) {
            fullInvestorSpeech = turnResult.directSpeech;
            // Send in small token chunks for simulated streaming effect
            const words = fullInvestorSpeech.split(" ");
            for (let i = 0; i < words.length; i++) {
              const piece = (i === 0 ? "" : " ") + words[i];
              sendEvent("token", { token: piece });
            }
          }

          // 3. Save investor turn in database
          await turnResult.saveInvestorTurn(fullInvestorSpeech);

          // 4. Retrieve refreshed claims
          const updatedClaims = await getSessionClaims(sessionId);

          // 5. Emit state event
          sendEvent("state", {
            ...turnResult.state,
            claims: updatedClaims as unknown as Record<string, unknown>[],
          } as unknown as Record<string, unknown>);

          // 6. Emit done event
          sendEvent("done", { ok: true });
          controller.close();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Error processing turn";
          console.error("[SSE Stream Processing Error]", err);
          sendEvent("error", { message });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process answer";
    console.error("[Answer Route Error]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
