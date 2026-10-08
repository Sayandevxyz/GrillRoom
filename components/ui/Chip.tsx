import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export type ChipVariant =
  | "verified"
  | "strong"
  | "warning"
  | "danger"
  | "neutral"
  | "gold";

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  icon?: React.ReactNode;
  label?: string;
  size?: "sm" | "md";
}

/**
 * Accessible chip component that always pairs an icon with text.
 * Never communicates status through color alone.
 */
export const Chip: React.FC<ChipProps> = ({
  variant = "neutral",
  icon,
  label,
  children,
  size = "md",
  className = "",
  ...props
}) => {
  const variantStyles = {
    verified: "bg-green-50 text-success border-green-200",
    strong: "bg-blue-50 text-info border-blue-200",
    warning: "bg-amber-50 text-warning border-amber-200",
    danger: "bg-red-50 text-danger border-red-200",
    neutral: "bg-slate-100 text-text-2 border-border",
    gold: "bg-amber-50/60 text-gold-dark border-amber-200",
  };

  const defaultIcons = {
    verified: <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
    strong: <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
    warning: <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
    danger: <XCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
    neutral: <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
    gold: <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs gap-1 font-medium rounded-md",
    md: "px-2.5 py-1 text-xs gap-1.5 font-semibold rounded-md",
  };

  const activeIcon = icon ?? defaultIcons[variant];

  return (
    <span
      className={`inline-flex items-center border ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {activeIcon}
      <span>{label || children}</span>
    </span>
  );
};
