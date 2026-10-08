import React from "react";

export interface ShareCardProps {
  panelCount: number;
  inCount: number;
  verdictBadge: string;
  readinessScore: number;
  exchangeCount: number;
  verifiedClaimsCount: number;
}

export function renderShareCardMarkup(props: ShareCardProps) {
  const {
    panelCount,
    inCount,
    verdictBadge,
    readinessScore,
    exchangeCount,
    verifiedClaimsCount,
  } = props;

  return (
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
  );
}
