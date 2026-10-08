import React from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

export interface MeterProps {
  value: number; // 0-100
  previousValue?: number;
  label?: string;
  showBandLabel?: boolean;
  className?: string;
}

/**
 * Accessible conviction meter using role="meter" with tabular numerals
 * and explicit non-color-only trend indicators.
 */
export const Meter: React.FC<MeterProps> = ({
  value,
  previousValue,
  label = "Conviction",
  showBandLabel = true,
  className = "",
}) => {
  const clampedValue = Math.max(0, Math.min(100, Math.round(value)));
  const delta =
    previousValue !== undefined ? clampedValue - Math.round(previousValue) : 0;

  // Conviction bands: Below 40 "Leaning out", 40 to 64 "Undecided", 65+ "Leaning in"
  const getBandText = (val: number) => {
    if (val < 40) return "Leaning out";
    if (val < 65) return "Undecided";
    return "Leaning in";
  };

  const bandText = getBandText(clampedValue);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold font-sans tabular-nums text-navy">
          {clampedValue}%
        </span>
        {delta !== 0 ? (
          <span
            className={`inline-flex items-center text-xs font-bold gap-0.5 tabular-nums ${
              delta > 0 ? "text-success" : "text-danger"
            }`}
            title={`Recent change: ${delta > 0 ? `+${delta}` : delta}%`}
          >
            {delta > 0 ? (
              <ArrowUp className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />
            ) : (
              <ArrowDown className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />
            )}
            <span>{delta > 0 ? `+${delta}` : `${delta}`}</span>
          </span>
        ) : (
          <span className="inline-flex items-center text-xs text-text-2 gap-0.5" title="No change">
            <Minus className="w-3 h-3" aria-hidden="true" />
            <span>0</span>
          </span>
        )}
      </div>

      {/* Accessible progressbar / meter */}
      <div
        role="meter"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${clampedValue}%, ${bandText}`}
        className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-navy rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedValue}%` }}
        />
      </div>

      {showBandLabel && (
        <div className="flex justify-between items-center text-[11px] text-text-2">
          <span>{label}</span>
          <span className="font-medium text-slate-700">{bandText}</span>
        </div>
      )}
    </div>
  );
};
