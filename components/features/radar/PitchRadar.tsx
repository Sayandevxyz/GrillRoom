"use client";

import React, { useState, useEffect } from "react";
import { FEATURE_RADAR } from "@/lib/features/flags";
import { RadarScores } from "@/lib/features/radar/getSessionRadar";
import { logger } from "@/lib/logger";

export interface PitchRadarProps {
  current?: RadarScores;
  previous?: RadarScores;
  sessionId?: string;
  className?: string;
}

const AXES: Array<{ key: keyof RadarScores; label: string }> = [
  { key: "directness", label: "Directness" },
  { key: "specificity", label: "Specificity" },
  { key: "evidence", label: "Evidence" },
  { key: "logic", label: "Logic" },
  { key: "honesty", label: "Honesty" },
];

/**
 * 5-Axis Pitch DNA Radar Chart in plain SVG.
 * Gated behind FEATURE_RADAR.
 * Renders current attempt in filled flame orange.
 * If previous attempt exists, overlays as a navy outline with delta breakdown.
 */
export const PitchRadar: React.FC<PitchRadarProps> = ({
  current: propCurrent,
  previous: propPrevious,
  sessionId,
  className = "",
}) => {
  const [current, setCurrent] = useState<RadarScores | undefined>(propCurrent);
  const [previous, setPrevious] = useState<RadarScores | undefined>(propPrevious);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!FEATURE_RADAR) return;

    if (propCurrent) {
      setCurrent(propCurrent);
      setPrevious(propPrevious);
      return;
    }

    if (sessionId) {
      setLoading(true);
      fetch(`/api/session/radar?sessionId=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.radar?.current) {
            setCurrent(data.radar.current);
            setPrevious(data.radar.previous);
          }
        })
        .catch((err) => logger.warn("Failed to load radar data", "PitchRadar", { err: String(err) }))
        .finally(() => setLoading(false));
    }
  }, [sessionId, propCurrent, propPrevious]);

  // If feature flag is OFF or still loading or no scores, render nothing
  if (!FEATURE_RADAR || loading || !current) {
    return null;
  }

  // Geometry
  const size = 300;
  const center = size / 2;
  const maxRadius = 95;
  const levels = [2, 4, 6, 8, 10];
  const numAxes = AXES.length;
  const angleStep = (Math.PI * 2) / numAxes;
  const startAngle = -Math.PI / 2; // Point top

  // Helper to convert polar to cartesian
  const getCoordinates = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (Math.min(Math.max(value, 0), 10) / 10) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Generate polygon points for a set of scores
  const getPolygonPoints = (scores: RadarScores) => {
    return AXES.map((axis, i) => {
      const val = scores[axis.key] ?? 5;
      const { x, y } = getCoordinates(i, val);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  };

  const currentPoints = getPolygonPoints(current);
  const previousPoints = previous ? getPolygonPoints(previous) : null;

  return (
    <div className={`p-4 bg-white rounded-field border border-border shadow-subtle ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold-dark block">
            Diligence Analytics
          </span>
          <h3 className="text-sm font-serif font-bold text-navy">Pitch DNA Radar</h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cta" />
            <span className="font-semibold text-navy">
              {previous ? "Retry" : "Current"}
            </span>
          </div>
          {previous && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-navy bg-transparent" />
              <span className="text-text-2">Initial</span>
            </div>
          )}
        </div>
      </div>

      {/* Plain SVG Radar */}
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full max-w-[280px] h-auto select-none"
          aria-label="5-axis Pitch DNA radar chart: Directness, Specificity, Evidence, Logic, and Honesty"
          role="img"
        >
          {/* Concentric grid pentagons */}
          {levels.map((lvl) => {
            const pts = AXES.map((_, i) => {
              const { x, y } = getCoordinates(i, lvl);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(" ");
            return (
              <polygon
                key={lvl}
                points={pts}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth={lvl === 10 ? "1.5" : "0.75"}
              />
            );
          })}

          {/* Radial Spokes */}
          {AXES.map((_, i) => {
            const { x, y } = getCoordinates(i, 10);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
            );
          })}

          {/* Previous Attempt (Navy Outline) */}
          {previousPoints && (
            <polygon
              points={previousPoints}
              fill="rgba(20, 40, 79, 0.08)"
              stroke="#14284F"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          )}

          {/* Current Attempt (Flame Orange Fill) */}
          <polygon
            points={currentPoints}
            fill="rgba(212, 87, 43, 0.24)"
            stroke="#D4572B"
            strokeWidth="2.5"
          />

          {/* Current Points Dots */}
          {AXES.map((axis, i) => {
            const val = current[axis.key] ?? 5;
            const { x, y } = getCoordinates(i, val);
            return (
              <circle
                key={axis.key}
                cx={x}
                cy={y}
                r="3.5"
                fill="#D4572B"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Axis Labels & Values */}
          {AXES.map((axis, i) => {
            const { x, y } = getCoordinates(i, 11.8);
            const score = current[axis.key];
            const isTop = i === 0;
            const isBottom = i === 2 || i === 3;

            return (
              <g key={axis.key} transform={`translate(${x}, ${y})`}>
                <text
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-slate-800"
                  dy={isTop ? "-4" : isBottom ? "10" : "0"}
                >
                  {axis.label}
                </text>
                <text
                  textAnchor="middle"
                  className="text-[9px] font-sans font-semibold fill-cta"
                  dy={isTop ? "7" : isBottom ? "20" : "11"}
                >
                  {score.toFixed(1)}/10
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Axis Delta Breakdown (if retry exists) */}
      {previous && (
        <div className="mt-2 pt-2 border-t border-border grid grid-cols-5 gap-1 text-center">
          {AXES.map((axis) => {
            const currVal = current[axis.key];
            const prevVal = previous[axis.key];
            const diff = Math.round((currVal - prevVal) * 10) / 10;
            return (
              <div key={axis.key} className="space-y-0.5">
                <span className="text-[9px] text-text-2 truncate block capitalize">
                  {axis.label.slice(0, 4)}
                </span>
                <span
                  className={`text-[10px] font-bold tabular-nums block ${
                    diff > 0
                      ? "text-success"
                      : diff < 0
                      ? "text-danger"
                      : "text-text-2"
                  }`}
                >
                  {diff > 0 ? `+${diff}` : diff}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
