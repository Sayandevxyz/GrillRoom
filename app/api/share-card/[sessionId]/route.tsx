import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query, isNeonConfigured, mockDb } from "@/lib/db";
import { FEATURE_SHARE_CARD } from "@/lib/features/flags";

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
    console.warn("[Share Card Data Load Error]", err);
  }

  const verdictBadge =
    inCount > 0
      ? `${inCount} / ${panelCount} In`
      : offerText
      ? offerText
      : "Audit Complete";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F6EFE1",
          padding: "60px 70px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative Top Accent Bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            backgroundColor: "#D4572B",
          }}
        />

        {/* Top Header Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {/* Logo Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "#D4572B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              🔥
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: "#14284F",
                letterSpacing: "-0.5px",
              }}
            >
              GrillRoom
            </div>
          </div>

          {/* Confidential Memo Tag */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#E8DECA",
              padding: "6px 14px",
              borderRadius: "6px",
              color: "#14284F",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            Verified Diligence Memo
          </div>
        </div>

        {/* Main Hero Card Body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            margin: "24px 0",
          }}
        >
          {/* Headline */}
          <div
            style={{
              fontSize: "52px",
              fontWeight: 800,
              color: "#14284F",
              lineHeight: 1.1,
              letterSpacing: "-1px",
            }}
          >
            I survived the GrillRoom.
          </div>

          <div
            style={{
              fontSize: "22px",
              color: "#4A5568",
              fontWeight: 500,
            }}
          >
            Subjected to rigorous due diligence by {panelCount} autonomous AI venture partners.
          </div>

          {/* Metrics Pill Grid */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: "24px",
              marginTop: "16px",
            }}
          >
            {/* Metric 1: Verdict */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#FFFFFF",
                borderRadius: "14px",
                padding: "24px",
                border: "1.5px solid #E2D7C3",
                boxShadow: "0 4px 12px rgba(20, 40, 79, 0.04)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#718096",
                  letterSpacing: "0.8px",
                }}
              >
                Panel Verdict
              </div>
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: 800,
                  color: inCount > 0 ? "#1B6E4A" : "#D4572B",
                  marginTop: "8px",
                }}
              >
                {verdictBadge}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#718096",
                  marginTop: "4px",
                }}
              >
                {inCount > 0 ? "Term sheet offered" : "Audit deliberation completed"}
              </div>
            </div>

            {/* Metric 2: Readiness Score */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#FFFFFF",
                borderRadius: "14px",
                padding: "24px",
                border: "1.5px solid #E2D7C3",
                boxShadow: "0 4px 12px rgba(20, 40, 79, 0.04)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#718096",
                  letterSpacing: "0.8px",
                }}
              >
                Readiness Score
              </div>
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: 800,
                  color: "#14284F",
                  marginTop: "8px",
                }}
              >
                {readinessScore}
                <span style={{ fontSize: "20px", color: "#A0AEC0", fontWeight: 600 }}>/100</span>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: readinessScore >= 70 ? "#1B6E4A" : "#C47D14",
                  marginTop: "4px",
                  fontWeight: 600,
                }}
              >
                {readinessScore >= 70
                  ? "Investor-ready"
                  : readinessScore >= 50
                  ? "Approaching ready"
                  : "Needs evidence"}
              </div>
            </div>

            {/* Metric 3: Diligence Rigor */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#FFFFFF",
                borderRadius: "14px",
                padding: "24px",
                border: "1.5px solid #E2D7C3",
                boxShadow: "0 4px 12px rgba(20, 40, 79, 0.04)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#718096",
                  letterSpacing: "0.8px",
                }}
              >
                Diligence Rigor
              </div>
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: 800,
                  color: "#14284F",
                  marginTop: "8px",
                }}
              >
                {exchangeCount}{" "}
                <span style={{ fontSize: "18px", color: "#718096", fontWeight: 600 }}>Rounds</span>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#718096",
                  marginTop: "4px",
                }}
              >
                {verifiedClaimsCount} claims substantiated
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1.5px solid #E2D7C3",
            paddingTop: "20px",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "#718096",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>Autonomous Pitch Simulator</span>
            <span>•</span>
            <span style={{ color: "#D4572B", fontWeight: 700 }}>Built for CSE Hackathon</span>
          </div>

          <div
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#14284F",
              letterSpacing: "0.5px",
            }}
          >
            grillroom.ai
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 627,
    }
  );
}
