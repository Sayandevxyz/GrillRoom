import React from "react";

export interface FieldProps {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
  characterCount?: {
    current: number;
    max: number;
    min?: number;
  };
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

/**
 * Accessible form field wrapper providing visible label, helper text, and character counts.
 */
export const Field: React.FC<FieldProps> = ({
  id,
  label,
  helperText,
  error,
  characterCount,
  children,
  className = "",
  required = false,
}) => {
  const isOverLimit = characterCount && characterCount.current > characterCount.max;
  const isUnderMin =
    characterCount &&
    characterCount.min &&
    characterCount.current > 0 &&
    characterCount.current < characterCount.min;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-text-2">
          {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
        </label>
        {characterCount && (
          <span
            className={`text-xs tabular-nums font-medium ${
              isOverLimit
                ? "text-danger font-bold"
                : isUnderMin
                ? "text-warning"
                : "text-text-2"
            }`}
          >
            {characterCount.current} / {characterCount.max.toLocaleString()}
            {characterCount.min ? ` (minimum ${characterCount.min})` : ""}
          </span>
        )}
      </div>

      <div>{children}</div>

      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger font-medium">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-xs text-text-2">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
