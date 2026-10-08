import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query, isNeonConfigured, mockDb } from "@/lib/db";
import { FEATURE_SHARE_CARD } from "@/lib/features/flags";
import { logger } from "@/lib/logger";
import { renderShareCardMarkup } from "@/lib/features/share-card/shareCardTemplate";

export const runtime = "edge";

const ShareCardParamsSchema = z.object({
  sessionId: z.string().uuid("Invalid sessionId parameter (must be a valid UUID)"),
});

interface RouteProps {
  params: Promise<{
    sessionId: string;
  }>;
}

interface VerdictItem {
  investor_id: string;
  decision: "In" | "Conditional" | "Out";
  reason: string;
  simulated_offer?: string;
}

interface ReportContent {
  readiness_score: number;
  verdicts: VerdictItem[];
}

export async function GET(req: NextRequest, props: RouteProps) {
  if (!FEATURE_SHARE_CARD) {
    return new NextResponse("Share card feature disabled", { status: 404 });
  }

  const rawParams = await props.params;
  const parsed = ShareCardParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return new NextResponse("Invalid sessionId parameter", { status: 400 });
  }

  const { sessionId } = parsed.data;

  let readinessScore = 65;
  let inCount = 0;
  let panelCount = 5;
  let offerText = "";
  let verifiedClaimsCount = 0;
  let exchangeCount = 4;

  try {
    if (isNeonConfigured()) {
      // 1. Fetch report
      const reportRows = await query<{ content_json: ReportContent }>(
        `SELECT content_json FROM reports WHERE session_id = $1 LIMIT 1`,
        [sessionId]
      );

      if (reportRows.length > 0 && reportRows[0].content_json) {
        const rep = reportRows[0].content_json;
        if (typeof rep.readiness_score === "number") {
          readinessScore = rep.readiness_score;
        }
        if (Array.isArray(rep.verdicts)) {
          panelCount = rep.verdicts.length || 5;
          inCount = rep.verdicts.filter((v) => v.decision === "In").length;
          const offerVerdict = rep.verdicts.find(
            (v) => v.simulated_offer && v.simulated_offer.toLowerCase() !== "none"
          );
          if (offerVerdict?.simulated_offer) {
            offerText = offerVerdict.simulated_offer;
          }
        }
      }

      // 2. Fetch verified claims count
      const claimRows = await query<{ status: string }>(
        `SELECT status FROM claims WHERE session_id = $1`,
        [sessionId]
      );
      verifiedClaimsCount = claimRows.filter(
        (c) => c.status === "verified" || c.status === "evidenced"
      ).length;

      // 3. Fetch founder exchange count
      const turnRows = await query<{ role: string }>(
        `SELECT role FROM turns WHERE session_id = $1 AND role = 'founder'`,
        [sessionId]
      );
      if (turnRows.length > 0) {
        exchangeCount = turnRows.length;
      }
    } else {
      // Mock DB fallback
      const rep = mockDb.reports.get(sessionId) as ReportContent | undefined;
      if (rep) {
        if (typeof rep.readiness_score === "number") {
          readinessScore = rep.readiness_score;
        }
        if (Array.isArray(rep.verdicts)) {
          panelCount = rep.verdicts.length || 5;
          inCount = rep.verdicts.filter((v) => v.decision === "In").length;
          const offerVerdict = rep.verdicts.find(
            (v) => v.simulated_offer && v.simulated_offer.toLowerCase() !== "none"
          );
          if (offerVerdict?.simulated_offer) {
            offerText = offerVerdict.simulated_offer;
          }
        }
      }

      const claims = (mockDb.claims || []).filter((c) => c.session_id === sessionId);
      verifiedClaimsCount = claims.filter(
        (c: Record<string, unknown>) => c.status === "verified" || c.status === "evidenced"
      ).length;

      const turns = (mockDb.turns || []).filter(
        (t: Record<string, unknown>) => t.session_id === sessionId && t.role === "founder"
      );
      if (turns.length > 0) {
        exchangeCount = turns.length;
      }
    }
  } catch (err) {
    logger.warn("Failed to load share card session data", "ShareCardRoute", { err: String(err) });
  }

  const verdictBadge =
    inCount > 0
      ? `${inCount} / ${panelCount} In`
      : offerText
      ? offerText
      : "Audit Complete";

  return new ImageResponse(
    renderShareCardMarkup({
      panelCount,
      inCount,
      verdictBadge,
      readinessScore,
      exchangeCount,
      verifiedClaimsCount,
    }),
    {
      width: 1200,
      height: 627,
    }
  );
}

